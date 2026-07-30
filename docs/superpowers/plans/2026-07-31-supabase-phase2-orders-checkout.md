# SOLECITY Phase 2 — Orders + Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guest/customer checkout flow that writes orders + snapshotted line items to Supabase with server-computed totals, plus an admin orders panel with status management.

**Architecture:** A single `place_order` Postgres RPC (SECURITY DEFINER, price-authoritative) is the only write path for orders — it looks up product prices from the DB, snapshots line items, and inserts order + items atomically. The `/checkout` client form reads the existing localStorage cart and calls a `placeOrder` Server Action that forwards to the RPC under the caller's session (guest = `null` customer, signed-in = `auth.uid()`). Admin reads/updates go through the session-scoped server client governed by RLS. Storefront reads stay on the cookieless anon client from Phase 1.

**Tech Stack:** Next.js 16.2.12 (App Router, async params/searchParams, Server Actions), React 19, `@supabase/ssr` + `@supabase/supabase-js`, Postgres RLS + PL/pgSQL RPC, Tailwind v4, shadcn/base-ui components, Sonner toasts.

## Global Constraints

- **Next 16 is NOT standard Next** (`AGENTS.md`). `params` and `searchParams` are `Promise`s and must be `await`ed. Route middleware is `src/proxy.ts` (already covers `/admin/**`). Read `node_modules/next/dist/docs/` before inventing new patterns.
- **Money is integer pesos** (`6490` = ₱6,490). No decimals; never store floats for money.
- **Never trust client-supplied prices.** Totals are computed from the DB inside `place_order`. The client sends only `{ slug, size, qty }` per line.
- **Server Actions return `{ ok, error? }`-shaped results** (Phase 1 convention), surface errors via Sonner toasts, and `revalidatePath` on success. Every admin action re-checks `isAdmin()` server-side.
- **No automated test harness (YAGNI, per spec).** Verification is `npx tsc --noEmit` + `npm run lint` per task and `npm run build` + manual browser preview at integration points. This is an explicit spec instruction that replaces the writing-plans skill's default TDD steps.
- **DDL cannot be applied over the API** (service-role key can't run DDL). Migration SQL is applied by pasting into the Supabase dashboard **SQL Editor**. Project ref: `okotkzravnwgtdcaltxe`.
- **Keep `Product` type and `CartContext`/`CartLine` interfaces stable.** `CartLine` already carries `{ slug, name, brand, price, size, qty, gradient }` — everything the checkout needs.
- **Reuse existing UI** (`Button`/`buttonVariants`, `Card`, `Separator`, `ShoeArt`, Sonner). `Button` has **no `asChild`** — to render a link as a button use `<Link className={cn(buttonVariants(...), "…")}>`.

---

## File Structure

**Created:**
- `supabase/migrations/0002_orders.sql` — `order_status` enum, `orders`, `order_items`, `order_number_seq`, `updated_at` trigger, RLS policies, `place_order` RPC, grants.
- `src/lib/orders.ts` — order types (`Order`, `OrderItem`, `OrderWithItems`, `OrderStatus`, `PlaceOrderItem`, `ShippingAddress`), row mappers, and RLS-scoped read helpers taking a Supabase client.
- `src/app/checkout/actions.ts` — `placeOrder` Server Action (public; guest or customer).
- `src/app/checkout/page.tsx` — server shell; prefills contact from profile when signed in.
- `src/app/checkout/checkout-form.tsx` — client form; reads cart, submits, stashes confirmation, clears cart, redirects.
- `src/app/checkout/success/[orderNumber]/page.tsx` — server shell for the confirmation route.
- `src/app/checkout/success/[orderNumber]/confirmation.tsx` — client; renders the stashed order summary.
- `src/app/admin/(protected)/orders/page.tsx` — orders list with status filter.
- `src/app/admin/(protected)/orders/[id]/page.tsx` — order detail with line items + status control.
- `src/app/admin/(protected)/orders/status-select.tsx` — client status dropdown calling the admin action.

**Modified:**
- `src/app/admin/actions.ts` — add `updateOrderStatus`.
- `src/app/admin/(protected)/admin-nav.tsx` — add the Orders link.
- `src/app/admin/(protected)/page.tsx` — add order-count cards by status.
- `src/components/CartDrawer.tsx` — wire the Checkout button to `/checkout`.

---

## Task 1: Database migration — orders schema, RLS, `place_order` RPC

**Files:**
- Create: `supabase/migrations/0002_orders.sql`

**Interfaces:**
- Produces (SQL objects later tasks depend on):
  - Tables `public.orders`, `public.order_items` with the columns below.
  - Enum `public.order_status` = `'pending' | 'paid' | 'shipped' | 'cancelled'`.
  - RPC `public.place_order(p_contact_name text, p_contact_email text, p_contact_phone text, p_shipping_address jsonb, p_note text, p_items jsonb) returns jsonb` — returns `{ "order_number": text, "subtotal": int, "total": int }`. `p_items` is a JSON array of `{ "slug": text, "size": number, "qty": int }`.
- Consumes: `public.set_updated_at()`, `public.is_admin()`, `public.profiles`, `public.products` (all from `0001_init.sql`).

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0002_orders.sql`:

```sql
-- Phase 2: orders + checkout ------------------------------------------------

-- Order status lifecycle.
create type public.order_status as enum ('pending','paid','shipped','cancelled');

-- Human-friendly order numbers: SC-001001, SC-001002, ...
create sequence if not exists public.order_number_seq start 1001;

-- orders -------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text unique not null,
  customer_id      uuid references public.profiles(id) on delete set null,
  contact_name     text not null,
  contact_email    text not null,
  contact_phone    text,
  shipping_address jsonb not null default '{}'::jsonb,
  status           public.order_status not null default 'pending',
  subtotal         integer not null,
  total            integer not null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- order_items: immutable snapshots so history survives product edits -------
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  brand        text not null,
  unit_price   integer not null,
  size         numeric not null,
  qty          integer not null,
  gradient     jsonb not null default '{}'::jsonb
);

