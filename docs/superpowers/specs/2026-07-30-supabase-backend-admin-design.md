# SOLECITY — Supabase Backend & Admin CRUD

**Date:** 2026-07-30
**Status:** Approved design, ready for planning

## Overview

SOLECITY is a Next.js 16 (App Router) sneaker/clog store. Today the catalog is a
hardcoded array in `src/lib/products.ts`, the cart lives in `localStorage`, and
there is no backend, auth, or database.

This project adds a Supabase (Postgres) backend and an admin panel where
authorized users can CRUD the catalog, plus the groundwork for orders and
customer accounts. It ships in **three independently-deployable phases**.

### Goals

- Move the product catalog into Supabase; storefront reads from the DB.
- An `/admin` panel gated by Supabase Auth + an `admin` role, with product CRUD.
- A checkout flow that writes orders to the DB (payment deferred).
- Optional customer accounts with order history; guest checkout always works.
- Security enforced in the database via Row-Level Security (RLS), not just UI.

### Non-goals (YAGNI)

- Online payment integration (Stripe etc.) — orders carry a `status`; real
  payment is deferred. Design leaves the door open.
- Product image uploads / file storage — products keep gradient-based art.
- A categories management table — `category` is a text column on `products`.
- An automated test harness — verification is type-check/build + manual browser
  preview. Can be added later if desired.

### Decisions locked during brainstorming

| Decision | Choice |
| --- | --- |
| Scope | Full store: products, orders, customers |
| Payment | Deferred — orders have a `status`, no provider now |
| Admin auth | Supabase Auth + `admin` role on `profiles` |
| Customer accounts | Optional — guest checkout + accounts both supported |
| Spec coverage | All three phases up front |

## Architecture

- **`@supabase/supabase-js` + `@supabase/ssr`** for cookie-based auth in the App
  Router.
- **Reads**: Server Components query Supabase directly (public catalog via anon
  key + RLS allowing public `SELECT`). Revalidation keeps the storefront fresh.
- **Writes**: Server Actions, authorized by the logged-in user's session; RLS
  enforces that only admins write products / read all orders.
- **No separate REST API layer or Edge Functions** — Server Components + Server
  Actions talk to Supabase directly.
- **Money** stored as integer pesos (`6490` = ₱6,490) to match existing data.
- `sizes` and `gradient` stored as `jsonb`.

### Supabase clients (`src/lib/supabase/`)

Three factories via `@supabase/ssr`:

- `client.ts` — browser client (anon key), for client components.
- `server.ts` — server client that reads/writes auth cookies; used in Server
  Components and Server Actions under the caller's session + RLS.
- `admin.ts` — service-role client, **server-only**, bypasses RLS. Used sparingly
  (seeding, trusted server logic). Service role key never reaches the browser.

## Data model

One Supabase project, five tables. SQL lives in `supabase/migrations/*.sql`,
version-controlled and re-runnable; `supabase/seed.sql` loads the current 8
products.

### `profiles`

Mirrors `auth.users`; a row is auto-created by a signup trigger.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | FK → `auth.users.id`, cascade delete |
| `email` | text | |
| `full_name` | text null | |
| `role` | text | `'admin' \| 'customer'`, default `'customer'`, check constraint |
| `created_at` | timestamptz | default `now()` |

### `products`

Replaces the hardcoded array.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | default `gen_random_uuid()` |
| `slug` | text | unique, not null |
| `name` | text | not null |
| `brand` | text | not null |
| `category` | text | not null (e.g. `ANTA`, `Basketball`, `Under Armour`, `Clogs`) |
| `price` | int | pesos, not null |
| `original_price` | int null | |
| `availability` | text | `'On Hand' \| 'Pre-Order'` |
| `colorway` | text | |
| `rating` | numeric(2,1) | default `0` |
| `reviews` | int | default `0` |
| `authentic` | bool | default `true` |
| `tagline` | text | |
| `description` | text | |
| `sizes` | jsonb | array of numbers |
| `gradient` | jsonb | `{ from, to, accent }` |
| `featured` | bool | default `false` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`, bumped by trigger |

### `orders` (Phase 2)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `order_number` | text | short human ID, unique (e.g. `SC-XXXXXX`) |
| `customer_id` | uuid null | FK → `profiles.id`, null = guest |
| `contact_name` | text | not null |
| `contact_email` | text | not null |
| `contact_phone` | text | |
| `shipping_address` | jsonb | `{ line1, line2, city, province, postal, country }` |
| `status` | `order_status` enum | `pending \| paid \| shipped \| cancelled`, default `pending` |
| `subtotal` | int | pesos |
| `total` | int | pesos |
| `note` | text null | |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`, trigger |

