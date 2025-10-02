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
import type { AppTransaction } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  ReceiptText,
  ArrowUpCircle,
  ArrowDownCircle,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/dashboard/bottom-nav";

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
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
          {transactions.length === 0 ? (
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
                  <CardContent className="p-4 flex items-center justify-between gap-4">
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
                          tx.type === "in" ? "text-success" : "text-destructive"
                        )}
                      >
                        {tx.type === "in" ? "+" : "-"}
                        {Math.abs(tx.displayAmount).toLocaleString("fr-FR")} TP
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