create index order_items_order_id_idx on public.order_items(order_id);

-- place_order(): the ONLY write path for orders. SECURITY DEFINER so guest +
-- customer checkouts pass through one gate; prices are looked up from
-- products here and never trusted from the client. Runs as the function owner
-- (table owner) so it bypasses RLS for the atomic insert, while auth.uid()
-- still reflects the calling session (null for guests).
create or replace function public.place_order(
  p_contact_name     text,
  p_contact_email    text,
  p_contact_phone    text,
  p_shipping_address jsonb,
  p_note             text,
  p_items            jsonb   -- [{ "slug": text, "size": number, "qty": int }]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item         jsonb;
  v_product      public.products%rowtype;
  v_qty          integer;
  v_size         numeric;
  v_subtotal     integer := 0;
  v_order_id     uuid;
  v_order_number text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_contact_name), '') = ''
     or coalesce(btrim(p_contact_email), '') = '' then
    raise exception 'Contact name and email are required' using errcode = 'P0001';
  end if;

  v_order_number := 'SC-' || to_char(nextval('public.order_number_seq'), 'FM000000');

  insert into public.orders (
    order_number, customer_id, contact_name, contact_email, contact_phone,
    shipping_address, note, subtotal, total
  ) values (
    v_order_number, auth.uid(), btrim(p_contact_name), btrim(p_contact_email),
    p_contact_phone, coalesce(p_shipping_address, '{}'::jsonb),
    nullif(btrim(p_note), ''), 0, 0
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty  := coalesce((v_item->>'qty')::int, 0);
    v_size := coalesce((v_item->>'size')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Invalid quantity for %', (v_item->>'slug') using errcode = 'P0001';
    end if;

    select * into v_product from public.products
      where slug = (v_item->>'slug') limit 1;
    if not found then
      raise exception 'Product % not found', (v_item->>'slug') using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    insert into public.order_items (
      order_id, product_id, product_slug, product_name, brand,
      unit_price, size, qty, gradient
    ) values (
      v_order_id, v_product.id, v_product.slug, v_product.name, v_product.brand,
      v_product.price, v_size, v_qty, v_product.gradient
    );
  end loop;

  update public.orders
    set subtotal = v_subtotal, total = v_subtotal
    where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total', v_subtotal
  );
end;
$$;

-- RLS ----------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No INSERT policy: direct PostgREST inserts are blocked. All order inserts
-- go through place_order() (SECURITY DEFINER). Customers read only their own
-- orders; admins read all; admins may update status.
create policy orders_select_own_or_admin on public.orders
  for select using (customer_id = auth.uid() or public.is_admin());

create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_select_own_or_admin on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.is_admin())
    )
  );

