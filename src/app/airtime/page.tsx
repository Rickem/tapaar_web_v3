"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Wifi,
  MessageSquare,
  Phone,
  InfinityIcon,
  Info,
  Loader2,
  PlusCircle,
  Star,
  ChevronRight,
  AlertCircle,
  AlertCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Favorite } from "@/lib/types-airtime";
import { FavoriteNumber } from "@/components/airtime/favorite-number";

const operators = {
  mtn: {
    name: "MTN",
    packages: [
      { name: "Crédit", icon: Phone },
      { name: "Maxi", icon: MessageSquare },
      { name: "Maxi+Internet", icon: Wifi },
      { name: "Internet", icon: Wifi },
      { name: "Illimité", icon: InfinityIcon },
    ],
  },
  moov: {
    name: "MOOV",
    packages: [
      { name: "Crédit", icon: Phone },
      { name: "Pass Bonus", icon: MessageSquare },
      { name: "Pass+Internet", icon: Wifi },
      { name: "Internet", icon: Wifi },
      { name: "Illimité", icon: InfinityIcon },
    ],
  },
  celtiis: {
    name: "CELTIIS",
    packages: [
      { name: "Crédit", icon: Phone },
      { name: "Top Appel", icon: MessageSquare },
      { name: "Internet Connect", icon: Wifi },
      // { name: "MyMix", icon: Wifi },
      { name: "IllimiNet", icon: InfinityIcon },
    ],
  },
};

const packagePrices: Record<string, Record<string, number[]>> = {
  mtn: {
    Internet: [100, 150, 200, 250, 300, 500, 995, 1000, 2000],
    Illimité: [15100, 20000, 25000, 50000],
    Maxi: [100, 150, 200, 500, 1000, 1500, 2500, 5000],
    "Maxi+Internet": [100, 150, 200, 500, 1000, 1500, 2500, 5000],
  },
  // moov: {
  //   "Pass Bonus": [100, 150, 200, 500, 1000, 1500, 2500, 5000, 10000, 15000],
  //   "Pass+Internet": [100, 150, 200, 500, 1000, 1500, 2500, 5000, 10000, 15000],
  //   Internet: [
  //     100, 150, 200, 250, 300, 500, 550, 750, 995, 1000, 2000, 2500, 5000,
  //   ],
  //   Illimité: [15100, 15500, 20000, 25000, 30000, 50000],
  // },
  celtiis: {
    "Top Appel": [100, 150, 200, 500, 1000, 1500, 2000, 5000, 10000],
    "Internet Connect": [100, 200, 500, 750, 1000, 1500, 3000, 5000, 7000],
    // MyMix: [],
    IllimiNet: [15100, 19000, 25000, 29000],
  },
};

const operatorPrefixes: Record<Operator, string[]> = {
  mtn: [
    "42",
    "46",
    "50",
    "51",
    "52",
    "53",
    "54",
    "56",
    "57",
    "59",
    "61",
    "62",
    "66",
    "67",
    "69",
    "90",
    "91",
    "96",
    "97",
  ],
  moov: ["55", "58", "60", "63", "64", "65", "68", "94", "95", "98", "99"],
  celtiis: ["29", "40", "41", "43", "44", "47", "48", "49", "92", "93"],
};

type Operator = keyof typeof operators;
type Package = { name: string; icon: React.ElementType };

function PackageCard({
  name,
  icon: Icon,
  isSelected,
  onSelect,
}: {
  name: string;
  icon: React.ElementType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer",
        isSelected && "bg-primary text-primary-foreground"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1.5">
        <div
          className={cn(
            "p-2 bg-muted rounded-full",
            isSelected && "bg-primary-foreground/20"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 text-primary",
              isSelected && "text-primary-foreground"
            )}
          />
        </div>
        <p
          className={cn(
            "font-semibold text-xs",
            isSelected && "text-primary-foreground"
          )}
        >
          {name}
        </p>
      </CardContent>
    </Card>
  );
}

function AmountButton({
  amount,
  isSelected,
  onSelect,
}: {
  amount: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "font-semibold h-auto py-2",
        isSelected && "bg-primary text-primary-foreground"
      )}
      onClick={onSelect}
    >
      {amount.toLocaleString("fr-FR")} F
    </Button>
  );
}

