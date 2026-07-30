# Phase 1 — Foundation + Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Supabase, move the product catalog into the database, and add an admin panel where an authenticated admin can CRUD products — with the storefront reading products from Supabase.

**Architecture:** Server Components read the public catalog through a cookieless anon Supabase client (ISR-friendly). All writes go through Server Actions guarded by an `is_admin()` re-check; Postgres RLS enforces admin-only writes and public reads. Admin routes are additionally gated by `proxy.ts` (Next 16's renamed middleware) plus a server-side role check in the admin layout.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19, TypeScript, `@supabase/supabase-js`, `@supabase/ssr`, existing shadcn/ui components, Sonner toasts.

## Global Constraints

- **Next.js is 16.2.12 — NOT standard Next.** Middleware is renamed to **`proxy.ts`** (root function `proxy`, Node.js runtime by default). `cookies()` from `next/headers` is **async** (`await cookies()`). Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Money is integer pesos** (`6490` = ₱6,490). No decimals in `price` / `original_price`.
- **`sizes` and `gradient` are `jsonb`** (array of numbers; `{from,to,accent}`).
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` is server-only — never import it into a client component or a `NEXT_PUBLIC_` path. `.env.local` is gitignored; `.env.example` is committed.
- **Security lives in the DB (RLS).** The UI/proxy are convenience gates; every admin Server Action must re-check `is_admin()` server-side (a proxy matcher that excludes a path also skips Server Actions on it).
- **No automated test harness exists** and the spec keeps it out of scope. Each task's verification is `npx tsc --noEmit` and/or `npm run build`, plus the browser-preview / script checks specified. Do not add a test runner.
- **Preserve public contracts:** keep the `Product`, `Category`, `Availability` types and the `CartContext` interface stable so storefront churn stays minimal.
- Env is loaded into scripts with Node's native `node --env-file=.env.local <script>` (Node 24 is installed).

## Prerequisite (already done)

- `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.example` committed; `.gitignore` has `!.env.example`.

## File Structure

```
supabase/
  migrations/0001_init.sql   # profiles, products, is_admin(), triggers, RLS, grants
scripts/
  seed.mjs                   # upsert 8 products via service-role client
  create-admin.mjs           # create an auth user + set profile.role='admin'
  check-db.mjs               # connectivity/RLS smoke check (anon select)
src/
  proxy.ts                   # gate /admin/** (session presence + redirect)
  lib/
    supabase/public.ts       # cookieless anon client (public catalog reads)
    supabase/client.ts       # browser client (@supabase/ssr) for login form
    supabase/server.ts       # cookie server client (@supabase/ssr) for auth contexts
    supabase/admin.ts        # service-role client (server-only)
    supabase/auth.ts         # getCurrentUser(), isAdmin(), requireAdmin()
    products.ts              # DB-backed, SAME public API + Product type + mapRow
  app/
    admin/layout.tsx         # admin shell + server-side role guard + sign-out
    admin/login/page.tsx     # email/password sign-in (client form)
    admin/page.tsx           # dashboard (product count)
    admin/products/page.tsx  # product list table (+ delete)
    admin/products/product-form.tsx   # shared client form (create/edit)
    admin/products/new/page.tsx
    admin/products/[id]/page.tsx
    admin/actions.ts         # signInAdmin, signOutAdmin, create/update/deleteProduct
```

---

## Task 1: Dependencies + Supabase client factories

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/lib/supabase/public.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/auth.ts`

**Interfaces:**
- Produces:
  - `createPublicClient(): SupabaseClient` — cookieless anon, for public reads.
  - `createBrowserSupabaseClient(): SupabaseClient` — for client components.
  - `createServerSupabaseClient(): Promise<SupabaseClient>` — cookie-bound, session-aware.
  - `createAdminClient(): SupabaseClient` — service role, server-only.
  - `getCurrentUser(): Promise<User | null>`, `isAdmin(): Promise<boolean>`, `requireAdmin(): Promise<void>` (redirects to `/admin/login` when not admin).

- [ ] **Step 1: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create the cookieless public client**

`src/lib/supabase/public.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

// Cookieless anon client for PUBLIC catalog reads. No session => Server
// Components using it stay cacheable/ISR-friendly. RLS allows public SELECT.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

- [ ] **Step 3: Create the browser client**

`src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

// For Client Components (e.g. the admin login form).
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Create the cookie-bound server client**

`src/lib/supabase/server.ts` — note `cookies()` is async in Next 16, and `setAll` must swallow errors when invoked during Server Component render (proxy refreshes the cookies):

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — ignore; proxy.ts
            // is responsible for writing refreshed session cookies.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Create the service-role client (server-only)**

`src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Full-access, RLS-bypassing client. NEVER import into client code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

- [ ] **Step 6: Create auth helpers**

`src/lib/supabase/auth.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

// Use at the top of admin server components / actions.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
```

- [ ] **Step 7: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). If `server-only` is unresolved, it ships with Next — confirm `node_modules/server-only` exists.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/supabase
git commit -m "feat: add Supabase client factories and auth helpers"
```

---

## Task 2: Database schema + RLS migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `scripts/check-db.mjs`

**Interfaces:**
- Produces (in DB): tables `public.profiles`, `public.products`; functions `public.is_admin()`, `public.handle_new_user()`, `public.set_updated_at()`; RLS policies; grants.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0001_init.sql`:

```sql
-- Extensions ---------------------------------------------------------------
create extension if not exists pgcrypto;

-- profiles -----------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);

