"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { CartLine } from "@/context/CartContext";
import { ShoeArt } from "@/components/ShoeArt";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatPHP } from "@/lib/utils";

type Stashed = { orderNumber: string; total: number; lines: CartLine[] };

export function Confirmation({ orderNumber }: { orderNumber: string }) {
  const [state, setState] = useState<{
    order: Stashed | null;
    loaded: boolean;
  }>({ order: null, loaded: false });

  useEffect(() => {
    let order: Stashed | null = null;
    try {
      const raw = sessionStorage.getItem(`solecity-order-${orderNumber}`);
      if (raw) order = JSON.parse(raw) as Stashed;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ order, loaded: true });
  }, [orderNumber]);

  const { order, loaded } = state;

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">Order confirmed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thank you! Your order reference is{" "}
        <span className="font-semibold text-foreground">{orderNumber}</span>.
        We&rsquo;ll email you to arrange payment and delivery.
      </p>

      {loaded && order && (
        <div className="mx-auto mt-8 max-w-md rounded-lg border p-4 text-left">
          <h2 className="text-sm font-semibold">Order summary</h2>
          <Separator className="my-3" />
          <ul className="space-y-3">
            {order.lines.map((l) => (
              <li key={`${l.slug}-${l.size}`} className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                  <ShoeArt
                    seed={`ok-${l.slug}-${l.size}`}
                    from={l.gradient.from}
                    to={l.gradient.to}
                    accent={l.gradient.accent}
                    className="scale-90"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    US {l.size} × {l.qty}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatPHP(l.price * l.qty)}
                </span>
              </li>
            ))}
          </ul>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{formatPHP(order.total)}</span>
          </div>
        </div>
      )}

      {loaded && !order && (
        <p className="mt-8 text-sm text-muted-foreground">
          Your order was placed successfully. Keep the reference above for your
          records.
        </p>
      )}

      <div className="mt-8">
        <Link href="/products" className={cn(buttonVariants())}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
