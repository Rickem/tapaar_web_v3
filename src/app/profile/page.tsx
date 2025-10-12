"use client";

import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useAuth,
} from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Phone,
  AtSign,
  MapPin,
  Gem,
  BarChart,
  DollarSign,
  History,
  Edit,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserProfile, Shareholder, SharePhase } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { SharePhaseCard } from "@/components/profile/share-phase-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
  isEditing,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined | number;
  isEditing?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <Icon className="h-5 w-5 text-muted-foreground mt-2" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {isEditing ? (
          <Input value={value as string} onChange={onChange} className="mt-1" />
        ) : (
          <p className="font-medium">{value || "Non renseigné"}</p>
        )}
      </div>
    </div>
  );
}

function ShareInfoRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-lg">
        {value.toLocaleString("fr-FR")}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {unit}
        </span>
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<{
    phone: string;
    address: string;
  } | null>(null);

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

  useEffect(() => {
    if (userProfile) {
      setEditedProfile({
        phone: userProfile.phone || "",
        address: userProfile.address || "",
      });
    }
  }, [userProfile]);

  const shareholderDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "shareholders", user.uid);
  }, [user, firestore]);
  const { data: shareholderInfo, isLoading: isShareholderLoading } =
    useDoc<Shareholder>(shareholderDocRef);

  // Fetch share phases
  const phase1Ref = useMemoFirebase(
    () =>
      shareholderInfo &&
      doc(firestore, "shareholders", user!.uid, "phases", "-phase1-"),
    [shareholderInfo, firestore, user]
  );
  const phase2Ref = useMemoFirebase(
    () =>
      shareholderInfo &&
      doc(firestore, "shareholders", user!.uid, "phases", "-phase2-"),
    [shareholderInfo, firestore, user]
  );
  const phase3Ref = useMemoFirebase(
    () =>
      shareholderInfo &&
      doc(firestore, "shareholders", user!.uid, "phases", "-phase3-"),
    [shareholderInfo, firestore, user]
  );
  const phase4Ref = useMemoFirebase(
    () =>
      shareholderInfo &&
      doc(firestore, "shareholders", user!.uid, "phases", "-phase4-"),
    [shareholderInfo, firestore, user]
  );
  const phase5Ref = useMemoFirebase(
    () =>
      shareholderInfo &&
      doc(firestore, "shareholders", user!.uid, "phases", "-phase5-"),
    [shareholderInfo, firestore, user]
  );

  const { data: phase1Data, isLoading: isLoadingP1 } =
    useDoc<SharePhase>(phase1Ref);
  const { data: phase2Data, isLoading: isLoadingP2 } =
    useDoc<SharePhase>(phase2Ref);
  const { data: phase3Data, isLoading: isLoadingP3 } =
    useDoc<SharePhase>(phase3Ref);
  const { data: phase4Data, isLoading: isLoadingP4 } =
    useDoc<SharePhase>(phase4Ref);
  const { data: phase5Data, isLoading: isLoadingP5 } =
    useDoc<SharePhase>(phase5Ref);

  const sharePhases = [
    { name: "Phase 1", data: phase1Data },
    { name: "Phase 2", data: phase2Data },
    { name: "Phase 3", data: phase3Data },
    { name: "Phase 4", data: phase4Data },
    { name: "Phase 5", data: phase5Data },
  ].filter((p) => p.data);

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

  const handleSave = async () => {
    if (!user || !editedProfile) return;
    setIsSaving(true);
    try {
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        phone: editedProfile.phone,
        address: editedProfile.address,
      });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (userProfile) {
      setEditedProfile({
        phone: userProfile.phone || "",
        address: userProfile.address || "",
      });
    }
  };

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "phone" | "address"
  ) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, [field]: e.target.value });
    }
  };

  const isLoading =
    isUserLoading ||
    isProfileLoading ||
    isShareholderLoading ||
    isLoadingP1 ||
    isLoadingP2 ||
    isLoadingP3 ||
    isLoadingP4 ||
    isLoadingP5;

  if (isLoading || !userProfile || !editedProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
      </div>
    );
  }

  const totalShares =
    (shareholderInfo?.purchased || 0) + (shareholderInfo?.bonus || 0);
  const dividendValue = (shareholderInfo?.royalties || 0) * 1000;

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
        <h1 className="text-lg font-semibold">Mon Compte</h1>
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

      <main className="flex-1 overflow-y-auto pb-8">
        <div className="p-4 space-y-6">
          <Card className="rounded-2xl border-none shadow-none">
            <CardContent className="p-0 flex flex-col items-center gap-4">
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

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              {shareholderInfo && (
                <TabsTrigger value="shares">Mes Parts</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="mt-6 space-y-6">
              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Informations Personnelles
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <ProfileInfoRow
                    icon={Mail}
                    label="Adresse e-mail"
                    value={userProfile.email}
                  />
                  <ProfileInfoRow
                    icon={Phone}
                    label="Téléphone"
                    value={editedProfile.phone}
                    isEditing={isEditing}
                    onChange={(e) => handleProfileChange(e, "phone")}
                  />
                  <ProfileInfoRow
                    icon={MapPin}
                    label="Adresse"
                    value={editedProfile.address}
                    isEditing={isEditing}
                    onChange={(e) => handleProfileChange(e, "address")}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AtSign className="h-5 w-5" />
                    Parrainage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ProfileInfoRow
                    icon={User}
                    label="Votre parrain"
                    value={userProfile.parrain}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {shareholderInfo && (
              <TabsContent value="shares" className="mt-6 space-y-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart className="h-5 w-5" />
                      Informations sur les Parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ShareInfoRow
                      label="Parts achetées"
                      value={shareholderInfo.purchased || 0}
                      unit="Parts"
                    />
                    <ShareInfoRow
                      label="Parts bonus"
                      value={shareholderInfo.bonus || 0}
                      unit="Parts"
                    />
                    <div className="border-t my-2"></div>
                    <ShareInfoRow
                      label="Total des parts"
                      value={totalShares}
                      unit="Parts"
                    />
                    <ShareInfoRow
                      label="Valeur totale"
                      value={shareholderInfo.totalValue || 0}
                      unit="FCFA"
                    />
                    <div className="border-t my-2"></div>
                    <ShareInfoRow
                      label="Total dividendes"
                      value={dividendValue}
                      unit="FCFA"
                    />
                  </CardContent>
                </Card>

                {sharePhases.length > 0 && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="h-5 w-5" />
                        Historique des Parts par Phase
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sharePhases.map((phase) => (
                        <SharePhaseCard
                          key={phase.name}
                          name={phase.name}
                          data={phase.data}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
          <div className="pt-4">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