-- products -----------------------------------------------------------------
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  brand          text not null,
  category       text not null,
  price          integer not null,
  original_price integer,
  availability   text not null default 'On Hand',
  colorway       text,
  rating         numeric(2,1) not null default 0,
  reviews        integer not null default 0,
  authentic      boolean not null default true,
  tagline        text,
  description    text,
  sizes          jsonb not null default '[]'::jsonb,
  gradient       jsonb not null default '{}'::jsonb,
  featured       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at maintenance ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- is_admin(): security definer avoids recursive RLS on profiles ------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- auto-create a profile row when an auth user is created -------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- profiles: a user reads own row; admins read all. No self-update in Phase 1
-- (prevents role self-escalation; customer profile editing arrives Phase 3).
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- products: public read; admin-only writes.
create policy products_public_read on public.products
  for select using (true);

create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());

create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- Grants (RLS is the ceiling narrower; roles still need table privileges) --
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;
```

- [ ] **Step 2: Apply the migration**

DDL needs database-level access (the service-role REST key cannot run DDL). Apply via the **Supabase dashboard → SQL Editor**: paste the entire contents of `supabase/migrations/0001_init.sql` and Run.

> Executor note: this is the one manual step. Ask the user to paste + run the SQL (or to provide the project's direct Postgres connection string / set up the Supabase CLI if they prefer automated application), then continue.

- [ ] **Step 3: Write the connectivity/RLS smoke check**

`scripts/check-db.mjs`:

```js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.from("products").select("id");
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
console.log(`OK: products readable via anon, count=${data.length}`);
```

- [ ] **Step 4: Run the smoke check**

Run: `node --env-file=.env.local scripts/check-db.mjs`
Expected: `OK: products readable via anon, count=0` (empty before seeding, but no RLS/permission error).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_init.sql scripts/check-db.mjs
git commit -m "feat: initial Supabase schema, RLS, and connectivity check"
```

---

## Task 3: Seed products + create admin user

**Files:**
- Create: `scripts/seed.mjs`, `scripts/create-admin.mjs`

**Interfaces:**
- Consumes: `createAdminClient` semantics (service-role over PostgREST — can INSERT/UPSERT and call `auth.admin.createUser`, bypassing RLS).
- Produces: 8 product rows; one admin auth user with `profiles.role='admin'`.

- [ ] **Step 1: Write the seed script**

`scripts/seed.mjs` (snake_case columns; data copied from the original `src/lib/products.ts`):

