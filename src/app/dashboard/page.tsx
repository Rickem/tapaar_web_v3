"use client";

import { doc, collection, query, where, limit } from "firebase/firestore";
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import type { UserProfile, Wallet, Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PointsCarousel } from "@/components/dashboard/points-carousel";
import { FeaturedProducts } from "@/components/dashboard/featured-products";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import Link from "next/link";
import { useDoc } from "@/firebase/firestore/use-doc";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isUserProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const topupWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-topup-");
  }, [user, firestore]);

  const { data: topupWallet, isLoading: isTopupWalletLoading } =
    useDoc<Wallet>(topupWalletRef);

  const bonusWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-bonus-");
  }, [user, firestore]);

  const { data: bonusWallet, isLoading: isBonusWalletLoading } =
    useDoc<Wallet>(bonusWalletRef);

  const featuredProductsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "products"),
        where("featured", "==", true),
        limit(4)
      ),
    [firestore]
  );
  const { data: featuredProducts, isLoading: isLoadingFeatured } =
    useCollection<Product>(featuredProductsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isUserProfileLoading && userProfile) {
      if (userProfile.emailVerified === false) {
        router.replace("/verify-otp");
      } else {
        setIsProfileLoading(false);
      }
    } else if (!isUserLoading && !user) {
      // If user is not loading and there's no user, it's handled above
    } else if (!isUserProfileLoading && !userProfile && !isUserLoading) {
      const timer = setTimeout(() => {
        if (!userProfile) {
          router.replace("/login");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userProfile, isUserProfileLoading, isUserLoading, router]);

  const isLoading =
    isUserLoading ||
    isProfileLoading ||
    isTopupWalletLoading ||
    isBonusWalletLoading ||
    isLoadingFeatured;

  if (isLoading || !user || !userProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Chargement de votre espace...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <DashboardHeader username={userProfile.name} />
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-6">
          <div className="relative mb-8">
            <BalanceCard
              topupBalance={topupWallet?.balance ?? 0}
              bonusBalance={bonusWallet?.balance ?? 0}
            />
            <div className="absolute -bottom-4 w-full flex justify-center">
              <Link href="/coupons" className="w-4/5">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg shadow-lg rounded-full">
                  <PlusCircle className="mr-2 h-6 w-6" />
                  Recharger
                </Button>
              </Link>
            </div>
          </div>
          <PointsCarousel />
          {featuredProducts && featuredProducts.length > 0 && (
            <FeaturedProducts products={featuredProducts} />
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
