import Link from "next/link";
import { getFeatured } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ArrowIcon } from "@/components/icons";

export function FeaturedProducts() {
  const featured = getFeatured();

  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[--color-brand-3]">
            Hand-picked heat
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Featured pairs</h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-white"
        >
          View all
          <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Reveal>

      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((product) => (
          <StaggerItem key={product.slug} className="h-full">
            <ProductCard product={product} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