```js
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const US = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12];
const CLOG = [6, 7, 8, 9, 10, 11];

const products = [
  { slug: "anta-kai-1-speed", name: "ANTA Kai 1 “Speed”", brand: "ANTA", category: "Basketball", price: 6490, original_price: 7290, availability: "On Hand", colorway: "Nebula Violet", rating: 4.9, reviews: 128, authentic: true, tagline: "Kyrie's signature glide, engineered for the hardwood.", description: "The ANTA Kai 1 pairs a featherlight woven upper with a springy nitrogen-infused midsole for effortless directional changes. Built for guards who live in the paint.", sizes: US, gradient: { from: "#7c3aed", to: "#4f1d96", accent: "rgba(255,255,255,0.9)" }, featured: true },
  { slug: "anta-shock-wave-5", name: "ANTA Shock Wave 5", brand: "ANTA", category: "ANTA", price: 5290, original_price: null, availability: "On Hand", colorway: "Cyber Cyan", rating: 4.8, reviews: 94, authentic: true, tagline: "Responsive cushioning that never quits.", description: "A daily trainer turned court weapon. The Shock Wave 5 uses A-FlashFoam Middle for lightweight rebound, wrapped in a breathable engineered mesh.", sizes: US, gradient: { from: "#22d3ee", to: "#0e7490", accent: "rgba(255,255,255,0.92)" }, featured: true },
  { slug: "ua-curry-flow-11", name: "Under Armour Curry Flow 11", brand: "Under Armour", category: "Under Armour", price: 8990, original_price: 9990, availability: "On Hand", colorway: "Splash Pink", rating: 5.0, reviews: 212, authentic: true, tagline: "Frictionless Flow traction, championship pedigree.", description: "Chef Curry's eleventh signature features UA Flow — a foam-only outsole that eliminates rubber for absurd grip and a whisper-light ride.", sizes: US, gradient: { from: "#f0abfc", to: "#a21caf", accent: "rgba(255,255,255,0.95)" }, featured: true },
  { slug: "ua-hovr-phantom-4", name: "Under Armour HOVR Phantom 4", brand: "Under Armour", category: "Under Armour", price: 7490, original_price: null, availability: "Pre-Order", colorway: "Midnight Ink", rating: 4.7, reviews: 67, authentic: true, tagline: "Zero-gravity feel for the daily miles.", description: "The HOVR Phantom 4 delivers a plush, energy-returning ride in a slip-on knit collar. Connected UA MapMyRun tech tracks every step.", sizes: US, gradient: { from: "#334155", to: "#0f172a", accent: "rgba(168,196,255,0.9)" }, featured: false },
  { slug: "anta-gh3-gordon", name: "ANTA GH3 “Gordon Hayward”", brand: "ANTA", category: "Basketball", price: 6990, original_price: null, availability: "On Hand", colorway: "Aurora Mint", rating: 4.6, reviews: 51, authentic: true, tagline: "Lockdown support, all-position versatility.", description: "A stability-first silhouette with a wide base and multi-directional traction pods. The GH3 keeps you planted through every cut.", sizes: US, gradient: { from: "#34d399", to: "#0f766e", accent: "rgba(255,255,255,0.9)" }, featured: false },
  { slug: "solecity-cloud-clog", name: "SoleCity Cloud Clog", brand: "SoleCity", category: "Clogs", price: 1890, original_price: 2290, availability: "On Hand", colorway: "Sunset Coral", rating: 4.8, reviews: 176, authentic: true, tagline: "Marshmallow-soft recovery, all-day comfort.", description: "Slip into a cloud. The Cloud Clog uses ultra-cushioned EVA and a ventilated upper — the perfect post-game recovery slide or errand-day companion.", sizes: CLOG, gradient: { from: "#fb923c", to: "#c2410c", accent: "rgba(255,255,255,0.95)" }, featured: true },
  { slug: "anta-clog-drift", name: "ANTA Drift Clog", brand: "ANTA", category: "Clogs", price: 2190, original_price: null, availability: "Pre-Order", colorway: "Glacier Blue", rating: 4.5, reviews: 38, authentic: true, tagline: "Sporty slip-on with a grippy lug sole.", description: "A rugged clog with a contoured footbed and aggressive lugs. Water-friendly and stupid comfortable — built for the Cebu heat.", sizes: CLOG, gradient: { from: "#60a5fa", to: "#1d4ed8", accent: "rgba(255,255,255,0.92)" }, featured: false },
  { slug: "ua-spawn-6", name: "Under Armour Spawn 6", brand: "Under Armour", category: "Basketball", price: 6790, original_price: null, availability: "On Hand", colorway: "Volt Strike", rating: 4.7, reviews: 83, authentic: true, tagline: "Budget-proof performance for every playmaker.", description: "The Spawn 6 punches above its price with Micro-G cushioning and a supportive TPU cage. A team-shoe favourite that just keeps hooping.", sizes: US, gradient: { from: "#a3e635", to: "#4d7c0f", accent: "rgba(20,20,20,0.85)" }, featured: false },
];

const { error } = await admin.from("products").upsert(products, { onConflict: "slug" });
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
console.log(`Seeded ${products.length} products`);
```

