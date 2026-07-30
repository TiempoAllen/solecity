import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Products</p>
        <p className="mt-1 text-3xl font-bold">{count ?? 0}</p>
      </Card>
    </div>
  );
}
