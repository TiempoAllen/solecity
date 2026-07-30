import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts, getCategories } from "@/lib/products";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";

export const metadata: Metadata = {
  title: "Shop all sneakers & clogs",
  description:
    "Browse every authentic pair at SOLECITY — ANTA, Under Armour, basketball shoes and clogs. Filter by category and ship nationwide.",
};

export const revalidate = 60;

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductsExplorer products={products} categories={categories} />
    </Suspense>
  );
}
