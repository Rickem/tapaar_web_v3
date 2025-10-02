"use client";

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  orderBy,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { ProductCard } from "@/components/market/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRODUCTS_PER_PAGE = 10;

export default function MarketPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

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

  const fetchProducts = useCallback(
    async (
      lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null
    ) => {
      if (!user) return;

      if (lastVisibleDoc === null) {
        setIsLoadingAll(true);
      } else {
        setIsLoadingMore(true);
      }

      let q = query(
        collection(firestore, "products"),
        orderBy("createdAt", "desc"),
        limit(PRODUCTS_PER_PAGE)
      );

      if (lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      try {
        const querySnapshot = await getDocs(q);
        const newProducts = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Product)
        );

        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setAllProducts((prev) =>
          lastVisibleDoc ? [...prev, ...newProducts] : newProducts
        );
        setHasMore(newProducts.length === PRODUCTS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoadingAll(false);
        setIsLoadingMore(false);
      }
    },
    [user, firestore]
  );

  useEffect(() => {
    if (user && !isUserLoading) {
      fetchProducts();
    }
  }, [user, isUserLoading, fetchProducts]);

  const isLoading = isUserLoading || isLoadingFeatured || isLoadingAll;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement du marché...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Rechercher un produit..." className="pl-10" />
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <ShoppingBag className="h-6 w-6" />
          <span className="sr-only">Panier</span>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-8">
          {featuredProducts && featuredProducts.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Produits à la une</h2>
              <div className="grid grid-cols-2 gap-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold mb-4">Tous les produits</h2>
            {allProducts.length === 0 && !isLoadingAll ? (
              <div className="flex flex-col items-center justify-center text-center h-40 gap-4">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">
                  Aucun produit disponible
                </h3>
                <p className="text-muted-foreground max-w-xs text-sm">
                  Revenez plus tard pour découvrir nos offres.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {allProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center pt-8">
                    <Button
                      onClick={() => fetchProducts(lastDoc)}
                      disabled={isLoadingMore}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {isLoadingMore ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Charger plus"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