-- Grants (RLS narrows further). Guests read nothing back — they rely on the
-- place_order() return value for confirmation.
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant execute on function
  public.place_order(text, text, text, jsonb, text, jsonb)
  to anon, authenticated;
```

- [ ] **Step 2: Apply the migration in the Supabase SQL Editor**

The service-role key cannot run DDL over the API. Open the Supabase dashboard for project `okotkzravnwgtdcaltxe` → **SQL Editor** → paste the entire contents of `supabase/migrations/0002_orders.sql` → **Run**. Expected: "Success. No rows returned."

> This step requires the user/operator with dashboard access. If you are an agent without it, pause and ask the user to apply it, then continue.

- [ ] **Step 3: Smoke-test the schema + RPC in the SQL Editor**

Run this in the SQL Editor to prove the RPC works end-to-end against a seeded product:

```sql
select public.place_order(
  'Test Buyer', 'test@example.com', '09170000000',
  '{"line1":"123 Test St","city":"Cebu City","province":"Cebu","postal":"6000","country":"PH"}'::jsonb,
  'smoke test',
  '[{"slug":"anta-kai-1-speed","size":9,"qty":2}]'::jsonb
);
-- Expect: { "order_number":"SC-001001", "subtotal":12980, "total":12980 }

select order_number, status, subtotal, total, customer_id from public.orders order by created_at desc limit 1;
select product_name, unit_price, size, qty from public.order_items
  where order_id = (select id from public.orders order by created_at desc limit 1);
```

Expected: subtotal = `6490 * 2 = 12980`; one order row with `status='pending'`, `customer_id` null (guest, no session in the editor); two-line snapshot with `unit_price=6490`.

- [ ] **Step 4: Clean up the smoke-test row**

```sql
delete from public.orders where contact_email = 'test@example.com';
```

(Cascade removes its `order_items`.) Leave `order_number_seq` advanced — that's fine.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_orders.sql
git commit -m "feat(db): orders + order_items schema, RLS, place_order RPC"
```

---

## Task 2: `src/lib/orders.ts` — order types + RLS-scoped read helpers

**Files:**
- Create: `src/lib/orders.ts`

**Interfaces:**
- Consumes: `place_order` RPC return shape (Task 1); `orders`/`order_items` columns (Task 1). Takes a Supabase client (from `@/lib/supabase/server`) as an argument — the caller owns client creation so RLS scoping is explicit.
- Produces (used by Tasks 3, 6, 7, 8):
  - `ORDER_STATUSES: readonly OrderStatus[]`, `type OrderStatus`.
  - `type ShippingAddress`, `type PlaceOrderItem = { slug: string; size: number; qty: number }`.
  - `type Order`, `type OrderItem`, `type OrderWithItems`.
  - `fetchOrders(supabase, status?): Promise<Order[]>`
  - `fetchOrderById(supabase, id): Promise<OrderWithItems | null>`
  - `fetchOrderCounts(supabase): Promise<Record<OrderStatus, number> & { all: number }>`

- [ ] **Step 1: Write the file**

