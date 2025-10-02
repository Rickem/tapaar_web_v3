"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { sendOtp } from "@/ai/flows/send-otp-flow";
import type { UserProfile } from "@/lib/types";

const formSchema = z.object({
  otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres." }),
});

export default function VerifyOtpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    } else if (user) {
      const fetchUserProfile = async () => {
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      };
      fetchUserProfile();
    }
  }, [user, isUserLoading, router, firestore]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Utilisateur non trouvé.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.code === values.otp) {
          // OTP is correct
          await updateDoc(userRef, {
            emailVerified: true,
            isActive: true,
            code: "", // Clear the OTP
          });

          toast({
            title: "Vérification réussie !",
            description: "Votre compte est maintenant actif. Bienvenue !",
            variant: "success",
          });

          router.push("/dashboard");
        } else {
          // OTP is incorrect
          toast({
            title: "Code invalide",
            description:
              "Le code que vous avez entré est incorrect. Veuillez réessayer.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Profil utilisateur introuvable.");
      }
    } catch (error: any) {
      toast({
        title: "Erreur de vérification",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleResendOtp = async () => {
    if (!user || !user.email || !userProfile?.name) {
      toast({
        title: "Erreur",
        description:
          "Impossible de renvoyer le code. Données utilisateur manquantes.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { otp } = await sendOtp({
        email: user.email,
        username: userProfile.name,
      });
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, { code: otp });

      toast({
        title: "Code renvoyé !",
        description: "Un nouveau code a été envoyé à votre adresse e-mail.",
      });
    } catch (error) {
      console.error("Erreur lors du renvoi du code :", error);
      toast({
        title: "Erreur",
        description: "Impossible de renvoyer le code pour le moment.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Vérifier votre e-mail
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Nous avons envoyé un code à 6 chiffres à {user?.email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-center block">
                    Code de vérification
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456"
                      {...field}
                      className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading || isUserLoading}
            >
              {(isLoading || isUserLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vérifier le compte
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          <p className="text-muted-foreground">
            Vous n'avez pas reçu de code ?
          </p>
          <Button
            variant="link"
            className="font-bold text-primary p-0 h-auto mt-1"
            onClick={handleResendOtp}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Renvoyer le code"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
