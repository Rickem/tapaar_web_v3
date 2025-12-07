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
import Link from "next/link";
import { GoogleSignInButton } from "./google-signin-button";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  setDoc,
} from "firebase/firestore";
import { debounce } from "lodash";
import type { MembershipProfile } from "@/lib/types";
// import { sendOtp } from "@/ai/flows/send-otp-flow";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  username: z
    .string()
    .min(3, {
      message: "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        "Le nom d'utilisateur ne peut contenir que des lettres, des chiffres et des underscores.",
    }),
  email: z.string().email({ message: "Adresse email invalide." }),
  phone: z.string().min(8, { message: "Numéro de téléphone invalide." }),
  address: z
    .string()
    .min(5, { message: "L'adresse doit contenir au moins 5 caractères." }),
  password: z.string().min(6, {
    message: "Le mot de passe doit contenir au moins 6 caractères.",
  }),
  referralCode: z.string().optional(),
});

type ReferrerData = {
  uid: string;
  username: string;
  referral: string;
  generation: number;
};

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referral = searchParams.get("ref");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [usernameMessage, setUsernameMessage] = useState("");

  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState<boolean | null>(null);
  const [referralMessage, setReferralMessage] = useState("");
  const [referrerData, setReferrerData] = useState<ReferrerData | null>(null);

  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      username: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      referralCode: referral || "",
    },
  });

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (username.length < 3) {
        setIsUsernameAvailable(null);
        setUsernameMessage("");
        return;
      }
      setIsCheckingUsername(true);
      try {
        const usernameRef = doc(firestore, "usernames", username);
        const docSnap = await getDoc(usernameRef);

        if (docSnap.exists()) {
          setIsUsernameAvailable(false);
          setUsernameMessage("Ce nom d'utilisateur est déjà pris.");
        } else {
          setIsUsernameAvailable(true);
          setUsernameMessage("Ce nom d'utilisateur est disponible.");
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setIsUsernameAvailable(false);
        setUsernameMessage("Erreur lors de la vérification.");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500),
    [firestore]
  );

  const checkReferralCode = useCallback(
    debounce(async (code: string) => {
      if (!code) {
        setIsReferralValid(null);
        setReferralMessage("");
        setReferrerData(null);
        return;
      }
      setIsCheckingReferral(true);
      try {
        const q = query(
          collection(firestore, "referrals"),
          where("referral", "==", code),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          const data = referrerDoc.data() as {
            uid: string;
            username: string;
            referral: string;
            generation: number;
          };
          setIsReferralValid(true);
          setReferralMessage(`Parrain trouvé : ${data.username}`);
          setReferrerData({
            uid: referrerDoc.id, // The document ID is the user ID
            username: data.username,
            referral: data.referral,
            generation: data.generation,
          });
        } else {
          setIsReferralValid(false);
          setReferralMessage("Code de parrainage invalide.");
          setReferrerData(null);
        }
      } catch (error) {
        console.error("Error checking referral code:", error);
        setIsReferralValid(false);
        setReferralMessage("Erreur lors de la vérification du code.");
        setReferrerData(null);
      } finally {
        setIsCheckingReferral(false);
      }
    }, 500),
    [firestore]
  );

  const usernameValue = form.watch("username");
  const referralCodeValue = form.watch("referralCode");

  useEffect(() => {
    if (usernameValue) {
      checkUsernameAvailability(usernameValue);
    }
  }, [usernameValue, checkUsernameAvailability]);

  useEffect(() => {
    if (referralCodeValue) {
      checkReferralCode(referralCodeValue);
    } else {
      // Clear referral status if field is empty
      setIsReferralValid(null);
      setReferralMessage("");
      setReferrerData(null);
    }
  }, [referralCodeValue, checkReferralCode]);

  useEffect(() => {
    if (referral) {
      form.setValue("referralCode", referral);
    }
  }, [referral, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isUsernameAvailable === false) {
      toast({
        title: "Nom d'utilisateur invalide",
        description: "Veuillez choisir un autre nom d'utilisateur.",
        variant: "destructive",
      });
      return;
    }
    if (values.referralCode && !isReferralValid) {
      toast({
        title: "Code de parrainage invalide",
        description: "Veuillez vérifier le code ou le laisser vide.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      if (user) {
        // Send OTP email
        // const { otp } = await sendOtp({
        //   email: values.email,
        //   username: values.name,
        // });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await updateProfile(user, {
          displayName: values.name,
          photoURL: `https://picsum.photos/seed/${user.uid}/100/100`,
        });

        const usernameRef = doc(firestore, "usernames", values.username);
        setDocumentNonBlocking(usernameRef, {
          uid: user.uid,
          email: user.email,
        });

        const userRef = doc(firestore, "users", user.uid);
        const userData = {
          uid: user.uid,
          name: values.name,
          username: values.username,
          email: values.email,
          phone: values.phone,
          address: values.address,
          photoUrl: user.photoURL,
          createdAt: serverTimestamp(),
          country: "",
          city: "",
          devicetoken: "",
          isActive: false,
          isLoggedIn: true,
          isMember: false,
          emailVerified: false,
          parrain: referrerData?.username || "tapaar",
          parrainGen: referrerData ? referrerData.generation : 0,
          parrainRef: referrerData?.referral || "tapaar",
          parrainUid: referrerData?.uid || "tapaar",
          code: otp,
        };
        setDocumentNonBlocking(userRef, userData, { merge: true });

        const topupWalletRef = doc(userRef, "wallets", "-topup-");
        setDocumentNonBlocking(topupWalletRef, {
          balance: 0,
          type: "tapaarpay_wallet",
          updatedAt: serverTimestamp(),
        });

        const bonusWalletRef = doc(userRef, "wallets", "-bonus-");
        setDocumentNonBlocking(bonusWalletRef, {
          balance: 0,
          type: "bonus_wallet",
          updatedAt: serverTimestamp(),
        });

        const coinsWalletRef = doc(userRef, "wallets", "-coins-");
        setDocumentNonBlocking(coinsWalletRef, {
          balance: 0,
          type: "coins_wallet",
          updatedAt: serverTimestamp(),
        });

        const membershipProfileRef = doc(userRef, "membership", "-profile-");

        const newReferralCode = `${values.username
          .substring(0, 3)
          .toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

        const referralRef = doc(firestore, "referrals", user.uid);
        const referralData = {
          createdAt: serverTimestamp(),
          generation: referrerData ? referrerData.generation + 1 : 0,
          referral: newReferralCode,
          username: values.username,
          uid: user.uid,
        };
        setDocumentNonBlocking(referralRef, referralData);

        let grandParrain = "";
        let greatParrain = "";
        let userGeneration = 0;
        let grandParrainRef = "";
        let grandParrainUid = "";
        let greatParrainRef = "";
        let greatParrainUid = "";

        if (referrerData) {
          userGeneration = referrerData.generation + 1;
          if (userGeneration === 1) {
            grandParrain = "";
            greatParrain = "";
          } else if (userGeneration === 2) {
            grandParrain = "tapaar";
            grandParrainRef = "tapaar";
            grandParrainUid = "tapaar";
            greatParrain = "";
          } else if (userGeneration >= 3) {
            const { grandParrain: refGrandParrain, parrain: refParrain } =
              await getDoc(
                doc(firestore, "membership", referrerData.uid, "-profile-")
              ).then((d) => d.data() as MembershipProfile);
            grandParrain = refParrain || "tapaar";
            grandParrainRef = "tapaar";
            grandParrainUid = "tapaar";
            greatParrain = refGrandParrain || "tapaar";
            greatParrainRef = "tapaar";
            greatParrainUid = "tapaar";
          }
        }

        const membershipData: MembershipProfile = {
          uid: user.uid,
          username: values.username,
          photoUrl: user.photoURL || "",
          referral: newReferralCode,
          affiliates: 0,
          directAffiliates: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          generation: userGeneration,
          level: 0,
          pack: "basic",
          star: 0,
          packName: "Gratuit",
          parrain: referrerData?.username || "tapaar",
          parrainRef: referrerData?.referral || "tapaar",
          parrainUid: referrerData?.uid || "tapaar",
          parrainGen: referrerData ? referrerData.generation : 0,
          grandParrain: grandParrain || "tapaar",
          grandParrainRef:
            grandParrain === "tapaar" ? "tapaar" : grandParrainRef,
          grandParrainUid:
            grandParrain === "tapaar" ? "tapaar" : grandParrainUid,
          greatParrain: greatParrain || "",
          greatParrainRef:
            greatParrain === "tapaar" ? "tapaar" : greatParrainRef,
          greatParrainUid:
            greatParrain === "tapaar" ? "tapaar" : greatParrainUid,
        };
        setDocumentNonBlocking(membershipProfileRef, membershipData);
      }

      router.push("/verify-otp");
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description:
          error.message || "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Créer un compte
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Rejoignez l'univers Tapaar dès maintenant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="johndoe99" {...field} />
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 flex items-center justify-center">
                        {isCheckingUsername ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : isUsernameAvailable === true ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : isUsernameAvailable === false ? (
                          <XCircle size={16} className="text-destructive" />
                        ) : null}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage>
                    {usernameMessage || form.formState.errors.username?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="votre@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+229 97000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Rue de Cotonou" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code de parrainage (Optionnel)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="PARRAIN123" {...field} />
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 flex items-center justify-center">
                        {isCheckingReferral ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : isReferralValid === true ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : isReferralValid === false ? (
                          <XCircle size={16} className="text-destructive" />
                        ) : null}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage>
                    {referralMessage ||
                      form.formState.errors.referralCode?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={
                isLoading ||
                isCheckingUsername ||
                isUsernameAvailable === false ||
                (!!referralCodeValue && !isReferralValid)
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              S'inscrire
            </Button>
          </form>
        </Form>
        {/* <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou s'inscrire avec
            </span>
          </div>
        </div>
        <GoogleSignInButton /> */}
        <div className="mt-4 text-center text-sm">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="underline font-bold text-primary hover:text-primary/90"
          >
            Connectez-vous
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