Create `src/lib/orders.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postal?: string;
  country?: string;
};

// What the client sends per cart line to place_order (no prices).
export type PlaceOrderItem = { slug: string; size: number; qty: number };

export type OrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  brand: string;
  unitPrice: number;
  size: number;
  qty: number;
  gradient: { from: string; to: string; accent: string };
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  subtotal: number;
  total: number;
  note: string | null;
  createdAt: string;
};

export type OrderWithItems = Order & { items: OrderItem[] };

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  shipping_address: ShippingAddress | null;
  status: OrderStatus;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  product_slug: string;
  product_name: string;
  brand: string;
  unit_price: number;
  size: number | string;
  qty: number;
  gradient: { from: string; to: string; accent: string };
};

function mapOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customerId: r.customer_id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    shippingAddress: r.shipping_address ?? {},
    status: r.status,
    subtotal: r.subtotal,
    total: r.total,
    note: r.note,
    createdAt: r.created_at,
  };
}

function mapItem(r: OrderItemRow): OrderItem {
  return {
    id: r.id,
    productSlug: r.product_slug,
    productName: r.product_name,
    brand: r.brand,
    unitPrice: r.unit_price,
    size: Number(r.size),
    qty: r.qty,
    gradient: r.gradient,
  };
}

const ORDER_COLUMNS =
  "id,order_number,customer_id,contact_name,contact_email,contact_phone,shipping_address,status,subtotal,total,note,created_at";
const ITEM_COLUMNS =
  "id,product_slug,product_name,brand,unit_price,size,qty,gradient";

export async function fetchOrders(
  supabase: SupabaseClient,
  status?: OrderStatus,
): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as OrderRow[]).map(mapOrder);
}

export async function fetchOrderById(
  supabase: SupabaseClient,
  id: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { order_items, ...order } = data as OrderRow & {
    order_items: OrderItemRow[];
  };
  return {
    ...mapOrder(order),
    items: (order_items ?? []).map(mapItem),
  };
}

export async function fetchOrderCounts(
  supabase: SupabaseClient,
): Promise<Record<OrderStatus, number> & { all: number }> {
  const { data } = await supabase.from("orders").select("status");
  const counts = { pending: 0, paid: 0, shipped: 0, cancelled: 0, all: 0 };
  for (const row of (data ?? []) as { status: OrderStatus }[]) {
    counts[row.status] += 1;
    counts.all += 1;
  }
  return counts;
}
```

