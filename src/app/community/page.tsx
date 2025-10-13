"use client";

import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import {
  collection,
  doc,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  Users,
  UserPlus,
  Copy,
  Star,
  Network,
  Award,
  Gem,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MembershipProfile, Wallet as WalletType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDoc } from "@/firebase/firestore/use-doc";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
      <div className="p-3 bg-muted rounded-lg">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-bold text-xl">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

export default function CommunityPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [upgradeDetails, setUpgradeDetails] = useState<{
    plan: string;
    cost: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"tapaar-points" | "bonus">(
    "tapaar-points"
  );
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  const membershipDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "membership", "-profile-");
  }, [user, firestore]);

  const { data: membershipProfile, isLoading: isProfileLoading } =
    useDoc<MembershipProfile>(membershipDocRef);

  const topupWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-topup-");
  }, [user, firestore]);
  const { data: topupWallet } = useDoc<WalletType>(topupWalletRef);

  const bonusWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-bonus-");
  }, [user, firestore]);
  const { data: bonusWallet } = useDoc<WalletType>(bonusWalletRef);

  const affiliatesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users"),
      where("parrainUid", "==", user.uid)
    );
  }, [user, firestore]);

  const { data: affiliates, isLoading: isLoadingAffiliates } =
    useCollection<MembershipProfile>(affiliatesQuery);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Votre code de parrainage a été copié.",
    });
  };

  const handleShareToWhatsApp = (code: string) => {
    const text = encodeURIComponent(
      `Rejoins Tapaar et profite de nombreux services ! Utilise mon code de parrainage : ${code}`
    );
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const handleUpgradeConfirm = async () => {
    if (!upgradeDetails || !user || !membershipProfile) return;
    setIsUpgrading(true);

    const walletToUpdateRef = doc(
      firestore,
      "users",
      user.uid,
      "wallets",
      paymentMethod === "bonus" ? "-bonus-" : "-topup-"
    );
    const membershipRef = doc(
      firestore,
      "users",
      user.uid,
      "membership",
      "-profile-"
    );

    try {
      await runTransaction(firestore, async (transaction) => {
        const walletDoc = await transaction.get(walletToUpdateRef);
        const walletBalance = walletDoc.data()?.balance || 0;

        if (walletBalance < upgradeDetails.cost) {
          throw new Error("Solde insuffisant.");
        }

        const newBalance = walletBalance - upgradeDetails.cost;
        transaction.update(walletToUpdateRef, {
          balance: newBalance,
          updatedAt: serverTimestamp(),
        });

        const newPackName =
          upgradeDetails.plan === "Privilège"
            ? "pack_privilege"
            : "pack_etoile";

        transaction.update(membershipRef, {
          packName: newPackName,
          star: 0,
          level: 0, // Reset level on upgrade
          pack: newPackName.toLowerCase(),
          updatedAt: serverTimestamp(),
        });
      });

      toast({
        title: "Mise à niveau réussie !",
        description: `Votre compte est maintenant un compte ${upgradeDetails.plan}.`,
      });
    } catch (error: any) {
      toast({
        title: "Échec de la mise à niveau",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
      setUpgradeDetails(null);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || isLoadingAffiliates;

  if (isLoading || !membershipProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Chargement de la communauté...
        </p>
      </div>
    );
  }

  const currentPackName = membershipProfile.pack || "pack_basic";
  const isPrivilege = currentPackName.includes("privilege");
  const isEtoile = currentPackName.includes("etoile");

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-center gap-4 bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold">Ma Communauté</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <AlertDialog
          open={!!upgradeDetails}
          onOpenChange={(open) => !open && setUpgradeDetails(null)}
        >
          <div className="p-4 space-y-6">
            <Card className="rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-primary/10 p-6 flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  {membershipProfile.photoUrl && (
                    <AvatarImage
                      src={membershipProfile.photoUrl}
                      alt={membershipProfile.username}
                    />
                  )}
                  <AvatarFallback className="text-3xl bg-muted">
                    {membershipProfile.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">
                    @{membershipProfile.username}
                  </h2>
                  <p className="font-semibold text-primary">
                    {membershipProfile.packName.replace("Pack ", "Compte ")}
                  </p>
                </div>
              </div>
            </Card>

            {!isEtoile && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Faire évoluer votre compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!isPrivilege && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <h3 className="font-semibold text-primary">
                          Compte Privilège
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Passez au niveau supérieur.
                        </p>
                      </div>
                      <AlertDialogTrigger asChild>
                        <Button
                          onClick={() =>
                            setUpgradeDetails({
                              plan: "Privilège",
                              cost: 10000,
                            })
                          }
                        >
                          10 000 TP
                        </Button>
                      </AlertDialogTrigger>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <h3 className="font-semibold text-amber-500">
                        Compte Etoile
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Accédez à tous les avantages.
                      </p>
                    </div>
                    <AlertDialogTrigger asChild>
                      <Button
                        onClick={() =>
                          setUpgradeDetails({
                            plan: "Etoile",
                            cost: isPrivilege ? 10000 : 20000,
                          })
                        }
                      >
                        {isPrivilege ? "10 000 TP" : "20 000 TP"}
                      </Button>
                    </AlertDialogTrigger>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={Users}
                  label="Affiliés directs"
                  value={membershipProfile.directAffiliates}
                />
                <StatCard
                  icon={Network}
                  label="Total affiliés"
                  value={membershipProfile.affiliates}
                />
                <StatCard
                  icon={Award}
                  label="Niveau"
                  value={membershipProfile.level}
                />
                <StatCard
                  icon={Star}
                  label="Génération"
                  value={membershipProfile.generation}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Parrainage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Votre code de parrainage
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-grow p-3 bg-muted rounded-lg font-mono text-center tracking-widest">
                      {membershipProfile.referral}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleShareToWhatsApp(membershipProfile.referral)
                      }
                    >
                      <WhatsAppIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(membershipProfile.referral)}
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Votre parrain
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                    <p className="font-semibold">{membershipProfile.parrain}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {affiliates && affiliates.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Mes Affiliés Directs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {affiliates.map((affiliate) => (
                    <div
                      key={affiliate.uid}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-slate-800">
                          {affiliate.photoUrl && (
                            <AvatarImage
                              src={affiliate.photoUrl}
                              alt={affiliate.username}
                            />
                          )}
                          <AvatarFallback>
                            {affiliate.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            @{affiliate.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {affiliate.packName}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{affiliate.level}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la mise à niveau ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de passer au compte{" "}
                <span className="font-bold">{upgradeDetails?.plan}</span> pour{" "}
                <span className="font-bold">
                  {upgradeDetails?.cost.toLocaleString("fr-FR")}
                </span>{" "}
                TapaarPoints. Ce montant sera déduit de votre solde.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <RadioGroup
                defaultValue="tapaar-points"
                onValueChange={(value: any) => setPaymentMethod(value)}
              >
                <div className="flex items-center space-x-4 p-4 border rounded-lg has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                  <RadioGroupItem value="tapaar-points" id="tapaar-points" />
                  <Label
                    htmlFor="tapaar-points"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        <span className="font-semibold">TapaarPoints</span>
                      </div>
                      <span className="font-mono">
                        {topupWallet?.balance.toLocaleString("fr-FR") || 0} TP
                      </span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg has-[:checked]:bg-amber-500/5 has-[:checked]:border-amber-500">
                  <RadioGroupItem value="bonus" id="bonus" />
                  <Label htmlFor="bonus" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold">Solde Bonus</span>
                      </div>
                      <span className="font-mono">
                        {bonusWallet?.balance.toLocaleString("fr-FR") || 0} TP
                      </span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUpgradeConfirm}
                disabled={isUpgrading}
              >
                {isUpgrading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmer et Payer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <BottomNav />
    </div>
  );
}
