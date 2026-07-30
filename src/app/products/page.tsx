import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";

export const metadata: Metadata = {
  title: "Shop all sneakers & clogs",
  description:
    "Browse every authentic pair at SOLECITY — ANTA, Under Armour, basketball shoes and clogs. Filter by category and ship nationwide.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductsExplorer />
    </Suspense>
  );
}