- [ ] **Step 2: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors. (`SupabaseClient` resolves from `@supabase/supabase-js`, already a dependency.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/orders.ts
git commit -m "feat: order types + RLS-scoped read helpers"
```

---

## Task 3: `placeOrder` checkout Server Action

**Files:**
- Create: `src/app/checkout/actions.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (`@/lib/supabase/server`); `PlaceOrderItem`, `ShippingAddress` (Task 2); `place_order` RPC (Task 1).
- Produces (used by Task 4):
  - `type PlaceOrderInput = { contactName; contactEmail; contactPhone; shippingAddress: ShippingAddress; note; items: PlaceOrderItem[] }`
  - `type PlaceOrderResult = { ok: true; orderNumber: string; total: number } | { ok: false; error: string }`
  - `async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>`

- [ ] **Step 1: Write the action**

Create `src/app/checkout/actions.ts`:

```ts
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlaceOrderItem, ShippingAddress } from "@/lib/orders";

export type PlaceOrderInput = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: ShippingAddress;
  note: string;
  items: PlaceOrderItem[];
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  if (!input.items?.length) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (!input.contactName.trim()) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!EMAIL_RE.test(input.contactEmail.trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // Send only { slug, size, qty }; place_order re-reads prices from the DB.
  const items: PlaceOrderItem[] = input.items.map((i) => ({
    slug: i.slug,
    size: i.size,
    qty: i.qty,
  }));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_contact_name: input.contactName.trim(),
    p_contact_email: input.contactEmail.trim(),
    p_contact_phone: input.contactPhone.trim() || null,
    p_shipping_address: input.shippingAddress,
    p_note: input.note.trim() || null,
    p_items: items,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  const result = data as { order_number: string; total: number };
  return { ok: true, orderNumber: result.order_number, total: result.total };
}
```

- [ ] **Step 2: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/checkout/actions.ts
git commit -m "feat: placeOrder server action (guest + customer checkout)"
```

---

## Task 4: `/checkout` page + form, and wire the CartDrawer button

**Files:**
- Create: `src/app/checkout/page.tsx`
- Create: `src/app/checkout/checkout-form.tsx`
- Modify: `src/components/CartDrawer.tsx`

**Interfaces:**
- Consumes: `placeOrder`, `PlaceOrderInput`, `PlaceOrderResult` (Task 3); `useCart` (`@/context/CartContext`); `createServerSupabaseClient` (server client for prefill).
- Produces (used by Task 5): a `sessionStorage` confirmation payload written under key `` `solecity-order-${orderNumber}` `` with shape:
  `{ orderNumber: string; total: number; lines: CartLine[] }` (JSON). Task 5 reads this exact key + shape.

- [ ] **Step 1: Write the server shell (`page.tsx`)**

Create `src/app/checkout/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prefill = { name: "", email: "" };
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", user.id)
      .maybeSingle();
    prefill = {
      name: profile?.full_name ?? "",
      email: profile?.email ?? user.email ?? "",
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Guest checkout — no account required. Ships nationwide from Cebu City.
      </p>
      <div className="mt-8">
        <CheckoutForm prefill={prefill} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the client form (`checkout-form.tsx`)**

Create `src/app/checkout/checkout-form.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire the CartDrawer Checkout button**

In `src/components/CartDrawer.tsx`, add imports at the top (alongside the existing imports):

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

Then replace the existing checkout button line:

```tsx
            <Button className="w-full">Checkout · {formatPHP(subtotal)}</Button>
```

with a link that closes the drawer and navigates to `/checkout`:

```tsx
            <Link
              href="/checkout"
              onClick={close}
              className={cn(buttonVariants(), "w-full")}
            >
              Checkout · {formatPHP(subtotal)}
            </Link>
```

(`formatPHP` and `Button` remain imported — `Button` is still used by the "Start shopping" / quantity controls.)

- [ ] **Step 4: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Start the dev server (via the preview tool, `.claude/launch.json` "dev" → `npm run dev`), then:
1. Add a product to the bag from `/products/[slug]`; open the cart drawer; click **Checkout** → lands on `/checkout` with the order summary populated and the drawer closed.
2. Fill contact name + a valid email + address; click **Place order** → a success toast fires and the URL becomes `/checkout/success/SC-XXXXXX`. (Task 5 renders that page; until then a 404/empty is acceptable — just confirm the toast + redirect + that the cart drawer is now empty.)
3. Check `read_console_messages` for errors; confirm no client price is sent (open `read_network_requests`, the action POST body carries only `slug/size/qty`, not `price`).

- [ ] **Step 6: Commit**

```bash
git add src/app/checkout/page.tsx src/app/checkout/checkout-form.tsx src/components/CartDrawer.tsx
git commit -m "feat: /checkout page + form; wire cart drawer checkout button"
```

---

## Task 5: Checkout success / confirmation page

**Files:**
- Create: `src/app/checkout/success/[orderNumber]/page.tsx`
- Create: `src/app/checkout/success/[orderNumber]/confirmation.tsx`

**Interfaces:**
- Consumes: the `sessionStorage` payload written in Task 4 — key `` `solecity-order-${orderNumber}` ``, shape `{ orderNumber: string; total: number; lines: CartLine[] }`; `CartLine` (`@/context/CartContext`); `ShoeArt`, `formatPHP`.
- Produces: nothing downstream.
- Note: guests have no session, so RLS forbids reading the order back from the DB. Confirmation renders from the stashed client payload (spec: "Guests rely on the insert's returned row for confirmation, not a later read").

- [ ] **Step 1: Write the server shell (`page.tsx`)**

Create `src/app/checkout/success/[orderNumber]/page.tsx`:

```tsx
import { Confirmation } from "./confirmation";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Confirmation orderNumber={orderNumber} />
    </div>
  );
}
```

- [ ] **Step 2: Write the client confirmation (`confirmation.tsx`)**

Create `src/app/checkout/success/[orderNumber]/confirmation.tsx`:

```tsx
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
  const [order, setOrder] = useState<Stashed | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`solecity-order-${orderNumber}`);
      if (raw) setOrder(JSON.parse(raw) as Stashed);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [orderNumber]);

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
```

- [ ] **Step 3: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 4: Manual browser verification (full guest round-trip)**

With the dev server running: add an item → checkout → place order. Expected: redirected to `/checkout/success/SC-XXXXXX` showing the green check, the order reference, the line-item summary, and the correct total. Refresh the page once (same tab) → summary still renders (sessionStorage survives). Confirm the cart drawer is now empty.

- [ ] **Step 5: Commit**

```bash
git add "src/app/checkout/success/[orderNumber]/page.tsx" "src/app/checkout/success/[orderNumber]/confirmation.tsx"
git commit -m "feat: checkout success confirmation page"
```

---

## Task 6: Admin orders list with status filter

**Files:**
- Create: `src/app/admin/(protected)/orders/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient`; `fetchOrders`, `ORDER_STATUSES`, `type OrderStatus` (Task 2); `formatPHP`; `buttonVariants`, `cn`. The admin's session client → RLS lets admins see all orders.
- Produces (used by Task 7): links to `/admin/orders/[id]`.

- [ ] **Step 1: Write the list page**

Create `src/app/admin/(protected)/orders/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Sign in at `/admin/login` (admin account). Navigate to `/admin/orders`. Expected: the order(s) placed during Task 4/5 verification appear (or "No orders yet"). Click each status filter chip → URL gains `?status=...` and the list narrows. (Detail link 404s until Task 7 — that's expected here.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(protected)/orders/page.tsx"
git commit -m "feat(admin): orders list with status filter"
```

---

## Task 7: Admin order detail + status update

**Files:**
- Create: `src/app/admin/(protected)/orders/[id]/page.tsx`
- Create: `src/app/admin/(protected)/orders/status-select.tsx`
- Modify: `src/app/admin/actions.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient`; `isAdmin` (`@/lib/supabase/auth`); `revalidatePath`; `fetchOrderById`, `ORDER_STATUSES`, `type OrderStatus` (Task 2); `ShoeArt`, `formatPHP`, `Separator`, `Card`.
- Produces:
  - `updateOrderStatus(id: string, status: OrderStatus): Promise<{ ok: boolean; error?: string }>` (in `src/app/admin/actions.ts`) — used by `status-select.tsx`.

- [ ] **Step 1: Add `updateOrderStatus` to `src/app/admin/actions.ts`**

Add the import for the status type at the top of `src/app/admin/actions.ts` (next to the existing imports):

```ts
import type { OrderStatus } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/orders";
```

Append this action to the end of the file:

```ts
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}
```

- [ ] **Step 2: Write the client status dropdown (`status-select.tsx`)**

Create `src/app/admin/(protected)/orders/status-select.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: OrderStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <select
      className="rounded-md border bg-background px-3 py-2 text-sm capitalize disabled:opacity-50"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        start(async () => {
          const res = await updateOrderStatus(id, next);
          if (res.ok) {
            toast.success(`Status updated to ${next}`);
            router.refresh();
          } else {
            toast.error(res.error ?? "Update failed");
          }
        });
      }}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Write the detail page (`[id]/page.tsx`)**