### `order_items` (Phase 2)

Snapshots product details so order history is immutable across product edits.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `order_id` | uuid | FK → `orders.id`, cascade delete |
| `product_id` | uuid null | FK → `products.id`, set null on product delete |
| `product_slug` | text | snapshot |
| `product_name` | text | snapshot |
| `brand` | text | snapshot |
| `unit_price` | int | snapshot, pesos |
| `size` | numeric | |
| `qty` | int | |
| `gradient` | jsonb | snapshot |

## Auth & Row-Level Security

A `SECURITY DEFINER` helper `is_admin()` returns whether `auth.uid()`'s profile
has `role='admin'`, without triggering recursive RLS.

- **`products`**: public `SELECT` (anon + authenticated); `INSERT/UPDATE/DELETE`
  only when `is_admin()`.
- **`profiles`**: user reads/updates their own row; admins read all. `role` is
  not self-editable (enforced by policy / column privileges); promote the first
  admin manually in the Supabase dashboard.
- **`orders` / `order_items`**: `INSERT` allowed for anyone incl. anon (guest
  checkout). `SELECT`: customer sees rows where `customer_id = auth.uid()`;
  admins see all. `UPDATE` (status) only `is_admin()`. Guests rely on the
  insert's returned row for confirmation, not a later read.

Defense in depth: `/admin` is also gated by middleware (session + role check),
and each admin Server Action re-checks `is_admin()` server-side.

## Phase 1 — Foundation + Products

**Deliverables**

1. Install `@supabase/supabase-js`, `@supabase/ssr`.
2. Env: `.env.example` + gitignored `.env.local`. Vars:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. **User creates the Supabase project and supplies
   keys.**
3. Migrations: `profiles`, `products`, `is_admin()`, signup trigger,
   `updated_at` triggers, RLS policies for `profiles` + `products`.
4. `seed.sql` loads the current 8 products.
5. Supabase client factories (`client.ts`, `server.ts`, `admin.ts`).
6. Rewrite `src/lib/products.ts` to be DB-backed with the **same public API**:
   `getProducts()`, `getProduct(slug)`, `getFeatured()`, `getRelated()`,
   `getCategories()`, all async. Keep the `Product` TS type as the client-facing
   contract; add a `mapRow` snake→camel mapper in one place.
7. Update storefront server components to `await` the new async functions:
   `src/app/page.tsx` / home `FeaturedProducts`, `src/app/products/page.tsx` +
   `ProductsExplorer`, `src/app/products/[slug]/page.tsx`. `generateStaticParams`
   becomes an async DB query; unknown slug → `notFound()`. Add
   `export const revalidate = 60`.
8. `src/middleware.ts` — protect `/admin/**`, redirect unauthenticated/non-admin
   to `/admin/login`.
9. Admin panel:
   - `/admin/login` — email/password sign-in.
   - `/admin` — dashboard with product (and later order) counts.
   - `/admin/products` — searchable/filterable table, Edit/Delete, "New".
   - `/admin/products/new` + `/admin/products/[id]` — full product form
     (gradient color picker for the 3 values, sizes editor).
   - Server Actions for create/update/delete, each re-checking `is_admin()`,
     returning `{ ok, error }`, firing `revalidatePath` on success, driving
     Sonner toasts. Deletes confirm first.

**Acceptance**

- Storefront renders products from Supabase (home featured, /products grid+
  filters, product detail + related).
