import Link from "next/link";
import { ArrowRight, Shield, Truck, Zap } from "lucide-react";
import { ShoeArt } from "@/components/ShoeArt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { getFeatured } from "@/lib/products";

export function Hero() {
  const hero = getFeatured()[0];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <Badge variant="secondary" className="gap-1.5">
            <Zap className="size-3.5" /> Est. 2023 · Cebu City
          </Badge>

          <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Step into
            <br />
            the SOLECITY
          </h1>

          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Authentic ANTA, Under Armour, basketball shoes &amp; clogs — hand-picked, verified
            legit, and shipped nationwide from Cebu.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/products" className={cn(buttonVariants({ size: "lg" }))}>
              Shop the collection
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/products?category=Basketball"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Basketball drops
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Shield className="size-4" /> 100% Authentic
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4" /> Nationwide shipping
            </li>
            <li className="flex items-center gap-2">
              <Zap className="size-4" /> Pre-order pairs weekly
            </li>
          </ul>
        </Reveal>

        {/* Showpiece */}
        <div className="relative">
          <Card className="relative aspect-square gap-0 overflow-hidden bg-muted p-8">
            <div className="grid h-full place-items-center">
              <ShoeArt
                seed="hero"
                from={hero.gradient.from}
                to={hero.gradient.to}
                accent={hero.gradient.accent}
                float
              />
            </div>
            <div className="absolute bottom-6 left-6 rounded-lg border bg-background/80 px-4 py-3 backdrop-blur">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Featured</p>
              <p className="text-sm font-semibold">{hero.name}</p>
            </div>
            <div className="absolute top-6 right-6 rounded-lg border bg-background/80 px-4 py-3 text-center backdrop-blur">
              <p className="text-lg font-bold">4.9★</p>
              <p className="text-[11px] text-muted-foreground">Rated by buyers</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