export default function AirtimePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator>("mtn");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFixedAmount, setSelectedFixedAmount] = useState<number | null>(
    null
  );
  const [phoneWarning, setPhoneWarning] = useState<string>("");

  const favoritesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "favorites"),
      where("type", "==", selectedOperator)
    );
  }, [user, firestore, selectedOperator]);

  const { data: favorites, isLoading: isLoadingFavorites } =
    useCollection<Favorite>(favoritesQuery);

  const checkPhoneNumber = (number: string, currentOperator: Operator) => {
    if (number.length < 10) {
      setPhoneWarning("");
      return;
    }

    if (number.length > 10 || !number.startsWith("01")) {
      setPhoneWarning(
        "Le numéro doit contenir 10 chiffres et commencer par 01."
      );
      return;
    }

    const prefix = number.substring(2, 4);
    let foundOperator: Operator | null = null;

    for (const op in operatorPrefixes) {
      if (operatorPrefixes[op as Operator].includes(prefix)) {
        foundOperator = op as Operator;
        break;
      }
    }

    if (foundOperator && foundOperator !== currentOperator) {
      setPhoneWarning(
        `Ce numéro appartient à l'opérateur ${operators[foundOperator].name}.`
      );
    } else {
      setPhoneWarning("");
    }
  };

  useEffect(() => {
    checkPhoneNumber(phoneNumber, selectedOperator);
  }, [phoneNumber, selectedOperator]);

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg.name === selectedPackage?.name ? null : pkg);
    setAmount("");
    setSelectedFixedAmount(null);
    setPhoneNumber("");
    setPhoneWarning("");
  };

  const handleTabChange = (value: string) => {
    setSelectedOperator(value as Operator);
    setSelectedPackage(null);
    setPhoneNumber("");
    setAmount("");
    setSelectedFixedAmount(null);
    setPhoneWarning("");
  };

  const handleFavoriteSelect = (fav: Favorite) => {
    setPhoneNumber(fav.value);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
  };

  const handleProceed = () => {
    if (!selectedPackage) return;
    const finalAmount = showCreditForm ? amount : selectedFixedAmount;

    const params = new URLSearchParams({
      operator: selectedOperator,
      operatorName: operators[selectedOperator].name,
      package: selectedPackage.name,
      phone: phoneNumber,
      amount: String(finalAmount),
    });

    router.push(`/airtime/confirm?${params.toString()}`);
  };

  const showCreditForm = selectedPackage?.name === "Crédit";
  const showFixedPriceForm = selectedPackage && !showCreditForm;
  const currentPrices =
    (showFixedPriceForm &&
      packagePrices[selectedOperator]?.[selectedPackage.name]) ||
    [];
  const hasFavorites = !isLoadingFavorites && favorites && favorites.length > 0;

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-lg font-semibold">Recharge Crédit & Forfaits</h1>
        <div className="w-9 h-9"></div>
      </header>

      <Tabs
        defaultValue="mtn"
        className="w-full flex flex-col flex-1"
        onValueChange={handleTabChange}
      >
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 border-b">
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl p-1">
            {Object.keys(operators).map((op) => (
              <TabsTrigger
                key={op}
                value={op}
                className="h-full rounded-lg text-sm font-semibold"
              >
                {operators[op as Operator].name}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedPackage && (
            <div className="mt-4 flex items-center justify-between h-12">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{operators[selectedOperator].name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span>{selectedPackage.name}</span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSelectedPackage(null)}
              >
                Changer
              </Button>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className={cn("p-4", selectedPackage ? "hidden" : "block")}>
            <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-red-500/80 dark:text-red-500/90 rounded-xl p-4 flex items-start gap-3 mb-4">
              <AlertCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">
                  Suspension des services Celtiis
                </h3>
                <p className="text-xs">
                  Les opérations de recharge de crédit et d'achat de forfaits
                  pour l'opérateur Celtiis sont temporairement suspendues en
                  raison de problèmes techniques. Nous travaillons activement à
                  la résolution de ces problèmes et espérons rétablir les
                  services dès que possible. Nous nous excusons pour la gêne
                  occasionnée et vous remercions de votre compréhension.
                </p>
              </div>
            </div>
            {/* <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 text-primary/80 dark:text-primary/90 rounded-xl p-4 flex items-start gap-3 mb-4">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">
                  Paiement avec TapaarPoints ou Bonus
                </h3>
                <p className="text-sm">
                  Veuillez noter que les recharges de crédit et l'achat de
                  forfaits se font avec votre solde de TapaarPoints (TP) ou
                  votre solde Bonus.
                </p>
              </div>
            </div> */}

            <h3 className="font-semibold mb-3">Choisissez un forfait</h3>
            {Object.keys(operators).map((op) => (
              <TabsContent key={op} value={op} className="mt-0">
                <div className="grid grid-cols-3 gap-3">
                  {operators[op as Operator].packages.map((pkg) => (
                    <PackageCard
                      key={pkg.name}
                      name={pkg.name}
                      icon={pkg.icon}
                      isSelected={false} // never selected here
                      onSelect={() => handlePackageSelect(pkg)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>

          {(showCreditForm || showFixedPriceForm) && (
            <div className="px-4 pb-8 space-y-6 pt-4">
              {hasFavorites && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Numéros favoris</h3>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex w-max space-x-3 pb-3">
                      {favorites?.map((fav) => (
                        <FavoriteNumber
                          key={fav.id}
                          favorite={fav}
                          onClick={() => handleFavoriteSelect(fav)}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}

              {showFixedPriceForm && currentPrices.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">
                    Choisissez un montant (FCFA)
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {currentPrices.map((price) => (
                      <AmountButton
                        key={price}
                        amount={price}
                        isSelected={selectedFixedAmount === price}
                        onSelect={() => setSelectedFixedAmount(price)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label
                      htmlFor="phone-number"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Numéro de téléphone
                    </label>
                    <Input
                      id="phone-number"
                      type="tel"
                      placeholder="Ex: 0142... ou 0155..."
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className="mt-1"
                      maxLength={10}
                    />
                    {phoneWarning && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 mt-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <p>{phoneWarning}</p>
                      </div>
                    )}
                  </div>
                  {showCreditForm && (
                    <div>
                      <label
                        htmlFor="amount"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Montant (FCFA)
                      </label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Ex: 500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              <Button
                className="w-full font-bold text-lg"
                size="lg"
                onClick={handleProceed}
                disabled={Boolean(
                  !phoneNumber ||
                    phoneNumber.length < 10 ||
                    (showCreditForm && !amount) ||
                    (showFixedPriceForm && selectedFixedAmount === null)
                )}
              >
                Continuer
              </Button>
            </div>
          )}
        </main>
      </Tabs>
    </div>
  );
}
