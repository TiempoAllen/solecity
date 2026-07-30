"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { TiltCard } from "@/components/motion/TiltCard";
import { GlassBadge } from "@/components/ui/Glass";
import { StarIcon, PlusIcon } from "@/components/icons";
import { useCart } from "@/context/CartContext";
import { formatPHP } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <TiltCard className="group h-full" max={9}>
      <Link
        href={`/products/${product.slug}`}
        className="glass glass-specular block h-full overflow-hidden rounded-3xl p-4 transition-glass hover:-translate-y-1 hover:glow-ring"
      >
        {/* Artwork stage */}
        <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 opacity-70 transition-transform duration-700 group-hover:scale-110"
            style={{
              background: `radial-gradient(120% 100% at 30% 0%, ${product.gradient.from}55, transparent 60%), radial-gradient(120% 100% at 100% 100%, ${product.gradient.to}55, transparent 60%)`,
            }}
          />
          <span className="absolute left-3 top-3 z-10">
            <GlassBadge className="text-[11px]">
              {product.availability === "On Hand" ? "On Hand" : "Pre-Order"}
            </GlassBadge>
          </span>
          {product.originalPrice && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-[--color-brand] to-[--color-brand-2] px-2.5 py-1 text-[11px] font-bold text-white">
              SALE
            </span>
          )}
          <div className="absolute inset-0 grid place-items-center p-4 [transform:translateZ(40px)]">
            <ShoeArt
              seed={product.slug}
              from={product.gradient.from}
              to={product.gradient.to}
              accent={product.gradient.accent}
              className="drop-shadow-[0_20px_25px_rgba(0,0,0,0.45)] transition-transform duration-700 group-hover:-translate-y-1 group-hover:rotate-[-4deg]"
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
              {product.brand} · {product.category}
            </p>
            <h3 className="mt-1 truncate text-base font-bold text-white">{product.name}</h3>
            <p className="mt-0.5 text-xs text-muted">{product.colorway}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <StarIcon className="h-3.5 w-3.5 text-[--color-brand-3]" />
            {product.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white">{formatPHP(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-faint line-through">
                {formatPHP(product.originalPrice)}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={(e) => {
              e.preventDefault();
              add(product, product.sizes[Math.floor(product.sizes.length / 2)]);
            }}
            aria-label={`Quick add ${product.name}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[--color-brand] to-[--color-brand-2] text-white shadow-[0_8px_20px_-6px_var(--color-accent-glow)] transition-transform duration-300 hover:scale-110"
          >
            <PlusIcon className="h-5 w-5" />
          </motion.button>
        </div>
      </Link>
    </TiltCard>
  );
}
