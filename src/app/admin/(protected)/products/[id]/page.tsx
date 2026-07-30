import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";
import type { ProductInput } from "@/app/admin/actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const initial: ProductInput & { id: string } = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    brand: data.brand,
    category: data.category,
    price: data.price,
    original_price: data.original_price,
    availability: data.availability,
    colorway: data.colorway,
    rating: Number(data.rating),
    reviews: data.reviews,
    authentic: data.authentic,
    tagline: data.tagline,
    description: data.description,
    sizes: data.sizes ?? [],
    gradient: data.gradient,
    featured: data.featured,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit product</h1>
      <div className="mt-6"><ProductForm initial={initial} /></div>
    </div>
  );
}
