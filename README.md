# SoleCity

SoleCity is a sneaker and clogs boutique e-commerce app for a Cebu City-based
shop selling authentic ANTA, Under Armour, and clog pairs. It's a full
Next.js App Router storefront with a Supabase-backed catalog, guest and
customer checkout, customer accounts, and an admin dashboard — no third-party
e-commerce platform involved.

## Tech stack

- **[Next.js](https://nextjs.org) 16** (App Router, Server Components + Server Actions) with **React 19**
- **[Supabase](https://supabase.com)** — Postgres, Auth, and Row Level Security as the entire backend
- **Tailwind CSS v4** with **[shadcn/ui](https://ui.shadcn.com)** and **[Base UI](https://base-ui.com)** primitives (`Autocomplete`, `NavigationMenu`, `Sheet`, `Menu`, etc.)
- **TypeScript** throughout
- `next-themes` for light/dark mode, `sonner` for toasts, `lucide-react` for icons

> **Note:** this project runs on Next.js 16, which has meaningful breaking
> changes from earlier versions (e.g. `middleware.ts` is now `proxy.ts`).
> See [`AGENTS.md`](./AGENTS.md) before assuming APIs match your training data.

## Features

**Storefront**
- Home page, full catalog (`/products`) with category filters, price
  sorting, and text search
- A navbar search bar with live autocomplete suggestions (thumbnail, name,
  brand/category, price) backed by the same product data as the catalog
- Product detail pages with related-product suggestions
- Every product illustration is a generated SVG (`ShoeArt`) recolored per
  product — there's no product photography, so the whole storefront works
  without any image hosting

**Cart & checkout**
- Client-side cart (React Context + `localStorage`), no server round-trip
  needed to add/remove items
- Guest checkout — no account required. Submitted orders never trust
  client-sent prices: a single Postgres RPC (`place_order`) re-reads prices
  server-side and writes the order atomically
- Order confirmation page with a generated order number

**Customer accounts**
- Email/password auth via Supabase Auth (register, sign in, sign out)
- Signed-in customers see their order history and order detail pages
- The navbar reflects auth state live (sign-in link vs. account icon)

**Admin dashboard**
- Separate login, gated by a `role = 'admin'` check on the user's profile
- Manage products (create/edit/delete) and orders (view, update status)
- Every admin Server Action re-checks the admin role — the route guard is
  defense in depth, not the only check

## Architecture at a glance

There is no REST API layer (`src/app/api/*` doesn't exist). Data flows
through:
- **Server Components** for reads (catalog, order history, admin lists)
- **Server Actions** for writes (auth, checkout, admin CRUD)
- One Postgres RPC, `place_order`, as the only path that can create an order

Four separate Supabase client factories enforce the trust boundary between
them (`src/lib/supabase/`):
| Client | Used for | Notes |
|---|---|---|
| `public.ts` | Public catalog reads in Server Components | Cookieless, ISR-friendly |
| `client.ts` | Client Components (auth forms, navbar auth state) | Browser client |
| `server.ts` | Server Components/Actions under the caller's session | Respects RLS |
| `admin.ts` | Admin-only writes | `server-only`, service-role key, bypasses RLS |

Route protection is layered: `src/proxy.ts` (Next 16's renamed
`middleware.ts`) redirects anonymous requests away from `/admin/**` and
`/account/**`, and each protected route group's layout re-checks the
session server-side before rendering.

### Route map

| Route | Purpose |
|---|---|
| `/` | Home |
| `/products` | Catalog — filter, sort, search |
| `/products/[slug]` | Product detail |
| `/checkout`, `/checkout/success/[orderNumber]` | Guest/customer checkout |
| `/account/login`, `/account/register` | Customer auth |
| `/account/orders`, `/account/orders/[id]` | Customer order history (protected) |
| `/admin/login` | Admin auth |
| `/admin`, `/admin/products*`, `/admin/orders*` | Admin dashboard (protected) |

### Data model

Postgres tables (see `supabase/migrations/`):
- `profiles` — one row per Supabase Auth user, auto-created on signup, holds `role` (`admin`/`customer`)
- `products` — catalog rows; prices are stored as integer pesos, sizes and gradient colors as `jsonb`
- `orders` / `order_items` — orders reference a customer optionally (guest checkout allowed); order items are an immutable snapshot of price/name/etc. at time of purchase, independent of later catalog edits

## Getting started

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

The database schema and RLS policies live in `supabase/migrations/` and are
applied manually via the Supabase SQL Editor (see `docs/superpowers/specs/`
for the full backend design rationale).

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```
