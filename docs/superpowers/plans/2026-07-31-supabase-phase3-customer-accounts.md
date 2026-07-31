# Phase 3 — Customer Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a shopper register/log in with Supabase Auth, have checkout auto-link their orders to their account, browse their own order history at `/account/orders`, and see a conditional account/login link in the navbar — while guest checkout keeps working unchanged.

**Architecture:** Mirrors the existing Phase 1 admin-auth pattern almost exactly: Server Actions returning `{ error? }` driven by `useActionState` for login/register forms, a `requireCustomer()` redirect guard analogous to `requireAdmin()`, a route group `src/app/account/(protected)/` analogous to `src/app/admin/(protected)/`, and `src/proxy.ts` extended to gate `/account/**` the same way it gates `/admin/**`. No new tables, columns, or RLS policies are needed — `orders_select_own_or_admin` and `profiles_select_own_or_admin` (from `0001_init.sql`/`0002_orders.sql`) already scope reads to the signed-in customer, and `place_order` already stamps `customer_id = auth.uid()`, so checkout auto-linking requires zero code changes. The navbar gets its auth-awareness client-side via the browser Supabase client (already defined in `client.ts` but currently unused) instead of threading a user prop through the root layout, so the home/product pages' `revalidate = 60` ISR is not disturbed.

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts` not `middleware.ts`), `@supabase/ssr` + `@supabase/supabase-js`, React 19 `useActionState`/`useTransition`, Tailwind v4, shadcn/ui components built on `@base-ui/react` (not Radix), `sonner` toasts.

## Global Constraints

- No automated test harness exists in this repo by design (see spec's Non-goals). Verification is `npm run build` (type-checks + compiles) and manual browser round-trips via the preview tools — do not add Vitest/Playwright/jest.
- Do not add `react-hook-form` or `zod`. Forms use plain `useState`/`useActionState` + native `<input>` elements styled with the literal class string `"w-full rounded-md border bg-background px-3 py-2 text-sm"`, matching `src/app/admin/login/page.tsx` and `src/app/checkout/checkout-form.tsx`.
- Money is integer pesos; format with `formatPHP` from `src/lib/utils.ts`. Not touched in this phase (no money fields added).
- shadcn components in this repo are built on `@base-ui/react`, not `@radix-ui/react-*`. `DropdownMenuTrigger` takes a `render={<Button .../>}` prop, not `asChild`.
- Server Actions that drive `useActionState` login/register forms return a plain `{ error? }` (or `{ error?; info? }`) object and call `redirect()` on success — they do NOT return `{ ok: boolean }`. This matches `signInAdmin` in `src/app/admin/actions.ts`. Keep that shape for `signInCustomer`/`signUpCustomer` for consistency with the one existing login form in the codebase.
- No new SQL migrations are needed for this phase. Do not add a `profiles` UPDATE policy or any other schema change — profile editing is explicitly out of scope (design doc lists it only for a hypothetical future phase, and the Phase 3 acceptance criteria don't require it).
- `getCurrentUser()` (in `src/lib/supabase/auth.ts`) already exists and returns the Supabase `User | null` for the current cookie session — reuse it, don't write a new one.
- `fetchOrders(supabase)` / `fetchOrderById(supabase, id)` (in `src/lib/orders.ts`) already exist and take an already-constructed `SupabaseClient` — reuse them as-is for the customer's own orders (RLS does the scoping); do not add new query functions.

---

## File structure (this phase)

```
src/
  lib/
    supabase/
      auth.ts                          # MODIFY — add requireCustomer()
  hooks/
    useSupabaseUser.ts                 # NEW — client-side auth-state hook for Navbar
  app/
    account/
      actions.ts                       # NEW — signUpCustomer, signInCustomer, signOutCustomer
      login/page.tsx                   # NEW
      register/page.tsx                # NEW
      (protected)/
        layout.tsx                     # NEW — requireCustomer() guard + sign-out header
        orders/
          page.tsx                     # NEW — own order list
          [id]/page.tsx                # NEW — own order detail (read-only)
  proxy.ts                             # MODIFY — gate /account/** like /admin/**
  components/
    Navbar.tsx                         # MODIFY — conditional account/login link
