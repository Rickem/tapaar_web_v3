"use client";

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
} from "firebase/firestore";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import type { AppTransaction, SMS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  ReceiptText,
  ArrowUpCircle,
  ArrowDownCircle,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { useToast } from "@/hooks/use-toast";

const statusStyles: { [key: string]: string } = {
  confirmed: "border-transparent bg-success text-success-foreground",
  pending: "border-transparent bg-yellow-500 text-white",
  cancelled: "border-transparent bg-destructive text-destructive-foreground",
};

const statusTranslations: { [key: string]: string } = {
  confirmed: "Confirmé",
  pending: "En attente",
  cancelled: "Annulé",
};

function TransactionIcon({ type }: { type: AppTransaction["type"] }) {
  if (type === "in") {
    return <ArrowDownCircle className="h-8 w-8 text-success" />;
  }
  return <ArrowUpCircle className="h-8 w-8 text-destructive" />;
}

const TRANSACTIONS_PER_PAGE = 15;

export default function TransactionsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  const fetchTransactions = useCallback(
    async (
      lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null
    ) => {
      if (!user) return;

      if (lastVisibleDoc === null) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      let q = query(
        collection(firestore, "users", user.uid, "transactions"),
        orderBy("createdAt", "desc"),
        limit(TRANSACTIONS_PER_PAGE)
      );

      if (lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      try {
        const querySnapshot = await getDocs(q);
        const newTransactions = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as AppTransaction)
        );

        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setTransactions((prev) =>
          lastVisibleDoc ? [...prev, ...newTransactions] : newTransactions
        );
        setHasMore(newTransactions.length === TRANSACTIONS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, firestore]
  );

  const handleVerifyPayment = async (tx: AppTransaction) => {
    if (!user) return;
    setVerifyingId(tx.id);

    try {
      const smsQuery = query(
        collection(firestore, "sms"),
        where("parsedRef", "==", tx.opRef),
        where("processed", "==", false),
        where("parsedPhoneNormalized", "==", tx.senderPhone),
        where("operator", "==", tx.method),
        where("parsedAmount", "==", tx.amount),
        limit(1)
      );

      const smsSnapshot = await getDocs(smsQuery);

      if (smsSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Vérification échouée",
          description:
            "Aucun message de paiement correspondant et non traité n'a été trouvé. Veuillez réessayer plus tard.",
        });
        setVerifyingId(null);
        return;
      }

      const smsDoc = smsSnapshot.docs[0];

      // Perform atomic update
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
        if (!walletDoc.exists()) {
          throw new Error("Portefeuille introuvable.");
        }
        const newBalance = walletDoc.data().balance + tx.amount;

        // 1. Update transaction status
        transaction.update(userTransactionRef, { status: "confirmed" });
        // 2. Update coupon status
        transaction.update(couponRef, { status: "active" });
        // 3. Update user's balance
        transaction.update(walletRef, { balance: newBalance });
        // 4. Mark SMS as processed
        transaction.update(smsRef, { processed: true });
      });

      toast({
        variant: "success",
        title: "Paiement validé !",
        description: `${tx.amount} TP ont été ajoutés à votre solde.`,
      });

      // Refresh transactions to reflect the change
      fetchTransactions();
    } catch (error: any) {
      console.error("Erreur lors de la vérification du paiement :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error.message || "Une erreur est survenue lors de la validation.",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Chargement des transactions...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold">Mes Transactions</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-4">
          {transactions.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center text-center h-64 gap-4">
              <ReceiptText className="h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Aucune transaction</h2>
              <p className="text-muted-foreground max-w-xs">
                Vos opérations apparaîtront ici dès que vous effectuerez une
                action.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Retour à l'accueil
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <Card key={tx.id} className="rounded-xl shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <TransactionIcon type={tx.type} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {tx.group === "airtime" && tx.receiverPhone
                              ? `${tx.label} ${tx.receiverPhone}`
                              : tx.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tx.createdAt
                              ? format(
                                  tx.createdAt.toDate(),
                                  "dd MMMM yyyy, HH:mm",
                                  { locale: fr }
                                )
                              : "Date inconnue"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <p
                          className={cn(
                            "text-lg font-bold",
                            tx.type === "in"
                              ? "text-success"
                              : "text-destructive"
                          )}
                        >
                          {tx.type === "in" ? "+" : "-"}
                          {Math.abs(tx.displayAmount).toLocaleString(
                            "fr-FR"
                          )}{" "}
                          TP
                        </p>
                        <Badge
                          className={cn(
                            "text-xs font-semibold",
                            statusStyles[tx.status]
                          )}
                        >
                          {statusTranslations[tx.status]}
                        </Badge>
                      </div>
                    </div>
                    {tx.group === "tapaarpay_topup" &&
                      tx.status === "pending" && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg p-3 text-xs flex items-start gap-2 mb-3">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>
                              Ce paiement est en attente. Si vous avez déjà
                              payé, cliquez sur vérifier pour une validation
                              manuelle.
                            </p>
                          </div>
                          <Button
                            className="w-full"
                            variant="secondary"
                            onClick={() => handleVerifyPayment(tx)}
                            disabled={verifyingId === tx.id}
                          >
                            {verifyingId === tx.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Vérifier le paiement
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchTransactions(lastDoc)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Charger plus"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
