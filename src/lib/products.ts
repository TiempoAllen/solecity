import { createPublicClient } from "@/lib/supabase/public";

export type Category = "ANTA" | "Basketball" | "Under Armour" | "Clogs";
export type Availability = "On Hand" | "Pre-Order";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  originalPrice?: number;
  availability: Availability;
  colorway: string;
  rating: number;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured?: boolean;
};

type ProductRow = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  availability: string;
  colorway: string;
  rating: number | string;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured: boolean;
};

function mapRow(r: ProductRow): Product {
  return {
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    category: r.category as Category,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    availability: r.availability as Availability,
    colorway: r.colorway,
    rating: Number(r.rating),
    reviews: r.reviews,
    authentic: r.authentic,
    tagline: r.tagline,
    description: r.description,
    sizes: r.sizes ?? [],
    gradient: r.gradient,
    featured: r.featured,
  };
}

const COLUMNS =
  "slug,name,brand,category,price,original_price,availability,colorway,rating,reviews,authentic,tagline,description,sizes,gradient,featured";

export async function getProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as ProductRow);
}

export async function getFeatured(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("featured", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getRelated(slug: string, category: Category): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("category", category)
    .neq("slug", slug)
    .limit(3);
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getCategories(): Promise<Array<{ label: Category | "All"; count: number }>> {
  const all = await getProducts();
  const labels: Category[] = ["ANTA", "Basketball", "Under Armour", "Clogs"];
  return [
    { label: "All", count: all.length },
    ...labels.map((label) => ({
      label,
      count: all.filter((p) => p.category === label).length,
    })),
  ];
}
