"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function GoogleSignInButton() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      let errorMessage =
        "Une erreur est survenue lors de la connexion avec Google.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "La fenêtre de connexion a été fermée.";
      }
      toast({
        title: "Erreur de connexion Google",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
      <svg
        className="mr-2 h-4 w-4"
        aria-hidden="true"
        focusable="false"
        data-prefix="fab"
        data-icon="google"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 488 512"
      >
        <path
          fill="currentColor"
          d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.5 109.8 8 244 8c66.8 0 126 25.4 170.2 66.8l-68.5 68.5c-20.5-18.4-47.8-30.8-79.7-30.8-62.3 0-113.5 51.2-113.5 114.3s51.2 114.3 113.5 114.3c71.3 0 98.5-49.8 102-76.3H244v-91.4h236.4c4.6 24.5 7.6 50.8 7.6 78.6z"
        ></path>
      </svg>
      Google
    </Button>
  );
}
