"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { Favorite } from "@/lib/types-airtime";
import { cn } from "@/lib/utils";

interface FavoriteNumberProps {
  favorite: Favorite;
  onClick: () => void;
}

export function FavoriteNumber({ favorite, onClick }: FavoriteNumberProps) {
  return (
    <Card className="rounded-lg shadow-sm shrink-0" onClick={onClick}>
      <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
          <Star className="h-5 w-5 text-amber-500" fill="currentColor" />
        </div>
        <p className="font-semibold text-xs">
          {favorite.name || favorite.value}
        </p>
      </CardContent>
    </Card>
  );
}
