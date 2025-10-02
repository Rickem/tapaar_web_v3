"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import PaymentForm from "@/components/payment/payment-form";

function PaymentPageContent() {
  const router = useRouter();
  const params = useParams();
  const amount = Array.isArray(params.amount)
    ? params.amount[0]
    : params.amount;

  // Convert amount to number and format it
  const numericAmount = Number(amount);
  const formattedAmount = isNaN(numericAmount)
    ? "0"
    : numericAmount.toLocaleString("fr-FR");

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
        <h1 className="text-lg font-semibold">Confirmation de Paiement</h1>
        <div className="w-9 h-9"></div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Vous êtes sur le point de payer
            </p>
            <p className="text-4xl font-bold text-primary">
              {formattedAmount} FCFA
            </p>
            <p className="text-sm text-muted-foreground">
              pour {formattedAmount} TapaarPoints
            </p>
          </div>
          <PaymentForm amount={numericAmount} />
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
