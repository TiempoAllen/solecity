"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { ProductCard } from "@/components/ProductCard";
import { GlassBadge } from "@/components/ui/Glass";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import {
  StarIcon,
  ShieldIcon,
  TruckIcon,
  BoltIcon,
  CheckIcon,
  ArrowIcon,
} from "@/components/icons";
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
  const [added, setAdded] = useState(false);
  const [shake, setShake] = useState(false);

  function handleAdd() {
    if (size === null) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    add(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 sm:px-6 sm:pt-36">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 flex items-center gap-2 text-sm text-faint"
      >
        <Link href="/" className="transition-colors hover:text-white">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="transition-colors hover:text-white">
          Shop
        </Link>
        <span>/</span>
        <span className="text-muted">{product.name}</span>
      </motion.nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <div className="glass-strong glass-specular relative aspect-square overflow-hidden rounded-[2.5rem] p-10">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 120% at 30% 15%, ${product.gradient.from}55, transparent 55%), radial-gradient(120% 120% at 85% 90%, ${product.gradient.to}55, transparent 55%)`,
              }}
            />
            <div className="relative grid h-full place-items-center">
              <ShoeArt
                seed={`detail-${product.slug}`}
                from={product.gradient.from}
                to={product.gradient.to}
                accent={product.gradient.accent}
                float
                className="drop-shadow-[0_35px_45px_rgba(0,0,0,0.55)]"
              />
            </div>
            {product.originalPrice && (
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-[--color-brand] to-[--color-brand-2] px-3 py-1.5 text-xs font-bold text-white">
                SAVE {formatPHP(product.originalPrice - product.price)}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {["Side", "Top", "Sole"].map((view, i) => (
              <div
                key={view}
                className="glass relative grid aspect-square place-items-center overflow-hidden rounded-2xl"
              >
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${product.gradient.from}33, ${product.gradient.to}33)`,
                  }}
                />
                <ShoeArt
                  seed={`thumb-${product.slug}-${i}`}
                  from={product.gradient.from}
                  to={product.gradient.to}
                  accent={product.gradient.accent}
                  className="scale-90"
                />
                <span className="absolute bottom-1.5 right-2 text-[10px] uppercase tracking-wide text-faint">
                  {view}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Info */}
        <div>
          <Stagger className="space-y-5">
            <StaggerItem>
              <div className="flex flex-wrap items-center gap-2">
                <GlassBadge>{product.availability}</GlassBadge>
                {product.authentic && (
                  <GlassBadge className="text-[--color-brand-3]">
                    <ShieldIcon className="h-3.5 w-3.5" /> Authentic
                  </GlassBadge>
                )}
                <span className="flex items-center gap-1 text-sm text-muted">
                  <StarIcon className="h-4 w-4 text-[--color-brand-3]" />
                  {product.rating.toFixed(1)}
                  <span className="text-faint">({product.reviews})</span>
                </span>
              </div>
            </StaggerItem>

            <StaggerItem>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">
                {product.brand} · {product.category}
              </p>
              <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-2 text-muted">{product.colorway}</p>
            </StaggerItem>

            <StaggerItem>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">{formatPHP(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-lg text-faint line-through">
                    {formatPHP(product.originalPrice)}
                  </span>
                )}
              </div>
            </StaggerItem>

            <StaggerItem>
              <p className="max-w-lg leading-relaxed text-muted">{product.description}</p>
            </StaggerItem>

            {/* Size selector */}
            <StaggerItem>
              <motion.div
                animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.45 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Select size (US)</p>
                  {size === null && shake && (
                    <span className="text-xs text-[--color-brand-3]">Pick a size first</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`relative h-11 w-14 rounded-xl text-sm font-semibold transition-glass ${
                          on
                            ? "text-white"
                            : "glass text-muted hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {on && (
                          <motion.span
                            layoutId="size-pill"
                            className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-[--color-brand] to-[--color-brand-2]"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </StaggerItem>

            {/* Add to cart */}
            <StaggerItem>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleAdd}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 text-base font-bold text-white shadow-[0_14px_44px_-10px_var(--color-accent-glow)]"
              >
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] transition-transform duration-500 group-hover:scale-105" />
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2"
                    >
                      <CheckIcon className="h-5 w-5" /> Added to bag
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2"
                    >
                      Add to bag · {formatPHP(product.price)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </StaggerItem>

            {/* Assurances */}
            <StaggerItem>
              <ul className="mt-2 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldIcon, label: "100% Authentic" },
                  { icon: TruckIcon, label: "Ships nationwide" },
                  { icon: BoltIcon, label: "Secure checkout" },
                ].map((a) => (
                  <li
                    key={a.label}
                    className="glass flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-medium text-muted"
                  >
                    <a.icon className="h-4 w-4 shrink-0 text-[--color-brand-3]" />
                    {a.label}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          </Stagger>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-28">
          <Reveal>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">You may also like</h2>
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
              className="group inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-white"
            >
              Back to all pairs
              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </section>
      )}
    </div>
  );
}
