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
import {
  ArrowLeft,
  Wallet,
  Star,
  Phone,
  Tag,
  TrendingUp,
  Loader2,
} from "lucide-react";
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
  Job,
} from "@/lib/types";
import { useDoc } from "@/firebase/firestore/use-doc";

// Placeholder for operator specific data
const operatorConfig = {
  mtn: { pin: "00000" },
  moov: { pin: "9999" },
  celtiis: { pin: "32021" },
};

const operatorOptionMaps = {
  mtn: {
    Maxi: {
      100: "1",
      150: "2",
      200: "3",
      500: "4",
      1000: "1",
      1500: "2",
      2500: "1",
      5000: "2",
    },
    "Maxi+Internet": {
      100: "1",
      150: "2",
      200: "3",
      500: "4",
      1000: "1",
      1500: "2",
      2500: "1",
      5000: "2",
    },
    Internet: {
      100: "1",
      150: "2",
      200: "3",
      250: "4",
      300: "5",
      500: "6",
      995: "7",
      1000: "1",
      2000: "2",
    },
    Illimité: {
      15100: "1",
      20000: "2",
      25000: "3",
      50000: "4",
    },
  },
  moov: {
    "Pass Bonus": {
      100: "1",
      150: "2",
      200: "3",
      500: "4",
      1000: "1",
      1500: "2",
      2500: "1",
      5000: "2",
      10000: "1",
      15000: "2",
    },
    "Pass+Internet": {
      100: "1",
      150: "2",
      200: "3",
      500: "4",
      1000: "1",
      1500: "2",
      2500: "1",
      5000: "2",
      10000: "1",
      15000: "2",
    },
    Internet: {
      100: "1",
      200: "2",
      250: "3",
      500: "4",
      1000: "1",
      2000: "2",
      2500: "1",
      5000: "2",
    },
    Illimité: {
      15100: "11",
      15500: "1",
      20000: "2",
      25000: "3",
      30000: "4",
      50000: "5",
    },
  },
  celtiis: {
    "Top Appel": {
      100: "1",
      150: "2",
      200: "3",
      500: "1",
      1000: "2",
      1500: "3",
      2000: "4",
      5000: "1",
      10000: "2",
    },
    "Internet Connect": {
      100: "1",
      200: "2",
      500: "3",
      750: "4",
      1000: "1",
      1500: "2",
      3000: "1",
      5000: "2",
      10000: "3",
    },
    MyMix: {
      100: "1",
      200: "2",
      500: "3",
      750: "4",
      1000: "5",
      1500: "6",
      3000: "7",
      5000: "8",
      10000: "9",
    },
    IllimiNet: {
      15100: "1",
      20000: "2",
      25000: "3",
      50000: "4",
    },
  },
};

const getMtnMaxiPeriod = (amount: number): string => {
  if ([100, 150, 200, 500].includes(amount)) return "1";
  if ([1000, 1500].includes(amount)) return "2";
  if ([2500, 5000].includes(amount)) return "3";
  return "1"; // Default period
};

const getMtnInternetPeriod = (amount: number): string => {
  if ([100, 150, 200, 250, 300, 500, 995].includes(amount)) return "1";
  if ([1000, 2000].includes(amount)) return "2";
  return "1"; // Default period
};

const getMoovPassBonusPeriod = (amount: number): string => {
  if ([100, 150, 200, 500].includes(amount)) return "1";
  if ([1000, 1500].includes(amount)) return "2";
  if ([2500, 5000].includes(amount)) return "3";
  if ([10000, 15000].includes(amount)) return "4";
  return "1"; // Default period
};

const getMoovInternetPeriod = (amount: number): string => {
  if ([100, 200, 250, 500].includes(amount)) return "1";
  if ([1000, 2000].includes(amount)) return "2";
  if ([2500, 5000].includes(amount)) return "3";
  if ([15500, 20000, 25000, 30000, 50000].includes(amount)) return "4";
  return "1";
};

