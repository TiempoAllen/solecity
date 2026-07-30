import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelated, products } from "@/lib/products";
import { ProductDetail } from "@/components/products/ProductDetail";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.colorway}`,
    description: product.tagline,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = getRelated(product.slug, product.category);
  return <ProductDetail product={product} related={related} />;
}