- [ ] **Step 2: Run the seed**

Run: `node --env-file=.env.local scripts/seed.mjs`
Expected: `Seeded 8 products`. Re-running is safe (upsert on `slug`).

- [ ] **Step 3: Verify via the smoke check**

Run: `node --env-file=.env.local scripts/check-db.mjs`
Expected: `OK: products readable via anon, count=8`.

- [ ] **Step 4: Write the create-admin script**

`scripts/create-admin.mjs`:

```js
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

// handle_new_user trigger already inserted the profile as 'customer'; promote it.
const { error: upErr } = await admin
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", data.user.id);
if (upErr) {
  console.error("FAIL promoting:", upErr.message);
  process.exit(1);
}
console.log(`Admin created: ${email} (${data.user.id})`);
```

- [ ] **Step 5: Create an admin user**

Run (choose a real email + strong password; these are the admin login creds):

```bash
node --env-file=.env.local scripts/create-admin.mjs admin@solecity.local "ChangeMe-Strong-1"
```

Expected: `Admin created: admin@solecity.local (<uuid>)`.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.mjs scripts/create-admin.mjs
git commit -m "feat: seed products and admin-user provisioning scripts"
```

---

## Task 4: DB-backed `products.ts` (same public API)

**Files:**
- Modify (rewrite body): `src/lib/products.ts`
- Create: `scripts/check-products-lib.mjs`

**Interfaces:**
- Consumes: `createPublicClient` (Task 1).
- Produces (unchanged names, now async):
  - `getProducts(): Promise<Product[]>`
  - `getProduct(slug: string): Promise<Product | null>`
  - `getFeatured(): Promise<Product[]>`
  - `getRelated(slug: string, category: Category): Promise<Product[]>`
  - `getCategories(): Promise<Array<{ label: Category | "All"; count: number }>>`
  - Keeps exported types `Product`, `Category`, `Availability`.

- [ ] **Step 1: Rewrite `src/lib/products.ts`**

Keep the type block; replace the static array + helpers with DB queries and a mapper:

```ts
import { createPublicClient } from "@/lib/supabase/public";

export type Category = "ANTA" | "Basketball" | "Under Armour" | "Clogs";
export type Availability = "On Hand" | "Pre-Order";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  originalPrice?: number;
  availability: Availability;
  colorway: string;
  rating: number;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured?: boolean;
};

type ProductRow = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  availability: string;
  colorway: string;
  rating: number | string;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured: boolean;
};

function mapRow(r: ProductRow): Product {
  return {
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    category: r.category as Category,
    price: r.price,
    originalPrice: r.original_price ?? undefined,
    availability: r.availability as Availability,
    colorway: r.colorway,
    rating: Number(r.rating),
    reviews: r.reviews,
    authentic: r.authentic,
    tagline: r.tagline,
    description: r.description,
    sizes: r.sizes ?? [],
    gradient: r.gradient,
    featured: r.featured,
  };
}

const COLUMNS =
  "slug,name,brand,category,price,original_price,availability,colorway,rating,reviews,authentic,tagline,description,sizes,gradient,featured";

export async function getProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as ProductRow);
}

export async function getFeatured(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("featured", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getRelated(slug: string, category: Category): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("category", category)
    .neq("slug", slug)
    .limit(3);
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapRow);
}

