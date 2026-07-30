# SOLECITY shadcn UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin SOLECITY's entire presentation layer from the bespoke "Liquid Glass" dark-neon identity to shadcn/ui's neutral default aesthetic, with a light default + dark toggle and dialed-back motion.

**Architecture:** Presentation-layer only. The logic layer (`context/CartContext.tsx`, `lib/products.ts`, `components/ShoeArt.tsx`) is untouched. shadcn primitives are installed via the CLI (Tailwind v4 mode); every presentational component is rebuilt on those primitives + neutral tokens. Dark mode via `next-themes`; cart feedback via `sonner`; icons via `lucide-react`.

**Tech Stack:** Next 16.2.12 (App Router), React 19, Tailwind v4, shadcn/ui, next-themes, sonner, lucide-react, framer-motion (subtle only).

## Global Constraints

- **This is NOT the Next.js you know** (`AGENTS.md`): before writing Next-specific code (esp. `next-themes` + App Router), consult `node_modules/next/dist/docs/01-app`.
- **Palette:** fully neutral shadcn tokens. No violet/cyan brand accent, no gradient text. Product color survives only through `ShoeArt`.
- **Theme:** light default + dark toggle (`next-themes`, `attribute="class"`, `defaultTheme="system"`).
- **Motion:** subtle fade/slide only. No tilt, magnetic, glow, blur-in, conic borders, or scrolling marquee.
- **Icons:** `lucide-react` only. Retire `components/icons.tsx`.
- **Currency:** keep `formatPHP` from `lib/utils.ts`; do not change cart math.
- **Path alias:** `@/*` → `src/*`.
- **Do not modify:** `context/CartContext.tsx`, `lib/products.ts`, `components/ShoeArt.tsx`.
- **Verification is browser-based:** each task ends with `npm run build` + `npm run lint` passing and (for visual tasks) a dev-server render check in light and dark. No unit tests.

## File Structure

**Created:** `components.json`, `src/components/ui/*` (shadcn primitives), `src/components/ThemeProvider.tsx`, `src/components/ModeToggle.tsx`.

**Rewritten:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/Providers.tsx`, `src/lib/utils.ts`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/CartDrawer.tsx`, `src/components/ProductCard.tsx`, `src/components/motion/Reveal.tsx`, `src/components/home/{Hero,FeaturedProducts,FeatureGrid,CTASection,BrandMarquee}.tsx`, `src/components/products/{ProductsExplorer,ProductDetail}.tsx`, `src/app/not-found.tsx`.

**Retired (deleted in Task 13):** `src/components/ui/Glass.tsx`, `src/components/AmbientBackground.tsx`, `src/components/motion/TiltCard.tsx`, `src/components/motion/MagneticButton.tsx`, `src/components/icons.tsx`.

---

### Task 1: shadcn foundation (init, tokens, deps, primitives)

**Files:**
- Create: `components.json`, `src/components/ui/*`
- Modify: `src/app/globals.css`, `src/lib/utils.ts`, `package.json`