Create `src/app/admin/(protected)/orders/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrderById } from "@/lib/orders";
import { ShoeArt } from "@/components/ShoeArt";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/lib/utils";
import { StatusSelect } from "../status-select";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
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
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed{" "}
            {new Date(order.createdAt).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <StatusSelect id={order.id} status={order.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Items</h2>
          <Separator className="my-3" />
          <ul className="space-y-3">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                  <ShoeArt
                    seed={`adm-${it.productSlug}-${it.size}`}
                    from={it.gradient.from}
                    to={it.gradient.to}
                    accent={it.gradient.accent}
                    className="scale-90"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.brand} · US {it.size} × {it.qty} ·{" "}
                    {formatPHP(it.unitPrice)} each
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
            <h2 className="text-sm font-semibold">Contact</h2>
            <Separator className="my-3" />
            <p className="text-sm">{order.contactName}</p>
            <p className="text-sm text-muted-foreground">{order.contactEmail}</p>
            {order.contactPhone && (
              <p className="text-sm text-muted-foreground">{order.contactPhone}</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Shipping</h2>
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
```

- [ ] **Step 4: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 5: Manual browser verification (admin round-trip + RLS)**

As admin: `/admin/orders` → **View** an order → detail shows items, contact, shipping. Change the status dropdown (e.g. `pending → paid`) → success toast, value persists after refresh; the list at `/admin/orders?status=paid` now includes it. Then verify RLS isolation: sign out, place a fresh guest order, and confirm a **non-admin** cannot load `/admin/orders` (proxy redirects to `/admin/login`), and that hitting the orders table via the anon client returns nothing for guests (already covered by RLS — no anon SELECT grant).

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(protected)/orders/[id]/page.tsx" "src/app/admin/(protected)/orders/status-select.tsx" src/app/admin/actions.ts
git commit -m "feat(admin): order detail view + status update action"
```

---

## Task 8: Dashboard order counts + admin nav link

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`
- Modify: `src/app/admin/(protected)/admin-nav.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient`; `fetchOrderCounts`, `ORDER_STATUSES` (Task 2); `Card`.

