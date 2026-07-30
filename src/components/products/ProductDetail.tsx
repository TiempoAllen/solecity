"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Shield, Star, Truck, Zap } from "lucide-react";
import type { Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useCart } from "@/context/CartContext";
import { formatPHP } from "@/lib/utils";

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { add } = useCart();
  const [size, setSize] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  function handleAdd() {
    if (size === null) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    add(product, size);
    toast.success("Added to bag", { description: `${product.name} · US ${size}` });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/products" />}>Shop</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="relative aspect-square gap-0 overflow-hidden bg-muted p-10">
            <div className="grid h-full place-items-center">
              <ShoeArt
                seed={`detail-${product.slug}`}
                from={product.gradient.from}
                to={product.gradient.to}
                accent={product.gradient.accent}
                float
              />
            </div>
            {product.originalPrice && (
              <Badge className="absolute top-4 right-4">
                Save {formatPHP(product.originalPrice - product.price)}
              </Badge>
            )}
          </Card>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {["Side", "Top", "Sole"].map((view, i) => (
              <Card
                key={view}
                className="relative grid aspect-square place-items-center gap-0 overflow-hidden bg-muted p-4"
              >
                <ShoeArt
                  seed={`thumb-${product.slug}-${i}`}
                  from={product.gradient.from}
                  to={product.gradient.to}
                  accent={product.gradient.accent}
                  className="scale-90"
                />
                <span className="absolute right-2 bottom-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {view}
                </span>
              </Card>
            ))}
          </div>
        </div>

        {/* Info */}
        <Stagger className="space-y-5">
          <StaggerItem>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{product.availability}</Badge>
              {product.authentic && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="size-3.5" /> Authentic
                </Badge>
              )}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-4 fill-current" />
                {product.rating.toFixed(1)}
                <span>({product.reviews})</span>
              </span>
            </div>
          </StaggerItem>

          <StaggerItem>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {product.brand} · {product.category}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-2 text-muted-foreground">{product.colorway}</p>
          </StaggerItem>

          <StaggerItem>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatPHP(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPHP(product.originalPrice)}
                </span>
              )}
            </div>
          </StaggerItem>

          <StaggerItem>
            <p className="max-w-lg leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </StaggerItem>

          <StaggerItem>
            <Separator />
          </StaggerItem>

          {/* Size selector */}
          <StaggerItem>
            <motion.div
              animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
              transition={{ duration: 0.45 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Select size (US)</p>
                {size === null && shake && (
                  <span className="text-xs text-destructive">Pick a size first</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <Button
                    key={s}
                    variant={size === s ? "default" : "outline"}
                    size="sm"
                    className="w-14"
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </motion.div>
          </StaggerItem>

          {/* Add to cart */}
          <StaggerItem>
            <Button size="lg" className="w-full" onClick={handleAdd}>
              Add to bag · {formatPHP(product.price)}
            </Button>
          </StaggerItem>

          {/* Assurances */}
          <StaggerItem>
            <ul className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield, label: "100% Authentic" },
                { icon: Truck, label: "Ships nationwide" },
                { icon: Zap, label: "Secure checkout" },
              ].map((a) => (
                <li
                  key={a.label}
                  className="flex items-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium text-muted-foreground"
                >
                  <a.icon className="size-4 shrink-0" />
                  {a.label}
                </li>
              ))}
            </ul>
          </StaggerItem>
        </Stagger>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">You may also like</h2>
          </Reveal>
          <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <StaggerItem key={p.slug} className="h-full">
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-10 text-center">
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to all pairs
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </section>
      )}
    </div>
  );
}
