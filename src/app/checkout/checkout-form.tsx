"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { placeOrder, type PlaceOrderInput } from "./actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/lib/utils";

type Prefill = { name: string; email: string };

const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

export function CheckoutForm({ prefill }: { prefill: Prefill }) {
  const { lines, subtotal, clear } = useCart();
  const [pending, start] = useTransition();
  const router = useRouter();

  const [form, setForm] = useState({
    contactName: prefill.name,
    contactEmail: prefill.email,
    contactPhone: "",
    line1: "",
    line2: "",
    city: "",
    province: "",
    postal: "",
    country: "PH",
    note: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (lines.length === 0) {
      toast.error("Your bag is empty.");
      return;
    }
    const payload: PlaceOrderInput = {
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      shippingAddress: {
        line1: form.line1,
        line2: form.line2,
        city: form.city,
        province: form.province,
        postal: form.postal,
        country: form.country,
      },
      note: form.note,
      items: lines.map((l) => ({ slug: l.slug, size: l.size, qty: l.qty })),
    };
    start(async () => {
      const res = await placeOrder(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Stash confirmation for the (possibly guest) success page, then clear.
      try {
        sessionStorage.setItem(
          `solecity-order-${res.orderNumber}`,
          JSON.stringify({
            orderNumber: res.orderNumber,
            total: res.total,
            lines,
          }),
        );
      } catch {
        /* storage unavailable — success page will show a fallback */
      }
      clear();
      toast.success("Order placed!");
      router.push(`/checkout/success/${res.orderNumber}`);
    });
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-base font-semibold">Your bag is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a pair before checking out.
        </p>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contact
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">Full name</span>
              <input
                className={input}
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                className={input}
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Phone</span>
              <input
                className={input}
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shipping address
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Address line 1</span>
              <input
                className={input}
                value={form.line1}
                onChange={(e) => set("line1", e.target.value)}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Address line 2</span>
              <input
                className={input}
                value={form.line2}
                onChange={(e) => set("line2", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">City</span>
              <input
                className={input}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Province</span>
              <input
                className={input}
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Postal code</span>
              <input
                className={input}
                value={form.postal}
                onChange={(e) => set("postal", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Country</span>
              <input
                className={input}
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-sm font-medium">Order note (optional)</span>
            <textarea
              className={input}
              rows={3}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </label>
        </section>
      </div>

      <aside className="h-fit rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Order summary</h2>
        <Separator className="my-3" />
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={`${l.slug}-${l.size}`} className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-muted-foreground">
                {l.name} · US {l.size} × {l.qty}
              </span>
              <span className="font-medium tabular-nums">
                {formatPHP(l.price * l.qty)}
              </span>
            </li>
          ))}
        </ul>
        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-lg font-bold">{formatPHP(subtotal)}</span>
        </div>
        <Button
          className="mt-4 w-full"
          disabled={pending}
          onClick={submit}
        >
          {pending ? "Placing order…" : `Place order · ${formatPHP(subtotal)}`}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Payment is arranged after we confirm your order.
        </p>
      </aside>
    </div>
  );
}
