"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Info, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";

const couponValues = [
  200, 500, 1000, 1500, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 50000,
];

export default function CouponPage() {
  const router = useRouter();

  const handlePurchase = (amount: number) => {
    router.push(`/payment/${amount}`);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-lg font-semibold">Achat TapaarPoints</h1>
        <div className="w-9 h-9"></div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Comment ça marche ?</h3>
              <p className="text-sm">
                Achetez un coupon pour recharger votre solde. La valeur du
                coupon est créditée en TapaarPoints (TP) sur votre compte.
              </p>
              <p className="text-sm mt-2">
                Un TapaarPoint n'est pas de l'argent et sera exclusivement
                utilisé pour acheter des services offerts par Tapaar.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {couponValues.map((value) => (
              <Card
                key={value}
                className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3 flex-1">
                  <div className="flex items-baseline">
                    <p className="text-3xl font-bold text-primary">
                      {value.toLocaleString("fr-FR")}
                    </p>
                    <span className="ml-1 font-semibold text-muted-foreground">
                      TP
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {value.toLocaleString("fr-FR")} FCFA
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Valable 60 jours</span>
                  </div>
                </CardContent>
                <div className="p-2 border-t">
                  <Button
                    className="w-full font-bold"
                    size="sm"
                    onClick={() => handlePurchase(value)}
                  >
                    Acheter
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
