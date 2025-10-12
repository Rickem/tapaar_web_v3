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
import { useUser, useFirestore } from "@/firebase";
import type { Coupon } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Info,
  Loader2,
  Tag,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, add, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: { [key in Coupon["status"]]: string } = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-300",
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-300",
  used: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300",
  expired:
    "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-200 border-gray-300",
};

const statusTranslations: { [key in Coupon["status"]]: string } = {
  pending: "En attente",
  active: "Actif",
  used: "Utilisé",
  expired: "Expiré",
};

const COUPONS_PER_PAGE = 10;

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
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

  const fetchCoupons = useCallback(
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
        collection(firestore, "users", user.uid, "coupons"),
        orderBy("createdAt", "desc"),
        limit(COUPONS_PER_PAGE)
      );

      if (lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      try {
        const querySnapshot = await getDocs(q);
        const newCoupons = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Coupon)
        );

        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setCoupons((prev) =>
          lastVisibleDoc ? [...prev, ...newCoupons] : newCoupons
        );
        setHasMore(newCoupons.length === COUPONS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching coupons:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, firestore]
  );

  useEffect(() => {
    if (user && !isUserLoading) {
      fetchCoupons();
    }
  }, [user, isUserLoading, fetchCoupons]);

  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Chargement de l'historique...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-lg font-semibold">Historique des Coupons</h1>
        <div className="w-9 h-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {!coupons || coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-64 gap-4">
              <Tag className="h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Aucun coupon trouvé</h2>
              <p className="text-muted-foreground max-w-xs">
                Vous n'avez pas encore acheté de coupons. Commencez dès
                maintenant pour recharger votre solde.
              </p>
              <Button onClick={() => router.push("/coupons")}>
                Acheter des TapaarPoints
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => {
                const createdAtDate = coupon.createdAt?.toDate();
                const expiresAtDate = createdAtDate
                  ? add(createdAtDate, { days: 60 })
                  : null;

                let displayStatus: Coupon["status"] = coupon.status;

                if (
                  createdAtDate &&
                  !isToday(createdAtDate) &&
                  coupon.status === "active"
                ) {
                  displayStatus = "used";
                }

                const displayStatusText = statusTranslations[displayStatus];

                return (
                  <Card key={coupon.id} className="rounded-xl shadow-sm">
                    <CardContent className="p-4 flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-xl font-bold text-primary">
                          {coupon.amount.toLocaleString("fr-FR")} TP
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Acheté le:{" "}
                            {createdAtDate
                              ? format(createdAtDate, "dd/MM/yy, HH:mm", {
                                  locale: fr,
                                })
                              : "Date inconnue"}
                          </span>
                        </div>
                        {expiresAtDate && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarClock className="h-4 w-4" />
                            <span>
                              Expire le:{" "}
                              {format(expiresAtDate, "dd/MM/yy, HH:mm", {
                                locale: fr,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "text-xs font-semibold",
                          statusStyles[displayStatus]
                        )}
                      >
                        {displayStatusText}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchCoupons(lastDoc)}
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
    </div>
  );
}
