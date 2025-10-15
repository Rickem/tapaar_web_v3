"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { add, format, parse, sub } from "date-fns";
import {
  useUser,
  useFirestore,
  setDocumentNonBlocking,
  useMemoFirebase,
  useDoc,
} from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type { AppTransaction, Coupon, UserProfile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { VerifyingPayment } from "./verifying-payment";
import { log } from "console";
import { debounce } from "lodash";
import { fr } from "date-fns/locale";

const formSchema = z.object({
  operator: z.string({ required_error: "Veuillez sélectionner un opérateur." }),
  phoneNumber: z.string().min(8, { message: "Numéro de téléphone invalide." }),
  confirmationMessage: z
    .string()
    .min(10, { message: "Le message de confirmation est trop court." }),
});

const operatorData = {
  mtn: {
    name: "MTN Mobile Money",
    ussd: "*880*41*151855*AMOUNT#",
    number: "01xxxxxxxx",
  },
  moov: {
    name: "Moov Money",
    ussd: "*855*4*1*21009*AMOUNT#",
    number: "01xxxxxxxx",
  },
  celtiis: {
    name: "Celtiis Cash",
    ussd: "*800*4*1*2*070719*AMOUNT#",
    number: "01xxxxxxxx",
  },
};

interface PaymentFormProps {
  amount: number;
}

interface ParsedInfo {
  smsTransactionId: string;
  extractedAmount: number | null;
  transactionDate: Date | null;
  isAmountMismatch: boolean;
}

export default function PaymentForm({ amount }: PaymentFormProps) {
  const [selectedOperator, setSelectedOperator] = useState<
    keyof typeof operatorData | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<ParsedInfo | null>(null);
  const [parsingError, setParsingError] = useState("");

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: "",
      confirmationMessage: "",
    },
  });

  const confirmationMessageValue = form.watch("confirmationMessage");

  const parseMessage = useCallback(
    (message: string, operator: string | null) => {
      if (!message || message.length < 5) {
        setParsedInfo(null);
        setParsingError("");
        return;
      }

      let smsTransactionId = "";
      let extractedAmount: number | null = null;
      let transactionDate: Date | null = new Date();
      let isAmountMismatch = false;

      const mtnRegex =
        /Paiement (\d+)F a TAPAAR LVC \(.*?\) ([\d-]+ [\d:]+) Frais:(\d+)F Solde:(\d+)F ID:(\d+)/;
      const moovRegex =
        /Vous avez payé (\d+) FCFA.*? le (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}).*? Réf : (\d+)\./;

      let match: RegExpMatchArray | null = null;

      if (operator === "mtn") {
        match = message.match(mtnRegex);
        if (match) {
          extractedAmount = parseInt(match[1], 10);
          const transactionDateStr = match[2];
          smsTransactionId = match[5];
          isAmountMismatch = extractedAmount !== amount;
          try {
            transactionDate = parse(
              transactionDateStr,
              "yyyy-MM-dd HH:mm:ss",
              new Date()
            );
          } catch (e) {
            transactionDate = new Date();
          }
        }
      } else if (operator === "moov") {
        match = message.match(moovRegex);
        if (match) {
          extractedAmount = parseInt(match[1], 10);
          const transactionDateStr = match[2];
          smsTransactionId = match[3];
          isAmountMismatch = extractedAmount !== amount;
          try {
            transactionDate = parse(
              transactionDateStr,
              "dd/MM/yyyy HH:mm:ss",
              new Date()
            );
          } catch (e) {
            transactionDate = new Date();
          }
        }
      }

      if (match) {
        setParsedInfo({
          smsTransactionId,
          extractedAmount,
          transactionDate,
          isAmountMismatch,
        });
        setParsingError(
          isAmountMismatch
            ? `Le montant du SMS (${extractedAmount}F) ne correspond pas au montant du coupon (${amount}F).`
            : ""
        );
      } else if (/^\d+$/.test(message.trim())) {
        // Fallback for just ID
        smsTransactionId = message.trim();
        setParsedInfo({
          smsTransactionId,
          extractedAmount: null,
          transactionDate: new Date(),
          isAmountMismatch: false,
        });
        setParsingError("");
      } else {
        if (operator) {
          setParsingError(
            `Format SMS ${operator.toUpperCase()} non reconnu. Copiez le message entier ou juste l'ID de transaction.`
          );
        } else {
          setParsingError("");
        }
        setParsedInfo(null);
      }
    },
    [amount]
  );

  const debouncedParseMessage = useCallback(debounce(parseMessage, 300), [
    parseMessage,
  ]);

  useEffect(() => {
    debouncedParseMessage(confirmationMessageValue, selectedOperator);
  }, [confirmationMessageValue, selectedOperator, debouncedParseMessage]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Le code a été copié dans le presse-papiers.",
    });
  };

  const ussdCode = selectedOperator
    ? operatorData[selectedOperator].ussd.replace("AMOUNT", amount.toString())
    : "";

  const verifyPayment = async (tx: AppTransaction): Promise<boolean> => {
    if (!user) return false;
    try {
      const txTimestamp = new Date(); // Use current time for window
      const startTime = sub(txTimestamp, { minutes: 15 });
      const endTime = add(txTimestamp, { minutes: 15 });

      const smsQuery = query(
        collection(firestore, "sms"),
        where("processed", "==", false),
        where("operator", "==", tx.method),
        where("parsedAmount", "==", tx.amount),
        where("parsedPhoneNormalized", "==", tx.senderPhone),
        where("parsedRef", "==", tx.opRef),
        // where("createdAt", ">=", startTime),
        // where("createdAt", "<=", endTime),
        limit(1)
      );
      const smsSnapshot = await getDocs(smsQuery);

      if (smsSnapshot.empty) {
        return false; // No match found
      }

      const smsDoc = smsSnapshot.docs[0];

      await runTransaction(firestore, async (transaction) => {
        const userTransactionRef = doc(
          firestore,
          "users",
          user.uid,
          "transactions",
          tx.id
        );
        const couponRef = doc(firestore, "users", user.uid, "coupons", tx.id);
        const walletRef = doc(
          firestore,
          "users",
          user.uid,
          "wallets",
          "-topup-"
        );
        const smsRef = smsDoc.ref;

        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Portefeuille introuvable.");
        const newBalance = (walletDoc.data()?.balance || 0) + tx.amount;

        const confirmationDate = new Date();
        const expiresAt = add(confirmationDate, { days: 60 });

        transaction.update(userTransactionRef, { status: "confirmed" });
        transaction.update(couponRef, {
          status: "active",
          expiresAt: Timestamp.fromDate(expiresAt),
        });
        transaction.update(walletRef, {
          balance: newBalance,
          updatedAt: serverTimestamp(),
        });
        transaction.update(smsRef, { processed: true });
      });

      return true; // Match found and processed
    } catch (error) {
      console.error("Error during auto-verification:", error);
      return false;
    }
  };

  const startVerificationProcess = async (tx: AppTransaction) => {
    setIsVerifying(true);

    // First attempt
    let isVerified = await verifyPayment(tx);

    if (isVerified) {
      toast({
        title: "Paiement validé !",
        description: `${tx.amount} TP ont été ajoutés à votre solde.`,
      });
      router.push("/dashboard");
      return;
    }

    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, 30000));
    isVerified = await verifyPayment(tx);

    if (isVerified) {
      toast({
        title: "Paiement validé !",
        description: `${tx.amount} TP ont été ajoutés à votre solde.`,
      });
      router.push("/dashboard");
    } else {
      toast({
        title: "Paiement en attente",
        description:
          "Votre paiement est en cours de vérification. Votre solde sera mis à jour sous peu.",
        variant: "default",
      });
      router.push("/transactions");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer un paiement.",
      });
      return;
    }

    if (!parsedInfo || !parsedInfo.smsTransactionId) {
      toast({
        variant: "destructive",
        title: "ID de transaction manquant",
        description:
          "Impossible d'extraire un ID de transaction du message. Veuillez vérifier le message collé.",
      });
      return;
    }

    if (parsedInfo.isAmountMismatch) {
      toast({
        variant: "destructive",
        title: "Erreur de montant",
        description: parsingError,
      });
      return;
    }

    setIsLoading(true);

    const { operator, phoneNumber } = values;

    const docId = `coupon_${Date.now()}_${user.uid.substring(0, 5)}`;
    const couponRef = doc(firestore, "users", user.uid, "coupons", docId);
    const transactionRef = doc(
      firestore,
      "users",
      user.uid,
      "transactions",
      docId
    );

    const newCoupon: Omit<Coupon, "createdAt" | "expiresAt"> = {
      id: docId,
      userId: user.uid,
      amount: amount,
      status: "pending",
    };

    const newTransaction: Omit<AppTransaction, "createdAt"> = {
      id: docId,
      date: (parsedInfo.transactionDate || new Date()).toISOString(),
      opRef: parsedInfo.smsTransactionId,
      label: `Achat coupon ${amount} TP`,
      category: "Coupon",
      group: "tapaarpay_topup",
      type: "in",
      senderID: phoneNumber,
      sender: userProfile?.username || user.uid,
      senderPhone: phoneNumber,
      amount: amount,
      displayAmount: amount,
      fees: 0,
      receiverID: user.uid,
      receiver: userProfile?.username || user.uid,
      receiverPhone: phoneNumber,
      method: operator,
      methodRef: confirmationMessageValue,
      status: "pending",
    };

    try {
      const batch = writeBatch(firestore);
      batch.set(couponRef, {
        ...newCoupon,
        createdAt: serverTimestamp(),
        expiresAt: null,
      });
      batch.set(transactionRef, {
        ...newTransaction,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setIsLoading(false);
      // We pass the new transaction object with a client-side timestamp for the verification window.
      startVerificationProcess({
        ...newTransaction,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de soumettre la transaction.",
      });
      setIsLoading(false);
    }
  }

  if (isVerifying) {
    return <VerifyingPayment />;
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-xl p-4 text-sm space-y-2">
          <h3 className="font-bold">Instructions de paiement :</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              <strong>Sélectionnez l'opérateur :</strong> Ceci affichera un code
              USSD.
            </li>
            <li>
              <strong>Effectuez le paiement :</strong> Composez le code USSD
              pour payer{" "}
              <strong className="font-bold">
                {amount.toLocaleString("fr-FR")} FCFA
              </strong>{" "}
              sur le numéro{" "}
              <strong className="font-bold">
                {selectedOperator && operatorData[selectedOperator].number}
              </strong>
              .
            </li>
            <li>
              <strong>Confirmez :</strong> Copiez le SMS de confirmation ou l'ID
              de transaction et collez-le dans le champ ci-dessous, puis
              validez.
            </li>
          </ol>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1. Sélectionnez votre opérateur</FormLabel>
                  <Select
                    onValueChange={(value: any) => {
                      field.onChange(value);
                      setSelectedOperator(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisissez un réseau GSM" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mtn">
                        {operatorData.mtn.name}
                      </SelectItem>
                      <SelectItem value="moov">
                        {operatorData.moov.name}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedOperator && (
              <FormItem>
                <FormLabel>Code USSD à composer</FormLabel>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={ussdCode}
                    className="bg-muted text-muted-foreground font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(ussdCode)}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2. Votre numéro de téléphone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Le numéro qui a servi au paiement"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmationMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    3. Message de confirmation ou ID de transaction
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Collez ici le SMS de confirmation ou l'ID de la transaction"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {parsingError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{parsingError}</p>
              </div>
            )}

            {parsedInfo && !parsingError && (
              <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Informations détectées :</p>
                  <p>
                    ID Transaction :{" "}
                    <span className="font-mono">
                      {parsedInfo.smsTransactionId}
                    </span>
                  </p>
                  {parsedInfo.extractedAmount && (
                    <p>
                      Montant :{" "}
                      <span className="font-mono">
                        {parsedInfo.extractedAmount.toLocaleString("fr-FR")}{" "}
                        FCFA
                      </span>
                    </p>
                  )}
                  {parsedInfo.transactionDate && (
                    <p>
                      Date :{" "}
                      <span className="font-mono">
                        {format(
                          parsedInfo.transactionDate,
                          "dd/MM/yyyy HH:mm",
                          { locale: fr }
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl p-4 text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold">Attention !</h4>
                <p>
                  Assurez-vous d'avoir effectué le paiement avant de confirmer.
                  L'ID de transaction est crucial pour la vérification. Les ID
                  incorrects ne seront pas traités.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading || !parsedInfo || parsedInfo.isAmountMismatch}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le paiement
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