**Interfaces:**
- Produces: `cn(...)` from `@/lib/utils` (clsx + tailwind-merge signature); shadcn primitives importable from `@/components/ui/{button,card,badge,sheet,select,separator,progress,breadcrumb,dropdown-menu,skeleton,sonner,tabs}`; neutral CSS tokens (`bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `text-muted-foreground`, `border`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, etc.) in both light and dark.

- [ ] **Step 1: Read the App Router docs note**

Skim `node_modules/next/dist/docs/01-app` for anything about client providers / `suppressHydrationWarning` you'll need in Task 2. No code yet.

- [ ] **Step 2: Preserve `formatPHP` before the CLI touches `utils.ts`**

Note the current `formatPHP` body (from `src/lib/utils.ts`) — the CLI overwrites `cn` but you must keep `formatPHP`.

- [ ] **Step 3: Run shadcn init (Tailwind v4, neutral base, defaults)**

```bash
npx shadcn@latest init -d -b neutral
```

If it fails on React 19 peer deps, retry with the CLI's install flag or set npm legacy peer deps for the session:

```bash
npm config set legacy-peer-deps true
npx shadcn@latest init -d -b neutral
```

Expected: `components.json` created; `src/app/globals.css` rewritten with `@import "tailwindcss"`, `@import "tw-animate-css"`, `:root` + `.dark` oklch tokens, `@theme inline` mapping, `--radius`; `src/lib/utils.ts` now exports `cn` via clsx + tailwind-merge; deps `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react` added.

- [ ] **Step 4: Re-add `formatPHP` to `utils.ts`**

Append below the generated `cn`:

```ts
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}
```

- [ ] **Step 5: Add the shadcn primitives**

```bash
npx shadcn@latest add button card badge sheet select separator progress breadcrumb dropdown-menu skeleton sonner tabs
```

Expected: corresponding files under `src/components/ui/`.

- [ ] **Step 6: Install runtime deps not pulled by the CLI**

```bash
npm install next-themes sonner
```

(`sonner`/`lucide-react` may already be present from Step 5 — install is idempotent.)

- [ ] **Step 7: Confirm the neutral globals.css has no leftover glass tokens**

Open `src/app/globals.css`. It should contain ONLY the shadcn token system (no `--color-void`, `.glass`, `body::before/after`, neon scrollbar). If the CLI left the old block, delete everything that isn't the shadcn tokens, base layer, and `@theme inline`. Keep the `@media (prefers-reduced-motion: reduce)` block by re-adding it at the end:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 8: Verify build + lint**

Run:
```bash
npm run build
npm run lint
```
Expected: both pass. The app still imports old glass components (fine — they compile); it will look broken until later tasks. That's expected at this stage.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: shadcn foundation — init, neutral tokens, primitives, deps"
```

---

### Task 2: Theme provider, layout, and app shell

**Files:**
- Create: `src/components/ThemeProvider.tsx`
- Modify: `src/app/layout.tsx`, `src/components/Providers.tsx`

**Interfaces:**
- Consumes: `next-themes`, `@/components/ui/sonner` (`Toaster`).
- Produces: `<ThemeProvider>` wrapper; `Toaster` mounted globally; `AmbientBackground` removed from the tree.

