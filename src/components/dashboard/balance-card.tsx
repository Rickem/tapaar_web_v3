"use client";

import { Phone, ArrowRightLeft, History } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";

interface BalanceCardProps {
  topupBalance: number;
  bonusBalance: number;
}

const AnimatedCardPattern = () => {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-10"
    >
      <defs>
        <pattern
          id="balance-pattern"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
        >
          <path
            d="M20 20 L60 20 L60 60 L20 60 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            transform="rotate(45 40 40)"
          />
          <circle cx="40" cy="40" r="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#balance-pattern)" />
    </svg>
  );
};

export function BalanceCard({ topupBalance, bonusBalance }: BalanceCardProps) {
  const [showBonus, setShowBonus] = useState(false);

  const toggleBalance = () => {
    setShowBonus(!showBonus);
  };

  const displayedLabel = showBonus ? "Bonus" : "TapaarPoints";
  const displayedBalance = showBonus ? bonusBalance : topupBalance;
  const displayedCurrency = "TP";

  return (
    <div className="relative rounded-2xl balance-card-gradient text-primary-foreground p-6 shadow-lg shadow-primary/20 flex flex-col justify-between min-h-[220px] overflow-hidden">
      <AnimatedCardPattern />
      <div className="cursor-pointer relative z-10" onClick={toggleBalance}>
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">{displayedLabel}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-4xl font-bold tracking-tight">
              {Math.floor(displayedBalance).toLocaleString("fr-FR")}
            </p>
            <span className="text-lg sm:text-xl font-medium opacity-80">
              {displayedCurrency}
            </span>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex justify-center items-center pt-4 gap-6 pb-2">
        <Link href="/airtime" className="flex flex-col items-center space-y-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 rounded-full h-12 w-12"
          >
            <Phone className="h-6 w-6" />
          </Button>
          <span className="text-xs font-light text-primary-foreground">
            Crédit
          </span>
        </Link>
        <Link href="/transfer" className="flex flex-col items-center space-y-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 rounded-full h-12 w-12"
          >
            <ArrowRightLeft className="h-6 w-6" />
          </Button>
          <span className="text-xs font-light">Transfert</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center space-y-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 rounded-full h-12 w-12"
          >
            <History className="h-6 w-6" />
          </Button>
          <span className="text-xs font-light text-primary-foreground">
            Coupons
          </span>
        </Link>
      </div>
    </div>
  );
}
