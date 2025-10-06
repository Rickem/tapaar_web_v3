"use client";

import { Loader2 } from "lucide-react";

export function VerifyingPayment() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 h-full">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <h2 className="text-2xl font-bold">Vérification en cours...</h2>
      <p className="text-muted-foreground max-w-sm">
        Nous vérifions votre paiement. Veuillez ne pas quitter cette page. Cette
        opération peut prendre jusqu'à une minute.
      </p>
    </div>
  );
}