- Non-admins cannot reach `/admin`; a seeded admin can log in.
- Admin can create/edit/delete a product and see it reflected on the storefront.
- RLS: a non-admin cannot write products even via direct API.

## Phase 2 — Orders + checkout

**Deliverables**

1. Migrations: `order_status` enum, `orders`, `order_items`, RLS policies, a
   `place_order` Postgres RPC (atomic insert of order + items).
2. `src/lib/orders.ts` — order reads/writes.
3. `/checkout` — form for contact + shipping; prefills from profile if signed
   in. Reads cart from `localStorage` (existing `CartContext`).
4. `placeOrder` Server Action: re-reads current product prices from the DB
   (never trusts client prices), computes `subtotal`/`total`, calls the
   `place_order` RPC (order + snapshotted items atomically), returns
   `order_number`. Sets `customer_id` when signed in, else null.
5. `/checkout/success/[orderNumber]` — confirmation; cart clears.
6. `/admin/orders` — table with status filter; detail view with line items and a
   status dropdown (`pending → paid → shipped/cancelled`) via admin Server
   Action.
7. `/admin` dashboard shows order counts by status.

**Acceptance**

- A guest can complete checkout; an `order` + `order_items` are written with
  server-computed totals and product snapshots.
- Admin sees orders and can change status.
- A customer cannot read another customer's orders (RLS).

## Phase 3 — Customer accounts

**Deliverables**

1. `/account/register` + `/account/login` (Supabase Auth; `role='customer'` via
   signup trigger).
2. `/account/orders` — signed-in customer's own orders (RLS-scoped), with detail.
3. Checkout prefill + auto-link `customer_id` when signed in.
4. Navbar: conditional account/login link based on session.

**Acceptance**

- A customer can register, log in, check out (order linked to their account),
  and view only their own order history.
- Guest checkout still works unchanged.

## Error handling

- Server Actions return `{ ok: boolean, error?: string }`; forms surface errors
  via Sonner toasts + inline messages.
- RLS denials fail safe: reads return empty, writes are rejected — no crash.
- Checkout validates the cart server-side; empty/invalid carts are rejected with
  a clear message.
- Unknown product slug → `notFound()`.

## Testing / verification

No test harness exists; keep verification lightweight:

- `next build` / type-check passes.
- Manual browser-preview round-trips: admin login → CRUD a product → confirm on
  storefront; guest checkout writes an order; non-admin blocked from `/admin`.

An automated runner (e.g. Vitest + Playwright) is optional future work, out of
scope here.

## Implementation notes

- **Next 16 is not standard Next** (`AGENTS.md`): read the relevant
  `node_modules/next/dist/docs/` guides (middleware, server actions, data
  fetching, cookies) before writing code.
- Reuse existing shadcn/ui components already in the repo (Button, Card, Select,
  Badge, Sheet, Sonner, Breadcrumb, Tabs, Skeleton).
- Keep the `Product` type and `CartContext` interfaces stable to minimize
  storefront churn.

## File structure (target)

```
supabase/
  migrations/*.sql        # tables, enum, RLS, is_admin(), triggers, place_order RPC
  seed.sql                # 8 existing products
src/
  middleware.ts           # protect /admin/**
  lib/
    supabase/client.ts    # browser client
    supabase/server.ts    # server client (cookies + RLS)
    supabase/admin.ts     # service-role client (server-only)
    products.ts           # DB-backed, same public API + Product type + mapRow
    orders.ts             # order reads/writes (Phase 2)
  app/
    admin/
      layout.tsx
      login/page.tsx
      page.tsx            # dashboard
      products/page.tsx           # list
      products/new/page.tsx       # create
      products/[id]/page.tsx      # edit
      orders/page.tsx             # Phase 2
      _actions.ts                 # admin server actions
    checkout/page.tsx             # Phase 2
    checkout/success/[orderNumber]/page.tsx
    account/login/page.tsx        # Phase 3
    account/register/page.tsx
    account/orders/page.tsx
.env.example
```
