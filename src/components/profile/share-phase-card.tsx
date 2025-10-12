"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SharePhase } from "@/lib/types";

interface SharePhaseCardProps {
  name: string;
  data: SharePhase | null;
}

function InfoRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">
        {value.toLocaleString("fr-FR")}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </span>
    </div>
  );
}

export function SharePhaseCard({ name, data }: SharePhaseCardProps) {
  if (!data) return null;

  return (
    <Card className="bg-muted/50">
      <CardHeader className="p-4">
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <InfoRow
          label="Parts Achetées"
          value={data.purchased || 0}
          unit="Parts"
        />
        <InfoRow label="Parts Bonus" value={data.bonus || 0} unit="Parts" />
        <InfoRow
          label="Valeur Totale"
          value={data.totalValue || 0}
          unit="FCFA"
        />
      </CardContent>
    </Card>
  );
}
