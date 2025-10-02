"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isUserLoading, router]);

  // You can show a loading indicator here while checking auth status
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Optional: Add a spinner or loading text */}
    </div>
  );
}