export async function getCategories(): Promise<Array<{ label: Category | "All"; count: number }>> {
  const all = await getProducts();
  const labels: Category[] = ["ANTA", "Basketball", "Under Armour", "Clogs"];
  return [
    { label: "All", count: all.length },
    ...labels.map((label) => ({
      label,
      count: all.filter((p) => p.category === label).length,
    })),
  ];
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors ONLY in files that call the now-async helpers synchronously (the storefront — fixed in Task 5). If you see errors elsewhere, fix them. Note the callers to update: `src/app/products/[slug]/page.tsx`, `src/components/home/FeaturedProducts.tsx`, `src/components/products/ProductsExplorer.tsx`.

- [ ] **Step 3: Write a lib check (uses the compiled TS via a tiny runner)**

Because the lib imports `@/` aliases and Supabase, verify it through the app build in Task 5 rather than a standalone node import. For now, add `scripts/check-products-lib.mjs` that re-implements the fetch against PostgREST to confirm data shape:

```js
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { data } = await supabase.from("products").select("slug,featured,category").eq("featured", true);
console.log("featured:", data.map((p) => p.slug));
```

Run: `node --env-file=.env.local scripts/check-products-lib.mjs`
Expected: 4 featured slugs (`anta-kai-1-speed`, `anta-shock-wave-5`, `ua-curry-flow-11`, `solecity-cloud-clog`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts scripts/check-products-lib.mjs
git commit -m "feat: back products.ts with Supabase (same public API)"
```

---

## Task 5: Wire the storefront to async data

**Files:**
- Modify: `src/components/home/FeaturedProducts.tsx` (make async, await `getFeatured()`)
- Modify: `src/components/products/ProductsExplorer.tsx` (accept `products` + `categories` as props)
- Modify: `src/app/products/page.tsx` (fetch server-side, pass props)
- Modify: `src/app/products/[slug]/page.tsx` (await helpers; async `generateStaticParams`)

**Interfaces:**
- Consumes: `getProducts`, `getFeatured`, `getProduct`, `getRelated`, `getCategories` (Task 4).
- Produces: `ProductsExplorer` new prop signature `{ products: Product[]; categories: Array<{ label: Category | "All"; count: number }> }`.

- [ ] **Step 1: Make `FeaturedProducts` async**

In `src/components/home/FeaturedProducts.tsx`, change the function to async and await:

```tsx
export async function FeaturedProducts() {
  const featured = await getFeatured();
  // ...unchanged JSX below
```

(The home `page.tsx` renders `<FeaturedProducts />`; an async Server Component child is fine — no change needed there.)

- [ ] **Step 2: Convert `ProductsExplorer` to props**

It is a Client Component (`"use client"`) so it cannot fetch server-side. Replace the direct import of `products`/`categories` with props. Change the top and signature:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, Category } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
// ...Button, Select, Reveal imports unchanged

type Filter = Category | "All";
type Sort = "featured" | "low" | "high";

type Props = {
  products: Product[];
  categories: Array<{ label: Filter; count: number }>;
};

// ...isFilter and sortLabels unchanged

export function ProductsExplorer({ products, categories }: Props) {
  const params = useSearchParams();
  const initial = params.get("category");
  const [active, setActive] = useState<Filter>(isFilter(initial) ? initial : "All");
  const [sort, setSort] = useState<Sort>("featured");

  const visible = useMemo(() => {
    let list = active === "All" ? products : products.filter((p) => p.category === active);
    list = [...list];
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [active, sort, products]);

  // ...rest of the JSX unchanged (it already reads `categories` and `visible`)
}
```

- [ ] **Step 3: Fetch in the products page and pass props**

`src/app/products/page.tsx` — fetch server-side inside the Suspense boundary. Replace the body:

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts, getCategories } from "@/lib/products";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";

export const metadata: Metadata = {
  title: "Shop all sneakers & clogs",
  description:
    "Browse every authentic pair at SOLECITY — ANTA, Under Armour, basketball shoes and clogs. Filter by category and ship nationwide.",
};

export const revalidate = 60;

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductsExplorer products={products} categories={categories} />
    </Suspense>
  );
}
```

- [ ] **Step 4: Update the product detail page**

`src/app/products/[slug]/page.tsx` — helpers are now async; `generateStaticParams` queries the DB:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelated, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/products/ProductDetail";

type Params = { slug: string };

export const revalidate = 60;

export async function generateStaticParams(): Promise<Params[]> {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.colorway}`,
    description: product.tagline,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await getRelated(product.slug, product.category);
  return <ProductDetail product={product} related={related} />;
}
```

- [ ] **Step 5: Build the app**

Run: `npm run build`
Expected: build succeeds; `/products` and `/products/[slug]` compile. Type errors from Task 4's async change should now be resolved.

- [ ] **Step 6: Verify in the browser preview**

Start the dev server (via the preview tool, `name: "solecity dev"` → `npm run dev`), then:
- Load `/` — the Featured section shows the 4 featured pairs.
- Load `/products` — grid shows 8, category filters + counts work, sort works.
- Load `/products/anta-kai-1-speed` — detail renders with related items.
- Load `/products/does-not-exist` — 404.

Use `read_console_messages` to confirm no runtime errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/FeaturedProducts.tsx src/components/products/ProductsExplorer.tsx src/app/products/page.tsx "src/app/products/[slug]/page.tsx"
git commit -m "feat: storefront reads products from Supabase"
```

