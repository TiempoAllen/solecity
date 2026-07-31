import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrders } from "@/lib/orders";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPHP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const orders = await fetchOrders(supabase);

  return (
    <div>
      <h2 className="text-xl font-bold">Order history</h2>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Placed</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  You haven&rsquo;t placed any orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 capitalize">{o.status}</td>
                  <td className="px-4 py-2 tabular-nums">{formatPHP(o.total)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
