"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, Category } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal } from "@/components/motion/Reveal";

type Filter = Category | "All";
type Sort = "featured" | "low" | "high";

type Props = {
  products: Product[];
  categories: Array<{ label: Filter; count: number }>;
};

const isFilter = (v: string | null): v is Filter =>
  v === "All" || v === "ANTA" || v === "Basketball" || v === "Under Armour" || v === "Clogs";

const sortLabels: Record<Sort, string> = {
  featured: "Featured",
  low: "Price: Low to High",
  high: "Price: High to Low",
};

export function ProductsExplorer({ products, categories }: Props) {
  const params = useSearchParams();
  const initial = params.get("category");
  const query = (params.get("search") ?? "").trim().toLowerCase();
  const [active, setActive] = useState<Filter>(isFilter(initial) ? initial : "All");
  const [sort, setSort] = useState<Sort>("featured");

  const visible = useMemo(() => {
    let list = active === "All" ? products : products.filter((p) => p.category === active);
    if (query) {
      list = list.filter((p) =>
        [p.name, p.brand, p.colorway].some((field) =>
          field.toLowerCase().includes(query),
        ),
      );
    }
    list = [...list];
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [active, sort, products, query]);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
      <Reveal>
        <p className="text-sm text-muted-foreground">The collection</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">All SOLECITY pairs</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {query ? (
            <>
              {visible.length} {visible.length === 1 ? "result" : "results"} for{" "}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
              .
            </>
          ) : (
            <>
              {visible.length} authentic {visible.length === 1 ? "pair" : "pairs"} ready to
              ship nationwide.
            </>
          )}
        </p>
      </Reveal>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = active === c.label;
            return (
              <Button
                key={c.label}
                variant={on ? "default" : "outline"}
                size="sm"
                onClick={() => setActive(c.label as Filter)}
              >
                {c.label}
                <span className="ml-1 text-xs opacity-60">{c.count}</span>
              </Button>
            );
          })}
        </div>

        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-[190px]" aria-label="Sort products">
            <SelectValue>{(value) => `Sort: ${sortLabels[value as Sort]}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="low">Price: Low to High</SelectItem>
            <SelectItem value="high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
