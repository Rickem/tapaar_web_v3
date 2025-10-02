"use client";

import { useUser, useFirestore, useMemoFirebase, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Loader2,
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Phone,
  AtSign,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useDoc } from "@/firebase/firestore/use-doc";

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "Non renseigné"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Déconnexion réussie", description: "À bientôt !" });
      router.replace("/login");
    } catch (error) {
      toast({
        title: "Erreur de déconnexion",
        description: "Impossible de se déconnecter pour le moment.",
        variant: "destructive",
      });
    }
  };

  if (isUserLoading || isProfileLoading || !userProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold">Mon Profil</h1>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Déconnexion</span>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <Card className="rounded-2xl">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                {userProfile.photoUrl && (
                  <AvatarImage
                    src={userProfile.photoUrl}
                    alt={userProfile.name}
                  />
                )}
                <AvatarFallback className="text-3xl bg-muted">
                  {userProfile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                <p className="text-muted-foreground">@{userProfile.username}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-semibold text-lg mb-2">
                Informations Personnelles
              </h3>
              <ProfileInfoRow
                icon={Mail}
                label="Adresse e-mail"
                value={userProfile.email}
              />
              <ProfileInfoRow
                icon={Phone}
                label="Téléphone"
                value={userProfile.phone}
              />
              <ProfileInfoRow
                icon={MapPin}
                label="Adresse"
                value={userProfile.address}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-semibold text-lg mb-2">Parrainage</h3>
              <ProfileInfoRow
                icon={User}
                label="Votre parrain"
                value={userProfile.parrain}
              />
              <ProfileInfoRow
                icon={AtSign}
                label="Votre code de parrainage"
                value="N/A"
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </main>
    </div>
  );
}
