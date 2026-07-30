import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeatured } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

export async function FeaturedProducts() {
  const featured = await getFeatured();

  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hand-picked heat</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Featured pairs</h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>

      <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((product) => (
          <StaggerItem key={product.slug} className="h-full">
            <ProductCard product={product} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