```

---

### Task 1: `requireCustomer()` guard helper

**Files:**
- Modify: `src/lib/supabase/auth.ts`

**Interfaces:**
- Consumes: existing `getCurrentUser()` in the same file (`export async function getCurrentUser()`), `redirect` from `next/navigation` (already imported in this file).
- Produces: `export async function requireCustomer(): Promise<User>` — later tasks (`account/(protected)/layout.tsx`) call this and redirect to `/account/login` if there's no session.

- [ ] **Step 1: Add `requireCustomer()`**

Open `src/lib/supabase/auth.ts`. It currently ends with:

```ts
// Use at the top of admin server components / actions.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
```

Append, after `requireAdmin`:

```ts

// Use at the top of customer-account server components.
export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds (no other file references `requireCustomer` yet, so this is purely additive).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/auth.ts
git commit -m "feat(account): add requireCustomer() session guard"
```

---

### Task 2: Customer auth Server Actions

**Files:**
- Create: `src/app/account/actions.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from `@/lib/supabase/server`.
- Produces:
  - `export async function signUpCustomer(prev: { error?: string; info?: string } | undefined, formData: FormData): Promise<{ error?: string; info?: string }>` — used by the register page's `useActionState`.
  - `export async function signInCustomer(prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }>` — used by the login page's `useActionState`.
  - `export async function signOutCustomer(): Promise<void>` — used as a plain `<form action={signOutCustomer}>` in `account/(protected)/layout.tsx`.

- [ ] **Step 1: Write the file**

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signUpCustomer(
  _prev: { error?: string; info?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; info?: string }> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName) return { error: "Please enter your name." };
  if (!email) return { error: "Please enter your email." };
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // If the Supabase project requires email confirmation, signUp() returns a
  // user but no session — there's nothing to redirect into yet.
  if (data.session) redirect("/account/orders");
  return { info: "Check your email to confirm your account, then sign in." };
}

export async function signInCustomer(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect("/account/orders");
}

export async function signOutCustomer() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds. `redirect()` calls inside `signUpCustomer`/`signInCustomer` throw `NEXT_REDIRECT` internally — that's expected Next.js behavior, not an error, and the build itself won't exercise them.

- [ ] **Step 3: Commit**

```bash
git add src/app/account/actions.ts
git commit -m "feat(account): add signUpCustomer/signInCustomer/signOutCustomer actions"
```

---

### Task 3: `/account/login` page

**Files:**
- Create: `src/app/account/login/page.tsx`

**Interfaces:**
- Consumes: `signInCustomer` from `@/app/account/actions` (Task 2).

