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
import { useState } from "react";
import { Copy, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parse } from "date-fns";
import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import type { AppTransaction, Coupon } from "@/lib/types";
import { useRouter } from "next/navigation";

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

export default function PaymentForm({ amount }: PaymentFormProps) {
  const [selectedOperator, setSelectedOperator] = useState<
    keyof typeof operatorData | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: "",
      confirmationMessage: "",
    },
  });

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer un paiement.",
      });
      return;
    }

    setIsLoading(true);

    const { confirmationMessage, operator, phoneNumber } = values;

    let smsTransactionId = "";
    let extractedAmount = amount;
    let transactionDate: Date | string = new Date();

    const mtnRegex =
      /Paiement (\d+)F a TAPAAR LVC \(.*?\) ([\d-]+ [\d:]+) Frais:(\d+)F Solde:(\d+)F ID:(\d+)/;
    const mtnMatch = confirmationMessage.match(mtnRegex);

    if (operator === "mtn" && mtnMatch) {
      extractedAmount = parseInt(mtnMatch[1], 10);
      const transactionDateStr = mtnMatch[2];
      smsTransactionId = mtnMatch[5]; // Use index 5 for the ID

      if (extractedAmount !== amount) {
        toast({
          variant: "destructive",
          title: "Erreur de montant",
          description: `Le montant du SMS (${extractedAmount}F) ne correspond pas au montant du coupon (${amount}F).`,
        });
        setIsLoading(false);
        return;
      }
      try {
        transactionDate = parse(
          transactionDateStr,
          "yyyy-MM-dd HH:mm:ss",
          new Date()
        );
      } catch (e) {
        transactionDate = new Date(); // Fallback
      }
    } else if (/^\d+$/.test(confirmationMessage.trim())) {
      smsTransactionId = confirmationMessage.trim();
    } else {
      if (operator === "mtn") {
        toast({
          variant: "destructive",
          title: "Format de message incorrect",
          description:
            "Le SMS de confirmation MTN n'est pas dans le bon format. Veuillez copier le message entier ou juste l'ID de transaction.",
        });
        setIsLoading(false);
        return;
      }
      smsTransactionId = confirmationMessage.trim();
    }

    if (!smsTransactionId) {
      toast({
        variant: "destructive",
        title: "ID de transaction manquant",
        description: "Impossible d'extraire un ID de transaction du message.",
      });
      setIsLoading(false);
      return;
    }

    // Generate a unique ID for the document in Firestore
    const docId = `coupon_${Date.now()}_${user.uid.substring(0, 5)}`;

    const couponRef = doc(firestore, "users", user.uid, "coupons", docId);
    const transactionRef = doc(
      firestore,
      "users",
      user.uid,
      "transactions",
      docId
    );

    const newCoupon: Coupon = {
      id: docId,
      userId: user.uid,
      amount: amount,
      createdAt: serverTimestamp(),
      status: "pending",
      expiresAt: null, // Will be set upon approval
    };

    const newTransaction: AppTransaction = {
      id: docId,
      date: transactionDate.toISOString(),
      opRef: smsTransactionId, // Store the operator's transaction ID here
      label: `Achat coupon ${amount} TP`,
      category: "Coupon",
      group: "tapaarpay_topup",
      type: "in",
      senderID: phoneNumber,
      sender: user.displayName || "Utilisateur",
      senderPhone: phoneNumber,
      amount: amount,
      displayAmount: amount,
      fees: 0,
      receiverID: user.uid,
      receiver: user.displayName || "Utilisateur",
      receiverPhone: phoneNumber,
      method: operator,
      methodRef: confirmationMessage, // Store the full confirmation message here
      createdAt: serverTimestamp(),
      status: "pending",
    };

    setDocumentNonBlocking(couponRef, newCoupon);
    setDocumentNonBlocking(transactionRef, newTransaction);

    setIsLoading(false);
    toast({
      title: "Paiement soumis",
      description:
        "Votre paiement est en cours de vérification. Votre solde sera mis à jour sous peu.",
      variant: "success",
    });

    // Redirect user to dashboard or a "pending payment" page after submission
    router.push("/dashboard");
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
              {/* sur le numéro{" "}
              <strong className="font-bold">
                {selectedOperator && operatorData[selectedOperator].number}
              </strong> */}
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
                      {/* <SelectItem value="celtiis">
                        {operatorData.celtiis.name}
                      </SelectItem> */}
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
              disabled={isLoading}
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