- [ ] **Step 1: Create `ThemeProvider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Update `layout.tsx`**

Add `suppressHydrationWarning` to `<html>` and drop the dark-only assumption. Replace body background classes with tokens:

```tsx
return (
  <html
    lang="en"
    suppressHydrationWarning
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
  >
    <body className="min-h-full flex flex-col bg-background text-foreground">
      <Providers>{children}</Providers>
    </body>
  </html>
);
```

- [ ] **Step 3: Rewrite `Providers.tsx`**

Remove `AmbientBackground`; wrap in `ThemeProvider`; mount `Toaster`.

```tsx
"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <CartProvider>
        <Navbar />
        <main className="relative flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <Toaster />
      </CartProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS. (Navbar/Footer/CartDrawer are still the old glass versions but compile.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: next-themes provider, neutral app shell, global Toaster"
```

---

### Task 3: ModeToggle

**Files:**
- Create: `src/components/ModeToggle.tsx`

**Interfaces:**
- Consumes: `next-themes` `useTheme`, `@/components/ui/{button,dropdown-menu}`, lucide `Sun`/`Moon`.
- Produces: `<ModeToggle />` used by Navbar (Task 4).

- [ ] **Step 1: Create `ModeToggle.tsx`**

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: ModeToggle (light/dark/system)"
```

---

### Task 4: Navbar

**Files:**
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `useCart` (`count`, `open`), `@/components/ui/{button,badge,sheet}`, `@/components/ModeToggle`, lucide `ShoppingBag`/`Menu`.
- Produces: neutral fixed header used by the app shell.

- [ ] **Step 1: Rewrite Navbar with shadcn (no glass, no framer)**

Requirements:
- Fixed header: `sticky top-0 z-50 border-b bg-background/80 backdrop-blur`. Inner `mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6`.
- Logo: plain text `SOLECITY` (`font-black tracking-tight`), no gradient. Small square mark `bg-primary text-primary-foreground rounded-md` with `S`.
- Desktop links (`links` array unchanged) as `text-sm text-muted-foreground hover:text-foreground`; active link `text-foreground font-medium` (use `usePathname`; keep the existing active logic but drop `window.location.search` — compare `pathname` and treat `/products` links as active when `pathname === "/products"`).
- Right cluster: `ModeToggle`, cart `Button variant="ghost" size="icon"` with `ShoppingBag`; when `count > 0` overlay a `Badge` (`absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[11px]`) showing `count`. `onClick={open}`.
- Mobile: replace the framer dropdown with a shadcn `Sheet` (`SheetTrigger` = `Button variant="ghost" size="icon"` + `Menu`, `md:hidden`). `SheetContent side="left"` lists the same links as a vertical stack; each `Link` closes the sheet on navigation (control `open` state via `useState` + `onOpenChange`, and reset on `pathname` change with the existing effect).
- Remove all `motion`, `glass`, `AnimatePresence`, and `scrolled` state.

- [ ] **Step 2: Verify render (light + dark)**

Start the dev server (via the browser preview tool, `npm run dev`), load `/`. Confirm: header renders neutral, links visible, cart icon shows badge after adding (can't add yet — just confirm no console errors), ModeToggle switches light/dark and the header colors follow.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild Navbar on shadcn (Sheet mobile menu, ModeToggle)"
```

---

### Task 5: ProductCard

**Files:**
- Modify: `src/components/ProductCard.tsx`

**Interfaces:**
- Consumes: `Product`, `useCart` (`add`), `ShoeArt`, `@/components/ui/{card,badge,button}`, `sonner` `toast`, lucide `Star`/`Plus`, `formatPHP`.
- Produces: neutral `ProductCard` used by grids (Tasks 8, 9, 10).

- [ ] **Step 1: Rewrite ProductCard**

```tsx
"use client";

import Link from "next/link";
import { Star, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { formatPHP } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <Card className="group h-full overflow-hidden py-0 transition-colors hover:border-foreground/20">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="absolute left-3 top-3 z-10 flex gap-2">
            <Badge variant="secondary">
              {product.availability === "On Hand" ? "On Hand" : "Pre-Order"}
            </Badge>
            {product.originalPrice && <Badge>Sale</Badge>}
          </div>
          <div className="absolute inset-0 grid place-items-center p-6">
            <ShoeArt
              seed={product.slug}
              from={product.gradient.from}
              to={product.gradient.to}
              accent={product.gradient.accent}
              className="transition-transform duration-500 group-hover:-translate-y-1"
            />
          </div>
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {product.brand} · {product.category}
            </p>
            <Link href={`/products/${product.slug}`}>
              <h3 className="mt-1 truncate text-base font-semibold hover:underline">
                {product.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.colorway}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current" />
            {product.rating.toFixed(1)}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatPHP(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPHP(product.originalPrice)}
              </span>
            )}
          </div>
          <Button
            size="icon"
            aria-label={`Quick add ${product.name}`}
            onClick={() => {
              const size = product.sizes[Math.floor(product.sizes.length / 2)];
              add(product, size);
              toast.success("Added to bag", { description: `${product.name} · US ${size}` });
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild ProductCard on shadcn Card + sonner toast"
```

---

### Task 6: CartDrawer (Sheet)

**Files:**
- Modify: `src/components/CartDrawer.tsx`

**Interfaces:**
- Consumes: `useCart` (`isOpen`, `close`, `lines`, `subtotal`, `count`, `remove`, `setQty`, `clear`), `@/components/ui/{sheet,button,separator,progress}`, `ShoeArt`, lucide `X`/`Plus`/`Minus`/`ShoppingBag`/`Truck`, `formatPHP`.
- Produces: accessible cart drawer.

- [ ] **Step 1: Rewrite CartDrawer using `Sheet`**

Requirements (preserve all cart logic and `SHIPPING_THRESHOLD = 5000`, `freeShip`, `remaining`, `progress`):
- Root: `<Sheet open={isOpen} onOpenChange={(o) => !o && close()}>` with `<SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">`.
- Header: `SheetHeader` with `SheetTitle` = `Your Bag ({count})` and `ShoppingBag` icon.
- Shipping progress (when `lines.length > 0`): `Truck` icon + message (free vs `formatPHP(remaining)`) and shadcn `<Progress value={progress} className="mt-2 h-1.5" />`. Wrap in a bordered `px-6 py-4` block with `Separator` below.
- Lines: scrollable `flex-1 overflow-y-auto px-6 py-4`. Empty state: centered `ShoppingBag` in a `bg-muted` circle, "Your bag is empty" copy, `Button onClick={close}` "Start shopping". Each line: row with ShoeArt thumbnail on `bg-muted` rounded box, name/`brand · US size`, remove `Button variant="ghost" size="icon"` (`X`), qty stepper using two `Button variant="outline" size="icon"` (`Minus`/`Plus`) around `line.qty`, and `formatPHP(line.price * line.qty)`.
- Footer: `SheetFooter` (or bordered block) with `Separator`, subtotal row, `Button className="w-full"` `Checkout · {formatPHP(subtotal)}`, and a `Button variant="ghost" size="sm"` "Clear bag" → `clear`.
- Remove all `motion`/`AnimatePresence`/glass. The Sheet provides open/close animation.

- [ ] **Step 2: Verify the full cart flow (dev server)**

Load `/products` (or `/`), quick-add a product from a card → the Sheet opens, toast fires, progress bar reflects subtotal, qty +/- works, remove works, "Clear bag" empties it, reload persists (localStorage). Check console: no errors. Test Escape closes the Sheet and focus returns to trigger.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild CartDrawer on shadcn Sheet + Progress"
```

---

### Task 7: Simplify Reveal (motion helper)

**Files:**
- Modify: `src/components/motion/Reveal.tsx`

**Interfaces:**
- Produces: `Reveal`, `Stagger`, `StaggerItem`, `EASE_OUT`, `staggerContainer`, `staggerItem` — same exports, subtler animation.

- [ ] **Step 1: Drop blur, soften offsets**

In `Reveal.tsx`, remove every `filter: "blur(...)"` from `Reveal`, `staggerItem` (initial `blur(6px)` → gone; keep opacity + small y). Reduce offsets in `directionOffset` from 28 → 16 and `staggerItem` y from 26 → 14. Keep all export names/signatures identical.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: soften Reveal motion (no blur, smaller offsets)"
```

---

### Task 8: Hero + home sections

**Files:**
- Modify: `src/components/home/Hero.tsx`, `FeaturedProducts.tsx`, `FeatureGrid.tsx`, `CTASection.tsx`, `BrandMarquee.tsx`

**Interfaces:**
- Consumes: `@/components/ui/{button,card,badge}`, `Reveal`/`Stagger`, `ProductCard`, `getFeatured`, lucide icons (`ArrowRight`, `Shield`, `Truck`, `Zap`, `Star`, etc.), `ShoeArt`.
- Produces: neutral landing page.

- [ ] **Step 1: Rewrite `Hero.tsx`**

Requirements:
- Two-column `grid lg:grid-cols-[1.05fr_0.95fr]`, `max-w-6xl px-4 pt-28`.
- Left: `Badge variant="secondary"` eyebrow (`Zap` + "Est. 2023 · Cebu City"); `h1` plain (`text-5xl font-bold tracking-tight sm:text-6xl`) "Step into the SOLECITY" — no gradient span; muted `p`; two CTAs — `Button asChild` (`<Link href="/products">Shop the collection <ArrowRight/></Link>`) and `Button asChild variant="outline"` (Basketball drops); feature bullets row with lucide `Shield`/`Truck`/`Zap` + `text-muted-foreground`.
- Right: `Card className="overflow-hidden"` with `aspect-square bg-muted grid place-items-center p-8` holding `ShoeArt seed="hero" ... float`. Optional two small `Card` chips (Featured name / rating) absolutely positioned, neutral styling.
- Wrap left column in `Reveal`; drop `MagneticButton`, gradient washes, glass.

- [ ] **Step 2: Rewrite `FeaturedProducts.tsx`**

Section `max-w-6xl px-4 py-20`. Heading (`Reveal`): eyebrow `text-sm text-muted-foreground`, `h2 text-3xl font-bold` "Featured pairs", optional "View all" `Button asChild variant="ghost"`. Grid `Stagger` → `sm:grid-cols-2 lg:grid-cols-3 gap-5` of `getFeatured().map` `ProductCard` wrapped in `StaggerItem`. No glass.

- [ ] **Step 3: Rewrite `FeatureGrid.tsx`**

Grid of `Card`s (`sm:grid-cols-3`), each `CardHeader`/`CardContent` with a lucide icon in a `bg-muted rounded-md` square, title, muted description. Keep the existing feature copy; swap custom icons for lucide equivalents. Wrap in `Reveal`.

- [ ] **Step 4: Rewrite `CTASection.tsx`**

A single bordered `Card` band (`bg-muted/40`) with centered heading, muted subcopy, and a primary `Button asChild` linking to `/products`. No neon/animated border.

- [ ] **Step 5: Rewrite `BrandMarquee.tsx` as a static strip**

Replace the animated marquee with a static, centered row of brand wordmarks (`ANTA`, `Under Armour`, `SoleCity`, etc. — reuse existing brand list) as `text-muted-foreground/60 font-semibold`, wrapped `flex flex-wrap justify-center gap-x-10 gap-y-4`. Remove `.marquee-track` usage and duplication. Keep it in `page.tsx`.

- [ ] **Step 6: Verify home page (light + dark)**

Dev server → `/`. Screenshot in light and dark. Confirm: no gradient text, neutral cards, ShoeArt carries product color, CTAs work, no console errors.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rebuild home (Hero, Featured, FeatureGrid, CTA, static marquee)"
```

---

### Task 9: ProductsExplorer

**Files:**
- Modify: `src/components/products/ProductsExplorer.tsx`

**Interfaces:**
- Consumes: `products`, `categories`, `Category`, `ProductCard`, `@/components/ui/{button,select}`, `Reveal`.
- Produces: neutral products listing with filter + sort.

- [ ] **Step 1: Rewrite ProductsExplorer**

Requirements (keep `useSearchParams`, `isFilter`, `active`/`sort` state, and the `visible` memo logic verbatim):
- Header (`Reveal`): eyebrow `text-sm text-muted-foreground` "The collection", `h1 text-4xl font-bold` "All SOLECITY pairs" (no gradient), muted count line.
- Filters: `categories.map` → `Button` toggle; active = `variant="default"`, inactive = `variant="outline"`; label + count (count as muted text or a `Badge variant="secondary"` inside). `onClick={() => setActive(c.label as Filter)}`.
- Sort: shadcn `Select` (`value={sort}`, `onValueChange`) with items `featured` / `low` / `high` labeled "Featured" / "Price: Low to High" / "Price: High to Low". `SelectTrigger className="w-[200px]"`.
- Grid: plain `grid gap-5 sm:grid-cols-2 lg:grid-cols-3` of `ProductCard`. Replace the `AnimatePresence`/`popLayout`/blur choreography with a simple `Reveal` per card or no per-item animation (subtle only). Keep `key={product.slug}`.
- Remove framer pill/glass.

- [ ] **Step 2: Verify (light + dark)**

Dev server → `/products`. Filter by category updates grid + count; sort reorders; quick-add opens Sheet + toast. Screenshot light + dark. No console errors.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild ProductsExplorer (Button filters, Select sort)"
```

---

### Task 10: ProductDetail

**Files:**
- Modify: `src/components/products/ProductDetail.tsx`

**Interfaces:**
- Consumes: `Product`, `useCart` (`add`), `ShoeArt`, `ProductCard`, `@/components/ui/{breadcrumb,badge,button,separator,card}`, `sonner` `toast`, `Reveal`/`Stagger`, lucide `Star`/`Shield`/`Truck`/`Zap`/`Check`, `formatPHP`.
- Produces: neutral product detail page.

- [ ] **Step 1: Rewrite ProductDetail**

Requirements (keep `size`/`added`/`shake` state pattern, but replace the inline "Added" animation with a sonner toast; keep `related` grid):
- Breadcrumb: shadcn `Breadcrumb` (Home / Shop / product name).
- Gallery (`lg:sticky lg:top-24`): main `Card` `aspect-square bg-muted grid place-items-center p-10` with `ShoeArt ... float`; a `Badge` "Save {formatPHP(originalPrice - price)}" when on sale. Three thumbnail `Card`s (`bg-muted`) labeled Side/Top/Sole with scaled ShoeArt.
- Info column (`Stagger`): row of `Badge`s (availability, "Authentic" with `Shield`) + rating (`Star` + `rating` + muted `(reviews)`); brand·category eyebrow; `h1 text-4xl font-bold`; colorway; price row (`text-3xl font-bold` + line-through original); muted description; `Separator`.
- Size selector: "Select size (US)" label; `product.sizes.map` → `Button` (`variant={size === s ? "default" : "outline"}`, `size="sm"`, fixed width) `onClick={() => setSize(s)}`. Keep the `shake` guard: if `size === null` on add, shake + inline hint "Pick a size first" (`text-destructive`), do not add.
- Add to cart: full-width `Button size="lg"` → on valid size call `add(product, size)` then `toast.success("Added to bag", { description: ... })`. Text: `Add to bag · {formatPHP(price)}`.
- Assurances: three bordered `Card`/rows with lucide icons + labels ("100% Authentic", "Ships nationwide", "Secure checkout").
- Related: `h2` "You may also like", `Stagger` grid of `ProductCard`, and a `Button asChild variant="ghost"` "Back to all pairs" with `ArrowRight`.
- Remove all glass/gradient/blur.

- [ ] **Step 2: Verify (light + dark)**

Dev server → a product URL (e.g. `/products/anta-kai-1-speed`). Confirm: breadcrumb, size selection required (shake + hint when none), add fires toast + opens Sheet, related grid renders, sticky gallery. Screenshot light + dark. No console errors.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild ProductDetail (Breadcrumb, size buttons, toast)"
```

---

### Task 11: Footer + 404

**Files:**
- Modify: `src/components/Footer.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `@/components/ui/{button,separator}`, lucide social icons, `Link`.
- Produces: neutral footer + not-found page.

- [ ] **Step 1: Rewrite `Footer.tsx`**

`border-t bg-background` footer, `max-w-6xl px-4 py-12`. Columns: brand blurb (plain SOLECITY wordmark, muted tagline), link groups (Shop / Company / Support — reuse existing hrefs/labels), lucide social icons as `Button variant="ghost" size="icon"`. Bottom row with `Separator` and `text-xs text-muted-foreground` copyright. Remove glass/gradient.

- [ ] **Step 2: Rewrite `not-found.tsx`**

Centered `min-h-[60vh] grid place-items-center` block: large `404` (`text-7xl font-bold`), muted "Page not found" copy, `Button asChild` → `<Link href="/">Back home</Link>`. Neutral tokens.

- [ ] **Step 3: Verify (light + dark)**

Dev server → `/`, scroll to footer; visit a bad URL (e.g. `/nope`) for 404. Screenshot both in light + dark.

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Footer and 404 on neutral shadcn"
```

---

### Task 12: Remove retired files + final cleanup

**Files:**
- Delete: `src/components/ui/Glass.tsx`, `src/components/AmbientBackground.tsx`, `src/components/motion/TiltCard.tsx`, `src/components/motion/MagneticButton.tsx`, `src/components/icons.tsx`

**Interfaces:**
- Consumes: nothing new. This task only removes now-unused files.

- [ ] **Step 1: Confirm no remaining imports**

Grep the codebase for stragglers before deleting:

```bash
grep -rn "components/ui/Glass\|AmbientBackground\|motion/TiltCard\|motion/MagneticButton\|components/icons\|\bglass\b\|brand-gradient-text\|color-void\|color-brand" src
```

Expected: no matches (ignore matches inside the files being deleted). If any real import remains, fix that component to use shadcn/lucide first.

- [ ] **Step 2: Delete the retired files**

```bash
git rm src/components/ui/Glass.tsx src/components/AmbientBackground.tsx src/components/motion/TiltCard.tsx src/components/motion/MagneticButton.tsx src/components/icons.tsx
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS with no unresolved imports.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove retired glass/neon components and custom icons"
```

---

### Task 13: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Clean build + lint**

```bash
npm run build
npm run lint
```
Expected: both PASS.

- [ ] **Step 2: Manual walkthrough (light + dark)**

Dev server. For each of `/`, `/products`, a product detail page, and a 404 URL: screenshot in **light and dark**, confirm no console/runtime errors, and verify neutral styling with no leftover glass/neon.

- [ ] **Step 3: Cart regression**

Quick-add from a card and add-with-size from detail: Sheet opens, toast fires, free-ship progress tracks subtotal, qty +/-, remove, clear, and localStorage persistence across reload all work. Keyboard: Sheet/Select/Dropdown are focus-trapped and Escape-dismissable.

- [ ] **Step 4: Final commit (if any doc/tweak changes)**

```bash
git add -A
git commit -m "chore: shadcn redesign verification pass"
```

---

## Self-Review

**Spec coverage:**
- Integration approach A (CLI init) → Task 1. ✓
- Tokens & theming (neutral, remove neon) → Task 1 (Step 7) + Task 2. ✓
- Dark mode (next-themes, ModeToggle, suppressHydrationWarning) → Tasks 2, 3. ✓
- Component mapping (Glass→Button/Card/Badge; CartDrawer→Sheet; Select; Breadcrumb; lucide; remove Ambient/Tilt/Magnetic) → Tasks 4–6, 8–12. ✓
- ShoeArt on bg-muted → Tasks 5, 8, 10. ✓
- sonner toasts → Tasks 1, 2, 5, 10. ✓
- Motion dialed back → Task 7 + throughout. ✓
- Page-by-page (Navbar, Hero, home, listing, detail, Footer, 404) → Tasks 4, 8–11. ✓
- Minimal static marquee → Task 8 Step 5. ✓
- Verification browser-based → per-task + Task 13. ✓
- Unchanged logic (CartContext, products, ShoeArt) → respected (Global Constraints). ✓

**Placeholder scan:** No TBD/TODO. Large rewrites give exact shadcn components, tokens, classes, and preserved logic; smaller/central files give full code. Acceptable for a visual re-skin.

**Type consistency:** `cn`/`formatPHP` signatures consistent (Task 1). `useCart` fields used match `CartContext` (`isOpen`, `close`, `lines`, `subtotal`, `count`, `open`, `add`, `remove`, `setQty`, `clear`). `ProductCard`/`ShoeArt` props match `lib/products.ts`. `Reveal`/`Stagger` exports preserved (Task 7). Component names consistent across tasks.
