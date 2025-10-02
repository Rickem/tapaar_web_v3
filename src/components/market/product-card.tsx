"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const hasPromo = product.promo && product.promo < product.price;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col group",
        className
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={
            product.imgUrl?.[0]?.url ||
            "https://picsum.photos/seed/product/300/300"
          }
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          data-ai-hint="product image"
        />
        {product.condition && (
          <Badge
            className="absolute top-2 left-2"
            variant={product.condition === "Neuf" ? "default" : "secondary"}
          >
            {product.condition}
          </Badge>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-base leading-tight truncate flex-1">
          {product.name}
        </h3>

        <div className="mt-2">
          <p className="text-lg font-bold text-accent">
            {(hasPromo ? product.promo : product.price).toLocaleString("fr-FR")}{" "}
            FCFA
          </p>
          {hasPromo && (
            <p className="text-sm text-muted-foreground line-through">
              {product.price.toLocaleString("fr-FR")} FCFA
            </p>
          )}
        </div>

        <Button className="w-full mt-4" size="sm">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>
    </Card>
  );
}
