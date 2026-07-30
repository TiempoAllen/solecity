"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { products, categories, type Category } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

type Filter = Category | "All";

const isFilter = (v: string | null): v is Filter =>
  v === "All" || v === "ANTA" || v === "Basketball" || v === "Under Armour" || v === "Clogs";

export function ProductsExplorer() {
  const params = useSearchParams();
  const initial = params.get("category");
  const [active, setActive] = useState<Filter>(isFilter(initial) ? initial : "All");
  const [sort, setSort] = useState<"featured" | "low" | "high">("featured");

  const visible = useMemo(() => {
    let list = active === "All" ? products : products.filter((p) => p.category === active);
    list = [...list];
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [active, sort]);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-32 sm:px-6 sm:pt-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[--color-brand-3]">
          The collection
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          All <span className="brand-gradient-text">SOLECITY</span> pairs
        </h1>
        <p className="mt-3 max-w-md text-muted">
          {visible.length} authentic {visible.length === 1 ? "pair" : "pairs"} ready to ship
          nationwide.
        </p>
      </motion.div>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = active === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setActive(c.label as Filter)}
                className="relative rounded-full px-4 py-2 text-sm font-medium transition-glass"
              >
                {on && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[--color-brand] to-[--color-brand-2] shadow-[0_8px_24px_-8px_var(--color-accent-glow)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={on ? "text-white" : "glass rounded-full text-muted"}>
                  <span className={on ? "" : "px-4 py-2"}>
                    {c.label}
                    <span className={on ? "ml-1.5 opacity-70" : "ml-1.5 text-faint"}>
                      {c.count}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="glass cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-muted outline-none [&>option]:bg-[--color-ink] [&>option]:text-white"
          aria-label="Sort products"
        >
          <option value="featured">Sort: Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>

      {/* Grid */}
      <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((product) => (
            <motion.div
              key={product.slug}
              layout
              initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
