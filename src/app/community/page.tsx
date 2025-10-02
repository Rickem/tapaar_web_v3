"use client";

import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MembershipProfile } from "@/lib/types";
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

export default function CommunityPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [upgradeDetails, setUpgradeDetails] = useState<{
    plan: string;
    cost: number;
  } | null>(null);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Votre code de parrainage a été copié.",
    });
  };

  const handleUpgradeConfirm = () => {
    if (!upgradeDetails) return;
    console.log(
      `Upgrading to ${upgradeDetails.plan} for ${upgradeDetails.cost} TP`
    );
    // TODO: Implement actual upgrade logic (deduct points, update profile)
    toast({
      title: "Mise à niveau en cours...",
      description: `Votre passage au plan ${upgradeDetails.plan} est en cours de traitement.`,
    });
    setUpgradeDetails(null);
  };

  if (isUserLoading || isProfileLoading || !membershipProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Chargement de la communauté...
        </p>
      </div>
    );
  }

  const currentPackName =
    membershipProfile.packName?.toLowerCase() || "gratuit";
  const isPrivilege = currentPackName.includes("privilège");
  const isEtoile =
    currentPackName.includes("etoile") || currentPackName.includes("étoile");

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
                    {membershipProfile.packName}
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
                        {isPrivilege ? 10000 : 20000} TP
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
          </div>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la mise à niveau ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de passer au plan{" "}
                <span className="font-bold">{upgradeDetails?.plan}</span> pour{" "}
                <span className="font-bold">
                  {upgradeDetails?.cost.toLocaleString("fr-FR")}
                </span>{" "}
                TapaarPoints. Ce montant sera déduit de votre solde.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpgradeConfirm}>
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