- [ ] **Step 1: Write the page**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AccountLoginPage() {
  const [state, formAction, pending] = useActionState(signInCustomer, undefined);

  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&rsquo;t have an account?{" "}
          <Link
            href="/account/register"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/account/login/page.tsx
git commit -m "feat(account): add /account/login page"
```

---

### Task 4: `/account/register` page

**Files:**
- Create: `src/app/account/register/page.tsx`

**Interfaces:**
- Consumes: `signUpCustomer` from `@/app/account/actions` (Task 2).

- [ ] **Step 1: Write the page**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AccountRegisterPage() {
  const [state, formAction, pending] = useActionState(signUpCustomer, undefined);

  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4 py-10">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.info && <p className="text-sm text-muted-foreground">{state.info}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/account/register/page.tsx
git commit -m "feat(account): add /account/register page"
```

---

### Task 5: Extend `proxy.ts` to gate `/account/**`

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- No new exports; modifies the existing `proxy(request)` function and its `config.matcher`.

- [ ] **Step 1: Update the matcher and add the `/account` branch**

Current file:

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

Replace the body after `const { data: { user } } = ...` and the `config` export with:

```ts
  const path = request.nextUrl.pathname;

  const isAdminLogin = path === "/admin/login";
  if (path.startsWith("/admin") && !isAdminLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  const isAccountAuthPage = path === "/account/login" || path === "/account/register";
  if (path.startsWith("/account") && !isAccountAuthPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
```

Full resulting file:

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

  const isAdminLogin = path === "/admin/login";
  if (path.startsWith("/admin") && !isAdminLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  const isAccountAuthPage = path === "/account/login" || path === "/account/register";
  if (path.startsWith("/account") && !isAccountAuthPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Manual check (requires Tasks 1-4 done and dev server running)**

Start the dev server and, signed out, navigate to `/account/orders` (a route that won't exist until Task 6, so for now navigate to any `/account/*` path, e.g. `/account/login` should load normally — it's excluded). This step is best combined with Task 6's manual verification once the protected route exists; note it here and re-confirm in Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(account): gate /account/** behind auth in proxy.ts"
```

---

### Task 6: `account/(protected)` layout + sign-out

**Files:**
- Create: `src/app/account/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `requireCustomer()` from `@/lib/supabase/auth` (Task 1), `signOutCustomer` from `@/app/account/actions` (Task 2), `Button` from `@/components/ui/button`.

- [ ] **Step 1: Write the layout**

```tsx
import { requireCustomer } from "@/lib/supabase/auth";
import { signOutCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomer();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-lg font-semibold">My account</h1>
        <form action={signOutCustomer}>
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds. (There's no page inside `(protected)/` yet, so this route group renders nothing routable until Task 7 — that's fine, Next.js doesn't require a route group to have children to compile.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/account/(protected)/layout.tsx"
git commit -m "feat(account): add protected account layout with sign-out"
```

---

### Task 7: `/account/orders` list + `/account/orders/[id]` detail

**Files:**
- Create: `src/app/account/(protected)/orders/page.tsx`
- Create: `src/app/account/(protected)/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from `@/lib/supabase/server`; `fetchOrders`, `fetchOrderById` from `@/lib/orders` (existing, unchanged — types `Order`, `OrderWithItems` per `src/lib/orders.ts`); `formatPHP`, `cn` from `@/lib/utils`; `buttonVariants` from `@/components/ui/button`; `ShoeArt` from `@/components/ShoeArt`; `Card`, `Separator` from `@/components/ui/card` / `@/components/ui/separator`.

- [ ] **Step 1: Write the orders list page**

```tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchOrders } from "@/lib/orders";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPHP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const orders = await fetchOrders(supabase);

  return (
    <div>
      <h2 className="text-xl font-bold">Order history</h2>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Placed</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  You haven&rsquo;t placed any orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{o.orderNumber}</td>
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
                        href={`/account/orders/${o.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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

- [ ] **Step 2: Write the order detail page**

```tsx
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
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Manual verification (dev server)**

This exercises Tasks 1-7 together:

1. Start the dev server, open `/account/register`. Register a new customer. If the Supabase project has "Confirm email" enabled, you'll see the "Check your email to confirm your account" message; confirm via the emailed link (or, for local testing, disable email confirmation in the Supabase dashboard's Auth settings), then go to `/account/login` and sign in. If confirmation is disabled, registering signs you straight in and redirects to `/account/orders`.
2. Signed out, navigate directly to `/account/orders` — confirm `proxy.ts` (Task 5) redirects you to `/account/login`.
3. Signed in, add a product to the cart and complete `/checkout`. Confirm the order succeeds and lands on `/checkout/success/<orderNumber>`.
4. Go to `/account/orders` — the just-placed order should appear (proves `place_order`'s `auth.uid()` auto-link works with zero code changes, and `fetchOrders` + RLS correctly scope it to this customer).
5. Click "View" on that order — confirm the detail page renders items, contact, and shipping correctly and there is no status-change control (that's admin-only).
6. Copy that order's `/account/orders/<id>` URL, sign out, sign in as a *different* customer (register a second account), and paste the same URL — confirm it 404s (RLS blocks the cross-customer read; `fetchOrderById` returns `null` → `notFound()`).
7. Open an incognito/guest session and complete checkout without logging in — confirm guest checkout still works unchanged (the goal explicitly requires this).

- [ ] **Step 5: Commit**

```bash
git add "src/app/account/(protected)/orders"
git commit -m "feat(account): add /account/orders list and detail pages"
```

---

### Task 8: Navbar conditional account/login link

**Files:**
- Create: `src/hooks/useSupabaseUser.ts`
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient` from `@/lib/supabase/client` (existing, currently unused).
- Produces: `export function useSupabaseUser(): string | null` (the signed-in user's email, or `null` if signed out / not yet resolved) — consumed by `Navbar`.

- [ ] **Step 1: Write the client-side auth hook**

Why client-side instead of threading a user prop from the root layout: `src/app/layout.tsx` renders `home`/`/products` pages that use `export const revalidate = 60` for ISR (per the design doc's Goals). Calling `cookies()`/`getCurrentUser()` in the root layout would make Next.js treat the whole tree — including those ISR pages — as fully dynamic, silently breaking that revalidation. `Navbar` is already a Client Component, so it resolves auth state itself after mount, the same way `CartContext` hydrates cart state from `localStorage` after mount.

```ts
"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function useSupabaseUser(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return email;
}
```

- [ ] **Step 2: Wire it into the Navbar**

Open `src/components/Navbar.tsx`. Current imports:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/ModeToggle";
```

Replace with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/ModeToggle";
```

Inside `export function Navbar()`, current body starts with:

```tsx
export function Navbar() {
  const { count, open } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
```

Add the hook call:

```tsx
export function Navbar() {
  const { count, open } = useCart();
  const userEmail = useSupabaseUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
```

In the desktop icon cluster, current code:

```tsx
        <div className="flex items-center gap-1">
          <ModeToggle />
          <Button variant="ghost" size="icon" aria-label="Open cart" onClick={open} className="relative">
```

Insert the account link between `<ModeToggle />` and the cart `<Button>`:

```tsx
        <div className="flex items-center gap-1">
          <ModeToggle />
          <Link
            href={userEmail ? "/account/orders" : "/account/login"}
            aria-label={userEmail ? "My account" : "Sign in"}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <User className="size-5" />
          </Link>
          <Button variant="ghost" size="icon" aria-label="Open cart" onClick={open} className="relative">
```

In the mobile `<SheetContent>`, current code:

```tsx
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <ul className="flex flex-col px-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
```

Add one more `<li>` after the `links.map(...)` block, still inside the same `<ul>`:

```tsx
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <ul className="flex flex-col px-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={userEmail ? "/account/orders" : "/account/login"}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {userEmail ? "My account" : "Sign in"}
                  </Link>
                </li>
              </ul>
            </SheetContent>
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Manual verification (dev server)**

1. Signed out, load any page — the navbar's account icon (desktop) / "Sign in" row (mobile, resize to a narrow viewport) should link to `/account/login`.
2. Sign in via `/account/login`. Reload any storefront page (e.g. `/`) — the navbar icon/link should now point to `/account/orders` (via `onAuthStateChange`/`getUser()` picking up the session client-side; no full navbar prop-drilling needed).
3. Confirm `/` and `/products` still render instantly without a full-page loading flash beyond the brief icon swap — this confirms ISR on those pages wasn't disturbed by this change (Navbar's auth check is entirely client-side, not part of the server-rendered/ISR'd shell).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSupabaseUser.ts src/components/Navbar.tsx
git commit -m "feat(account): show conditional account/login link in navbar"
```

---

## Self-review notes

- **Spec coverage:** Design doc Phase 3 deliverables — `/account/register` + `/account/login` (Tasks 3, 4), `/account/orders` with detail (Task 7), checkout prefill + auto-link (already implemented in Phase 2's `checkout/page.tsx` and `place_order`'s `auth.uid()` — verified, not re-implemented, per Global Constraints), navbar conditional link (Task 8) — all covered. Acceptance criteria (register → check out → see own order-only history; guest checkout unaffected) are exercised end-to-end in Task 7 Step 4 and Task 8 Step 4.
- **No placeholders:** every step above has complete, copy-pasteable code — no "add validation" or "similar to Task N" stand-ins.
- **Type consistency:** `Order`/`OrderWithItems`/`fetchOrders`/`fetchOrderById` are reused verbatim from `src/lib/orders.ts` with no signature changes; `requireCustomer()` returns the same `User` type `getCurrentUser()` already returns; action return shapes (`{ error?; info? }` for register, `{ error? }` for login, `void` for sign-out) are each used consistently between their action definition (Task 2) and their calling page (Tasks 3, 4, 6).