---

## Task 6: Admin auth (proxy guard + login + layout)

**Files:**
- Create: `src/proxy.ts`
- Create: `src/app/admin/actions.ts` (sign-in / sign-out actions)
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx` (dashboard)

**Interfaces:**
- Consumes: `createServerClient` from `@supabase/ssr`, `createServerSupabaseClient`, `isAdmin`, `getCurrentUser`.
- Produces: `signInAdmin(prevState, formData): Promise<{ error?: string }>`, `signOutAdmin(): Promise<void>`.

- [ ] **Step 1: Create `src/proxy.ts`**

Refreshes the session and gates `/admin/**` (except `/admin/login`) on session presence. The role check happens in the layout (Node render), per Next's guidance not to rely on proxy alone.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";
  if (path.startsWith("/admin") && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Create sign-in / sign-out actions**

`src/app/admin/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/auth";

export async function signInAdmin(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    return { error: "This account is not an admin." };
  }
  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
```

- [ ] **Step 3: Create the login page**

`src/app/admin/login/page.tsx` (Client Component using `useActionState`):

```tsx
"use client";

import { useActionState } from "react";
import { signInAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signInAdmin, undefined);
  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Admin sign in</h1>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create the admin layout with the role guard**

`src/app/admin/layout.tsx` — guards every admin page except login (login has no session yet). Because the layout also wraps `/admin/login`, only enforce the role check when NOT on the login route; simplest is to guard in each page via `requireAdmin()`, but a shared guard is DRY. Implement the guard here and let `/admin/login` render its own minimal tree by checking the header path is not feasible in a layout — instead, keep `/admin/login` OUTSIDE this layout by putting the guard in a nested segment. Use a route group:

Move protected pages under `src/app/admin/(protected)/` sharing a guarded layout, and keep `login` directly under `admin`:

```
src/app/admin/
  login/page.tsx          # public
  (protected)/layout.tsx  # guard + chrome
  (protected)/page.tsx    # dashboard
  (protected)/products/... # Tasks 7-8
```

`src/app/admin/(protected)/layout.tsx`:

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { signOutAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between border-b pb-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold">Dashboard</Link>
          <Link href="/admin/products" className="text-muted-foreground hover:text-foreground">Products</Link>
        </nav>
        <form action={signOutAdmin}>
          <Button variant="outline" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
```

> Note: update the file paths in Tasks 7–8 to live under `src/app/admin/(protected)/products/…`. The route group `(protected)` does not appear in the URL, so paths remain `/admin/products`.

- [ ] **Step 5: Create the dashboard**

`src/app/admin/(protected)/page.tsx`:

```tsx
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
```

- [ ] **Step 6: Build + verify auth flow in the preview**

Run: `npm run build` (expect success), then in the browser preview:
- Visit `/admin` while logged out → redirected to `/admin/login`.
- Sign in with a NON-admin (optional: register one later) → rejected with "not an admin"; sign in with the admin created in Task 3 → lands on `/admin` dashboard showing product count 8.
- Click "Sign out" → back to `/admin/login`; `/admin` redirects again.

- [ ] **Step 7: Commit**

```bash
git add src/proxy.ts src/app/admin
git commit -m "feat: admin auth — proxy guard, login, protected layout, dashboard"
```

---

## Task 7: Admin products list + delete

**Files:**
- Create: `src/app/admin/(protected)/products/page.tsx`
- Modify: `src/app/admin/actions.ts` (add `deleteProduct`)
- Create: `src/app/admin/(protected)/products/delete-button.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient`, `isAdmin`, `revalidatePath`.
- Produces: `deleteProduct(id: string): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Add `deleteProduct` action**

Append to `src/app/admin/actions.ts`:

```ts
import { revalidatePath } from "next/cache";

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/admin/products");
  return { ok: true };
}
```

- [ ] **Step 2: Create the delete button (client)**

`src/app/admin/(protected)/products/delete-button.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteProduct(id);
          if (res.ok) {
            toast.success("Product deleted");
            router.refresh();
          } else {
            toast.error(res.error ?? "Delete failed");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
```

- [ ] **Step 3: Create the products list page**

`src/app/admin/(protected)/products/page.tsx` (reads via the session server client; admin sees all — same public rows, but keep consistent):

```tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/utils";
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
        <Button asChild size="sm">
          <Link href="/admin/products/new">New product</Link>
        </Button>
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
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/products/${p.id}`}>Edit</Link>
                    </Button>
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
```

- [ ] **Step 4: Build + verify**

Run: `npm run build` (expect success). In the preview (logged in as admin):
- `/admin/products` lists 8 products.
- Delete a product → confirm dialog → toast → row disappears; `/products` no longer shows it.
- Re-run `node --env-file=.env.local scripts/seed.mjs` to restore the deleted row.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin
git commit -m "feat: admin products list with delete"
```

---

## Task 8: Admin product create/edit form

**Files:**
- Modify: `src/app/admin/actions.ts` (add `saveProduct`)
- Create: `src/app/admin/(protected)/products/product-form.tsx`
- Create: `src/app/admin/(protected)/products/new/page.tsx`
- Create: `src/app/admin/(protected)/products/[id]/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient`, `isAdmin`, `revalidatePath`, `Product` type.
- Produces: `saveProduct(input: ProductInput): Promise<{ ok: boolean; error?: string; id?: string }>` where `ProductInput` includes optional `id` (present = update).

- [ ] **Step 1: Add `saveProduct` action + `ProductInput` type**

Append to `src/app/admin/actions.ts`:

```ts
export type ProductInput = {
  id?: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  availability: string;
  colorway: string;
  rating: number;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured: boolean;
};

export async function saveProduct(
  input: ProductInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!input.slug || !input.name) return { ok: false, error: "Slug and name are required." };

  const supabase = await createServerSupabaseClient();
  const row = { ...input };
  delete (row as { id?: string }).id;

  let result;
  if (input.id) {
    result = await supabase.from("products").update(row).eq("id", input.id).select("id").single();
  } else {
    result = await supabase.from("products").insert(row).select("id").single();
  }
  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/admin/products");
  if (input.id) revalidatePath(`/products/${input.slug}`);
  return { ok: true, id: result.data.id };
}
```

- [ ] **Step 2: Create the shared form (client)**

`src/app/admin/(protected)/products/product-form.tsx`. A config-driven form keeps every field present without hundreds of lines. `initial` is `null` for create.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProduct, type ProductInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type Props = { initial: (ProductInput & { id: string }) | null };

const EMPTY: ProductInput = {
  slug: "", name: "", brand: "", category: "ANTA", price: 0, original_price: null,
  availability: "On Hand", colorway: "", rating: 0, reviews: 0, authentic: true,
  tagline: "", description: "", sizes: [], gradient: { from: "#7c3aed", to: "#4f1d96", accent: "rgba(255,255,255,0.9)" },
  featured: false,
};

const CATEGORIES = ["ANTA", "Basketball", "Under Armour", "Clogs"];
const AVAILABILITY = ["On Hand", "Pre-Order"];

export function ProductForm({ initial }: Props) {
  const [form, setForm] = useState<ProductInput>(initial ?? EMPTY);
  const [sizesText, setSizesText] = useState((initial?.sizes ?? []).join(", "));
  const [pending, start] = useTransition();
  const router = useRouter();

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const sizes = sizesText.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    const payload: ProductInput = { ...form, sizes, id: initial?.id };
    start(async () => {
      const res = await saveProduct(payload);
      if (res.ok) {
        toast.success(initial ? "Product updated" : "Product created");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(res.error ?? "Save failed");
      }
    });
  }

  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1"><span className="text-sm font-medium">Slug</span>
          <input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Name</span>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Brand</span>
          <input className={input} value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Category</span>
          <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Price (₱)</span>
          <input type="number" className={input} value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Original price (₱, blank = none)</span>
          <input type="number" className={input} value={form.original_price ?? ""} onChange={(e) => set("original_price", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Availability</span>
          <select className={input} value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Colorway</span>
          <input className={input} value={form.colorway} onChange={(e) => set("colorway", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Rating (0–5)</span>
          <input type="number" step="0.1" className={input} value={form.rating} onChange={(e) => set("rating", Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Reviews</span>
          <input type="number" className={input} value={form.reviews} onChange={(e) => set("reviews", Number(e.target.value))} /></label>
      </div>

      <label className="space-y-1 block"><span className="text-sm font-medium">Sizes (comma-separated)</span>
        <input className={input} value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="7, 7.5, 8, 8.5" /></label>
      <label className="space-y-1 block"><span className="text-sm font-medium">Tagline</span>
        <input className={input} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
      <label className="space-y-1 block"><span className="text-sm font-medium">Description</span>
        <textarea className={input} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="text-sm font-medium">Gradient</legend>
        <label className="space-y-1"><span className="text-xs">From</span>
          <input type="color" className="h-9 w-full" value={form.gradient.from} onChange={(e) => set("gradient", { ...form.gradient, from: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs">To</span>
          <input type="color" className="h-9 w-full" value={form.gradient.to} onChange={(e) => set("gradient", { ...form.gradient, to: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs">Accent (rgba/hex)</span>
          <input className={input} value={form.gradient.accent} onChange={(e) => set("gradient", { ...form.gradient, accent: e.target.value })} /></label>
      </fieldset>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.authentic} onChange={(e) => set("authentic", e.target.checked)} /> Authentic</label>
      </div>

      <div className="flex gap-3">
        <Button disabled={pending} onClick={submit}>{pending ? "Saving…" : "Save"}</Button>
        <Button variant="outline" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the "new" page**

`src/app/admin/(protected)/products/new/page.tsx`:

```tsx
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">New product</h1>
      <div className="mt-6"><ProductForm initial={null} /></div>
    </div>
  );
}
```

- [ ] **Step 4: Create the "edit" page**

`src/app/admin/(protected)/products/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";
import type { ProductInput } from "@/app/admin/actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const initial: ProductInput & { id: string } = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    brand: data.brand,
    category: data.category,
    price: data.price,
    original_price: data.original_price,
    availability: data.availability,
    colorway: data.colorway,
    rating: Number(data.rating),
    reviews: data.reviews,
    authentic: data.authentic,
    tagline: data.tagline,
    description: data.description,
    sizes: data.sizes ?? [],
    gradient: data.gradient,
    featured: data.featured,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit product</h1>
      <div className="mt-6"><ProductForm initial={initial} /></div>
    </div>
  );
}
```

- [ ] **Step 5: Build + verify the full CRUD round-trip**

Run: `npm run build` (expect success). In the preview (admin):
- `/admin/products` → New product → fill fields (unique slug) → Save → toast, redirected to list, new row present.
- Visit `/products/<new-slug>` on the storefront → the product renders (revalidation worked).
- Edit the product (change price, toggle featured) → Save → storefront reflects the change.
- Delete it (Task 7) to clean up.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin
git commit -m "feat: admin product create/edit form with server action + revalidation"
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** Supabase setup ✔ (T1–2), `profiles`+`products`+RLS+`is_admin()`+signup trigger ✔ (T2), seed 8 products ✔ (T3), client factories ✔ (T1), DB-backed `products.ts` same API ✔ (T4), storefront reads DB + revalidate + async `generateStaticParams` ✔ (T5), admin auth via Supabase Auth + role, proxy guard, re-check in actions ✔ (T6), admin product CRUD + toasts + confirm-delete ✔ (T7–8). Orders/customers are Phase 2/3 — separate plans.
- **Placeholder scan:** none — all steps carry real code/SQL/commands.
- **Type consistency:** `ProductInput` defined in T8 matches the form and edit-page usage; `mapRow`/`ProductRow` columns match the T2 schema and T3 seed keys; helper names (`getProducts`, `getProduct`, `getFeatured`, `getRelated`, `getCategories`) are stable T4→T5.
- **Deviations from spec (justified):** (1) `middleware.ts` → **`proxy.ts`** (Next 16 rename). (2) Seeding via a **service-role script** instead of `seed.sql`, because the service key can seed over PostgREST without a DB password; DDL still applied via the SQL Editor. (3) Public catalog reads use a **cookieless anon client** (not the cookie server client) to keep pages ISR-friendly. (4) Admin protected pages live under a `(protected)` route group so `/admin/login` can stay unguarded.
```
