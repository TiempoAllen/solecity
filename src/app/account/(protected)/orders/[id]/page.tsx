import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrderById } from "@/lib/orders";
import { ShoeArt } from "@/components/ShoeArt";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const order = await fetchOrderById(supabase, id);
  if (!order) notFound();

  const addr = order.shippingAddress;
  const addrLines = [
    addr.line1,
    addr.line2,
    [addr.city, addr.province].filter(Boolean).join(", "),
    [addr.postal, addr.country].filter(Boolean).join(" "),
  ].filter((l) => l && l.trim());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Placed{" "}
            {new Date(order.createdAt).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm capitalize">
          {order.status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Items</h3>
          <Separator className="my-3" />
          <ul className="space-y-3">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                  <ShoeArt
                    seed={`acc-${it.productSlug}-${it.size}`}
                    from={it.gradient.from}
                    to={it.gradient.to}
                    accent={it.gradient.accent}
                    className="scale-90"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.brand} · US {it.size} × {it.qty} · {formatPHP(it.unitPrice)} each
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatPHP(it.unitPrice * it.qty)}
                </span>
              </li>
            ))}
          </ul>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{formatPHP(order.total)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            <Separator className="my-3" />
            <p className="text-sm">{order.contactName}</p>
            <p className="text-sm text-muted-foreground">{order.contactEmail}</p>
            {order.contactPhone && (
              <p className="text-sm text-muted-foreground">{order.contactPhone}</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Shipping</h3>
            <Separator className="my-3" />
            {addrLines.length > 0 ? (
              <address className="text-sm not-italic text-muted-foreground">
                {addrLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">No address provided.</p>
            )}
            {order.note && (
              <>
                <Separator className="my-3" />
                <p className="text-xs font-medium">Note</p>
                <p className="text-sm text-muted-foreground">{order.note}</p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