const getCeltiisTopAppelPeriod = (amount: number): string => {
  if ([100, 150, 200].includes(amount)) return "1";
  if ([500, 1000, 1500, 2000].includes(amount)) return "2";
  if ([5000, 10000].includes(amount)) return "3";
  return "1";
};

const getCeltiisInternetPeriod = (amount: number): string => {
  if ([100, 200, 500, 750].includes(amount)) return "1";
  if ([1000, 1500].includes(amount)) return "2";
  if ([3000, 5000, 10000].includes(amount)) return "3";
  return "1";
};

const ussdConfig = {
  mtn: {
    Crédit: ["*880#", "2", "2", "{phone}", "{phone}", "{amount}", "{pin}"],
    Internet: ["*840*123*{period}*{phone}#", "{option}", "{pin}"],
    Maxi: ["*840*173*{period}*{phone}#", "{option}", "1", "{pin}"],
    "Maxi+Internet": ["*840*173*{period}*{phone}#", "{option}", "2", "{pin}"],
    Illimité: ["*840*123*4*{phone}#", "{option}", "{pin}"],
  },
  moov: {
    Crédit: ["*855*3*1*2*{phone}*{amount}#", "{pin}"],
    "Pass Bonus": [
      "*855*3*2*2*{phone}#",
      "2",
      "{period}",
      "{option}",
      "1",
      "{pin}",
      "00",
    ],
    "Pass+Internet": [
      "*855*3*2*2*{phone}#",
      "2",
      "{period}",
      "{option}",
      "2",
      "{pin}",
      "00",
    ],
    Internet: [
      "*855*3*2*2*{phone}#",
      "1",
      "1",
      "{period}",
      "{option}",
      "{pin}",
      "00",
    ],
    Illimité: ["*855*3*2*2*{phone}#", "1", "1", "4", "{option}", "{pin}", "00"],
  },
  celtiis: {
    Crédit: ["*889#", "5", "1", "{phone}", "{phone}", "{amount}", "{pin}"],
    "Top Appel": ["*889*173*{phone}*{period}#", "{option}", "1", "{pin}"],
    "Internet Connect": [
      "*889*123*{phone}*{period}#",
      "{option}",
      "1",
      "{pin}",
    ],
    MyMix: ["*889*172*{phone}*{period}#", "{option}", "1", "{pin}"],
    IllimiNet: ["*889*123*4*{phone}*2#", "{option}", "1", "{pin}"],
  },
};

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

  const operator = searchParams.get("operator") as
    | keyof typeof operatorConfig
    | null;
  const operatorName = searchParams.get("operatorName") || "";
  const packageName = searchParams.get("package") || "";
  const phone = searchParams.get("phone") || "";
  const amount = Number(searchParams.get("amount") || 0);

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
    if (!user || !userProfile || !operator) {
      toast({
        title: "Erreur",
        description: "Données de session ou de transaction manquantes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const walletRef = doc(
      firestore,
      "users",
      user.uid,
      "wallets",
      paymentMethod === "bonus" ? "-bonus-" : "-topup-"
    );
    const userTransactionRef = doc(
      collection(firestore, "users", user.uid, "transactions")
    );
    const jobRef = doc(collection(firestore, "jobs")); // Root collection for jobs

    try {
      await runTransaction(firestore, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const currentBalance = walletDoc.data()?.balance || 0;

        if (currentBalance < amount) {
          throw new Error("Solde insuffisant.");
        }

        const newBalance = currentBalance - amount;
        transaction.update(walletRef, {
          balance: newBalance,
          updatedAt: serverTimestamp(),
        });

        const newTransactionData: Omit<AppTransaction, "id" | "createdAt"> = {
          date: new Date().toISOString(),
          opRef: `AIRTIME-${Date.now()}`,
          label: `Achat ${packageName} ${operatorName} ${phone}`,
          category: operatorName,
          group: "airtime",
          type: "out",
          senderID: user.uid,
          sender: userProfile.username || "N/A",
          senderPhone: userProfile.phone || "N/A",
          amount: amount,
          displayAmount: -amount,
          fees: 0,
          receiverID: phone,
          receiver: phone,
          receiverPhone: phone,
          method: paymentMethod === "bonus" ? "Bonus" : "TapaarPoints",
          methodRef: "",
          status: "pending",
          product: packageName,
        };

        transaction.set(userTransactionRef, {
          ...newTransactionData,
          createdAt: serverTimestamp(),
        });

        // Construct USSD sequence dynamically
        const pin = operatorConfig[operator].pin;
        const operatorUssdConfig =
          ussdConfig[operator as keyof typeof ussdConfig];
        const baseUssdSequence =
          (operatorUssdConfig as any)[packageName] ||
          operatorUssdConfig["Crédit"];

        let option: string;
        let period: string;

        if (operator === "mtn") {
          const optionMap = (operatorOptionMaps.mtn as any)?.[packageName];
          if (optionMap) {
            option = optionMap[amount];
            if (!option) {
              throw new Error(
                `Option non trouvée pour le montant ${amount}F du forfait ${packageName}.`
              );
            }
          }

          if (packageName === "Maxi" || packageName === "Maxi+Internet") {
            period = getMtnMaxiPeriod(amount);
          } else if (packageName === "Internet" || packageName === "Illimité") {
            period = getMtnInternetPeriod(amount);
          }
        } else if (operator === "moov") {
          const optionMap = (operatorOptionMaps.moov as any)?.[packageName];
          if (optionMap) {
            option = optionMap[amount];
            if (!option) {
              throw new Error(
                `Option non trouvée pour le montant ${amount}F du forfait ${packageName}.`
              );
            }
          }

          if (packageName === "Pass Bonus" || packageName === "Pass+Internet") {
            period = getMoovPassBonusPeriod(amount);
          } else if (packageName === "Internet" || packageName === "Illimité") {
            period = getMoovInternetPeriod(amount);
          }
        } else if (operator === "celtiis") {
          const optionMap = (operatorOptionMaps.celtiis as any)?.[packageName];
          if (optionMap) {
            option = optionMap[amount];
            if (!option) {
              throw new Error(
                `Option non trouvée pour le montant ${amount}F du forfait ${packageName}.`
              );
            }
          }

          if (packageName === "Top Appel") {
            period = getCeltiisTopAppelPeriod(amount);
          } else if (packageName === "Internet Connect") {
            period = getCeltiisInternetPeriod(amount);
          } else if (packageName === "IllimiNet") {
            period = "4";
          }
        }

        const finalUssdSequence = baseUssdSequence.map((step: string) =>
          step
            .replace("{phone}", phone)
            .replace("{amount}", String(amount))
            .replace("{pin}", pin)
            .replace("{option}", option)
            .replace("{period}", period)
        );

        const newJobData: Omit<Job, "id" | "createdAt"> = {
          amount: String(amount),
          operator: operator,
          phoneNumber: phone,
          status: "pending",
          transactionId: userTransactionRef.id,
          userId: user.uid,
          type: "airtime",
          ussdSequence: finalUssdSequence,
          pin: pin,
        };

        transaction.set(jobRef, {
          ...newJobData,
          createdAt: serverTimestamp(),
        });
      });

      toast({
        title: "Recharge initiée !",
        description: `Votre demande de recharge de ${amount.toLocaleString(
          "fr-FR"
        )} F sur le ${phone} est en cours de traitement.`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Échec de la transaction",
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
        <h1 className="text-lg font-semibold">Confirmer la Recharge</h1>
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" /> Opérateur
              </span>
              <span className="font-semibold">{operatorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Forfait
              </span>
              <span className="font-semibold">{packageName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" /> Numéro
              </span>
              <span className="font-semibold">{phone}</span>
            </div>
            <div className="flex items-center justify-between text-2xl font-bold text-primary">
              <span>Montant</span>
              <span>{amount.toLocaleString("fr-FR")} TP</span>
            </div>
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
          Confirmer et Payer
        </Button>
      </main>
    </div>
  );
}

export default function AirtimeConfirmationPage() {
  return (
    <Suspense fallback={<div>Chargement de la confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
