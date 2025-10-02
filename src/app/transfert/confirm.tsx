"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Wallet, Star, User, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  writeBatch,
} from "firebase/firestore";
import type {
  Wallet as WalletType,
  AppTransaction,
  UserProfile,
} from "@/lib/types";
import { useDoc } from "@/firebase/firestore/use-doc";

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [paymentMethod, setPaymentMethod] = useState<"tapaar-points" | "bonus">(
    "tapaar-points"
  );
  const [isLoading, setIsLoading] = useState(false);

  const recipientId = searchParams.get("recipientId") || "";
  const recipientName = searchParams.get("recipientName") || "";
  const recipientUsername = searchParams.get("recipientUsername") || "";
  const recipientPhoto = searchParams.get("recipientPhoto") || "";
  const amount = Number(searchParams.get("amount") || 0);
  const note = searchParams.get("note") || "";

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const topupWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-topup-");
  }, [user, firestore]);
  const { data: topupWallet } = useDoc<WalletType>(topupWalletRef);

  const bonusWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-bonus-");
  }, [user, firestore]);
  const { data: bonusWallet } = useDoc<WalletType>(bonusWalletRef);

  const handleConfirm = async () => {
    if (!user || !userProfile || !recipientId) {
      toast({
        title: "Erreur",
        description: "Données de session ou de transaction manquantes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const senderWalletRef = doc(
      firestore,
      "users",
      user.uid,
      "wallets",
      paymentMethod === "bonus" ? "-bonus-" : "-topup-"
    );
    const receiverWalletRef = doc(
      firestore,
      "users",
      recipientId,
      "wallets",
      "-topup-"
    ); // Always transfer to main TapaarPoints wallet

    const senderTransactionRef = doc(
      collection(firestore, "users", user.uid, "transactions")
    );
    const receiverTransactionRef = doc(
      collection(firestore, "users", recipientId, "transactions")
    );

    try {
      await runTransaction(firestore, async (transaction) => {
        const senderWalletDoc = await transaction.get(senderWalletRef);
        const receiverWalletDoc = await transaction.get(receiverWalletRef);

        const currentSenderBalance = senderWalletDoc.data()?.balance || 0;

        if (currentSenderBalance < amount) {
          throw new Error("Solde insuffisant.");
        }
        if (!receiverWalletDoc.exists()) {
          throw new Error("Le portefeuille du destinataire est introuvable.");
        }

        const newSenderBalance = currentSenderBalance - amount;
        const newReceiverBalance =
          (receiverWalletDoc.data()?.balance || 0) + amount;

        // 1. Update sender's wallet
        transaction.update(senderWalletRef, {
          balance: newSenderBalance,
          updatedAt: serverTimestamp(),
        });

        // 2. Update receiver's wallet
        transaction.update(receiverWalletRef, {
          balance: newReceiverBalance,
          updatedAt: serverTimestamp(),
        });

        const transactionTime = serverTimestamp();
        const opRef = `TRF-${Date.now()}`;

        const baseLabel = `Transfert à @${recipientUsername}`;
        const finalLabel = note ? `${baseLabel} (${note})` : baseLabel;

        // 3. Create transaction record for sender
        const senderTx: Omit<AppTransaction, "id" | "createdAt"> = {
          date: new Date().toISOString(),
          opRef: opRef,
          label: finalLabel,
          category: "Transfert",
          group: "products",
          type: "out",
          senderID: user.uid,
          sender: userProfile.username,
          senderPhone: userProfile.phone,
          amount: amount,
          displayAmount: -amount,
          fees: 0,
          receiverID: recipientId,
          receiver: recipientUsername,
          receiverPhone: "", // Receiver phone not available here
          method: paymentMethod === "bonus" ? "Bonus" : "TapaarPoints",
          methodRef: "",
          status: "confirmed",
        };
        transaction.set(senderTransactionRef, {
          ...senderTx,
          createdAt: transactionTime,
        });

        // 4. Create transaction record for receiver
        const receiverTx: Omit<AppTransaction, "id" | "createdAt"> = {
          date: new Date().toISOString(),
          opRef: opRef,
          label: `Transfert de @${userProfile.username}`,
          category: "Transfert",
          group: "products",
          type: "in",
          senderID: user.uid,
          sender: userProfile.username,
          senderPhone: userProfile.phone,
          amount: amount,
          displayAmount: amount,
          fees: 0,
          receiverID: recipientId,
          receiver: recipientUsername,
          receiverPhone: "",
          method: "TapaarPoints",
          methodRef: "",
          status: "confirmed",
        };
        transaction.set(receiverTransactionRef, {
          ...receiverTx,
          createdAt: transactionTime,
        });
      });

      toast({
        title: "Transfert réussi !",
        description: `${amount.toLocaleString(
          "fr-FR"
        )} TP ont été envoyés à @${recipientUsername}.`,
        variant: "success",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Échec du transfert",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-lg font-semibold">Confirmer le Transfert</h1>
        <div className="w-9 h-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Résumé de l'opération</CardTitle>
            <CardDescription>
              Veuillez vérifier les détails avant de confirmer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={recipientPhoto} />
                <AvatarFallback>{recipientName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{recipientName}</p>
                <p className="text-sm text-muted-foreground">
                  @{recipientUsername}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-2xl font-bold text-primary pt-4">
              <span>Montant à envoyer</span>
              <span>{amount.toLocaleString("fr-FR")} TP</span>
            </div>
            {note && (
              <div className="text-sm text-muted-foreground pt-2">
                <strong>Note:</strong> {note}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Méthode de paiement</CardTitle>
            <CardDescription>Choisissez le solde à utiliser.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              defaultValue="tapaar-points"
              onValueChange={(value: any) => setPaymentMethod(value)}
            >
              <div className="flex items-center space-x-4 p-4 border rounded-lg has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                <RadioGroupItem value="tapaar-points" id="tapaar-points" />
                <Label
                  htmlFor="tapaar-points"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="font-semibold">TapaarPoints</span>
                    </div>
                    <span className="font-mono">
                      {topupWallet?.balance.toLocaleString("fr-FR") || 0} TP
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-4 p-4 border rounded-lg has-[:checked]:bg-amber-500/5 has-[:checked]:border-amber-500">
                <RadioGroupItem value="bonus" id="bonus" />
                <Label htmlFor="bonus" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold">Solde Bonus</span>
                    </div>
                    <span className="font-mono">
                      {bonusWallet?.balance.toLocaleString("fr-FR") || 0} TP
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        <Button
          className="w-full font-bold text-lg"
          size="lg"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmer et Envoyer
        </Button>
      </main>
    </div>
  );
}

export default function TransferConfirmationPage() {
  return (
    <Suspense fallback={<div>Chargement de la confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
