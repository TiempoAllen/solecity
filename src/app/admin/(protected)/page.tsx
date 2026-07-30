import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrderCounts, ORDER_STATUSES } from "@/lib/orders";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const orderCounts = await fetchOrderCounts(supabase);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="mt-1 text-3xl font-bold">{productCount ?? 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total orders</p>
          <p className="mt-1 text-3xl font-bold">{orderCounts.all}</p>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">
          Orders by status
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER_STATUSES.map((status) => (
            <Card key={status} className="p-6">
              <p className="text-sm capitalize text-muted-foreground">{status}</p>
              <p className="mt-1 text-3xl font-bold">{orderCounts[status]}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
