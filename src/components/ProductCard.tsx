"use client";

import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { formatPHP } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <Card className="group/card h-full gap-0 py-0 transition-colors hover:ring-foreground/20">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            <Badge variant="secondary">
              {product.availability === "On Hand" ? "On Hand" : "Pre-Order"}
            </Badge>
            {product.originalPrice && <Badge>Sale</Badge>}
          </div>
          <div className="absolute inset-0 grid place-items-center p-6">
            <ShoeArt
              seed={product.slug}
              from={product.gradient.from}
              to={product.gradient.to}
              accent={product.gradient.accent}
              className="transition-transform duration-500 group-hover/card:-translate-y-1"
            />
          </div>
        </div>
      </Link>

      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {product.brand} · {product.category}
            </p>
            <Link href={`/products/${product.slug}`}>
              <h3 className="mt-1 truncate text-base font-semibold hover:underline">
                {product.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.colorway}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-current" />
            {product.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatPHP(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPHP(product.originalPrice)}
              </span>
            )}
          </div>
          <Button
            size="icon"
            aria-label={`Quick add ${product.name}`}
            onClick={() => {
              const size = product.sizes[Math.floor(product.sizes.length / 2)];
              add(product, size);
              toast.success("Added to bag", {
                description: `${product.name} · US ${size}`,
              });
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
