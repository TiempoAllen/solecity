import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrders, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPHP } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isStatus(v: string | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as readonly string[]).includes(v);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = isStatus(status) ? status : undefined;

  const supabase = await createServerSupabaseClient();
  const orders = await fetchOrders(supabase, active);

  const filters: { label: string; value?: OrderStatus }[] = [
    { label: "All" },
    ...ORDER_STATUSES.map((s) => ({ label: s, value: s })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const isActive = f.value === active || (!f.value && !active);
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
              className={cn(
                buttonVariants({
                  variant: isActive ? "default" : "outline",
                  size: "sm",
                }),
                "capitalize",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Placed</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders{active ? ` with status "${active}"` : ""} yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-2">
                    <div>{o.contactName}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.contactEmail}
                    </div>
                  </td>
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
                        href={`/admin/orders/${o.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
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
