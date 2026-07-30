import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPHP } from "@/lib/utils";
import { DeleteButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: products } = await supabase
    .from("products")
    .select("id,slug,name,brand,category,price,featured")
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className={cn(buttonVariants({ size: "sm" }))}>
          New product
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Featured</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2">{p.brand}</td>
                <td className="px-4 py-2">{p.category}</td>
                <td className="px-4 py-2">{formatPHP(p.price)}</td>
                <td className="px-4 py-2">{p.featured ? "Yes" : "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Edit
                    </Link>
                    <DeleteButton id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
