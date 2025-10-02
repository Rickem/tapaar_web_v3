"use client";

import { doc, collection, query, orderBy } from "firebase/firestore";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import type { Coupon } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Calendar, Info, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
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

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  const couponsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "coupons"),
      orderBy("createdAt", "desc")
    );
  }, [user, firestore]);

  const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);

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
              {coupons.map((coupon) => (
                <Card key={coupon.id} className="rounded-xl shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-primary">
                        {coupon.amount.toLocaleString("fr-FR")} TP
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {coupon.createdAt
                            ? format(
                                coupon.createdAt.toDate(),
                                "dd MMMM yyyy, HH:mm",
                                { locale: fr }
                              )
                            : "Date inconnue"}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs font-semibold",
                        statusStyles[coupon.status]
                      )}
                    >
                      {statusTranslations[coupon.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