- [ ] **Step 1: Add the Orders link to `admin-nav.tsx`**

In `src/app/admin/(protected)/admin-nav.tsx`, extend the `links` array:

```tsx
const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products", exact: false },
  { href: "/admin/orders", label: "Orders", exact: false },
];
```

- [ ] **Step 2: Add order-count cards to the dashboard (`page.tsx`)**

Replace the entire contents of `src/app/admin/(protected)/page.tsx` with:

```tsx
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
```

- [ ] **Step 3: Type-check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

As admin, load `/admin`. Expected: cards show Products count, Total orders count, and four status cards summing to the total. The nav shows **Orders** with the active-state styling working when on `/admin/orders`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/page.tsx" "src/app/admin/(protected)/admin-nav.tsx"
git commit -m "feat(admin): dashboard order counts + Orders nav link"
```

---

## Final verification (whole phase)

- [ ] **Build passes**

Run:
```bash
npm run build
```
Expected: compiles with no type or lint errors.

- [ ] **Acceptance criteria (from the spec, verified in browser preview):**
  1. A **guest** completes checkout → an `order` + `order_items` are written with **server-computed** totals and product snapshots (verify the total in `/admin/orders` matches the DB price × qty, independent of any client value).
  2. **Admin** sees orders in `/admin/orders`, opens detail, and changes status; the change persists and the dashboard counts update.
  3. A **customer cannot read another customer's orders** — RLS: guests get nothing via anon reads; the admin panel is proxy-gated + `isAdmin()`-rechecked; `orders` has no direct INSERT policy (writes only through `place_order`).

- [ ] **Update the project memory** at
  `C:\Users\allen\.claude\projects\C--Users-allen-OneDrive-Documents-NextJS-solecity\memory\supabase-backend.md`:
  mark Phase 2 COMPLETE, note the `0002_orders.sql` migration must be applied via SQL Editor, and record that order inserts flow exclusively through the `place_order` SECURITY DEFINER RPC.

---

## Self-Review notes

- **Spec coverage:** enum+orders+order_items+RLS+`place_order` RPC (Task 1) ✓; `orders.ts` reads/writes (Task 2) ✓; `/checkout` with profile prefill + localStorage cart (Task 4) ✓; `placeOrder` re-reads prices, computes totals, sets `customer_id` (Task 3 + RPC) ✓; `/checkout/success/[orderNumber]` + cart clear (Tasks 4–5) ✓; `/admin/orders` list + filter + detail + status dropdown (Tasks 6–7) ✓; dashboard order counts by status (Task 8) ✓.
- **Design note vs spec wording:** the spec says the *Server Action* re-reads prices; this plan makes the *`place_order` RPC* the price-authoritative, atomic gate (the action validates + forwards). This is strictly stronger — prices are looked up in the same transaction that inserts, and clients cannot supply prices at all. Documented here so a reviewer expecting action-side pricing understands the deviation.
- **Guest confirmation:** RLS blocks guest reads, so the success page renders from a sessionStorage payload (spec: "guests rely on the insert's returned row"), not a DB read.
- **Type consistency:** `OrderStatus`/`ORDER_STATUSES`, `PlaceOrderItem`, `Order`/`OrderWithItems`, `fetchOrders`/`fetchOrderById`/`fetchOrderCounts`, `placeOrder`/`PlaceOrderInput`/`PlaceOrderResult`, and `updateOrderStatus` names/signatures are identical across the tasks that define and consume them.
