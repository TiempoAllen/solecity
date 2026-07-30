import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelated, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/products/ProductDetail";

type Params = { slug: string };

export const revalidate = 60;

export async function generateStaticParams(): Promise<Params[]> {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.colorway}`,
    description: product.tagline,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await getRelated(product.slug, product.category);
  return <ProductDetail product={product} related={related} />;
}
