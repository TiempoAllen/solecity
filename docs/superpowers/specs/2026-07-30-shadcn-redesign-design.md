# SOLECITY — shadcn UI Redesign

**Date:** 2026-07-30
**Status:** Approved (design) — pending spec review

## Goal

Improve the UI/UX of SOLECITY by re-skinning the entire presentation layer to
shadcn/ui's neutral default aesthetic. Move from the current bespoke
"Liquid Glass" dark-neon identity to a clean, conventional shadcn look with a
**light default + dark toggle**, a **fully neutral palette**, and **dialed-back
motion**.

This is a **presentation-layer redesign only**. The logic layer is unchanged:
`context/CartContext.tsx`, `lib/products.ts`, and the generative `ShoeArt`
component all stay as-is.

## Decisions (locked in during brainstorming)

- **Aesthetic:** shift toward shadcn default (away from neon/glass).
- **Theme:** light default + dark toggle.
- **Palette:** fully neutral (shadcn defaults — neutral grays, no brand accent).
- **Scope:** whole site.
- **Motion:** dial back — subtle transitions only; drop tilt/glow/marquee/ambient.
- **Integration:** Approach A — shadcn CLI init (Tailwind v4 mode).
- **Icons:** switch to `lucide-react`; retire custom `icons.tsx`. *(default — vetoable)*
- **Cart feedback:** add `sonner` toasts on add-to-cart. *(default — vetoable)*
- **Marquee:** keep a minimal static brand strip, no heavy animation. *(default — vetoable)*

## Integration approach (A: shadcn CLI)

1. Run `npx shadcn@latest init` in Tailwind v4 mode. This:
   - rewrites `src/app/globals.css` to shadcn's token system (`oklch` values,
     `:root` for light + `.dark` for dark, `@theme inline` mapping, `--radius`);
   - creates `components.json`;
   - upgrades `src/lib/utils.ts` `cn()` to `clsx` + `tailwind-merge`.
2. Add primitives with `npx shadcn@latest add`:
   `button card badge sheet select separator progress breadcrumb
   dropdown-menu skeleton sonner tabs`.
3. Add `next-themes` for the light/dark toggle.

**Compatibility notes**
- Stack is Next 16.2.12 + React 19 + Tailwind v4. Per `AGENTS.md` ("This is NOT
  the Next.js you know"), check `node_modules/next/dist/docs` for anything
  version-specific before writing code — especially `next-themes` in the App
  Router (needs a client `ThemeProvider` and `suppressHydrationWarning` on
  `<html>`).
- React 19 peer-dependency ranges may require `--force` / `--legacy-peer-deps`
  on install. If the CLI fights the customized setup, fall back to manually
  copying primitive source + the token block (control-plane equivalent, no
  registry convenience).

## Design tokens & theming

- Replace the entire liquid-glass block in `globals.css` with shadcn's neutral
  tokens for both light (`:root`) and dark (`.dark`):
  `background foreground card card-foreground popover popover-foreground
  primary primary-foreground secondary secondary-foreground muted
  muted-foreground accent accent-foreground destructive border input ring`,
  plus `--radius`.
- **Remove:** the fixed neon ambient backdrop (`body::before`), the grain layer
  (`body::after`), glow rings, animated conic borders, neon scrollbar, custom
  glass utilities, and the `brand-gradient-text` treatment.
- **Keep:** `formatPHP`, `prefers-reduced-motion` block, smooth scroll (optional).
- Fonts (Geist / Geist Mono) stay.

## Theming / dark mode

- Add `next-themes`. Wrap the app in a client `ThemeProvider`
  (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) inside
  `components/Providers.tsx`.
- Add `suppressHydrationWarning` to `<html>` in `app/layout.tsx`.
- New `components/ModeToggle.tsx` — a shadcn `DropdownMenu` with Light / Dark /
  System, placed in the navbar. Uses lucide `Sun` / `Moon` icons.

## Component mapping

| Current | Becomes |
|---|---|
| `ui/Glass.tsx` (`GlassButton`/`GlassBadge`/`GlassPanel`) | shadcn `Button`, `Badge`, `Card`; file **retired** |
| `CartDrawer` (custom framer `<aside>`) | shadcn `Sheet` (accessible Radix dialog) + `Progress` free-ship bar + `Separator` |
| `ProductsExplorer` `<select>` sort | shadcn `Select`; category filters → `Button` toggle group |
| Size picker + inline "Added" animation | plain buttons for sizes + **sonner** toast on add |
| Product-detail breadcrumb | shadcn `Breadcrumb` |
| Custom `icons.tsx` | `lucide-react` throughout; file **retired** |
| `AmbientBackground`, `motion/TiltCard`, `motion/MagneticButton` | **removed** |
| Heavy `BrandMarquee` | minimal static brand strip |

**ShoeArt** stays as the only product imagery, rendered on a `bg-muted` surface.
Drop the per-product neon radial washes behind it; product color still reads
through the art itself on an otherwise neutral card.

## Page-by-page

- **Navbar** — bordered/blurred solid header (not glass). Links, cart `Button`
  (ghost) with a `Badge` count, `ModeToggle`. Mobile menu becomes a shadcn
  `Sheet`. Keep active-link indication (simple underline/secondary bg, no
  neon pill).
- **Hero** — clean two-column: `Badge` eyebrow, headline (no gradient text),
  muted copy, primary + secondary `Button` CTAs, feature bullets. Showpiece is
  ShoeArt on a `Card` with `bg-muted`. Subtle fade-in only.
- **FeaturedProducts / ProductsExplorer grid** — `Card`-based `ProductCard`
  (`CardContent`/`CardFooter`), `Badge` for availability + SALE, quick-add
  `Button`. Filters as toggle `Button`s; sort as `Select`. Subtle fade on
  filter change (no blur/scale popLayout theatrics).
- **Product detail** — `Breadcrumb`, `Badge`s, gallery on `bg-muted` `Card`
  with thumbnail `Card`s, size buttons, full-width add-to-cart `Button` →
  sonner toast, assurance items as bordered rows, related grid of `ProductCard`s.
- **FeatureGrid** — `Card` grid with lucide icons.
- **CTASection** — bordered `Card` band with heading + `Button`.
- **Footer** — clean bordered footer, muted text, lucide social icons.
- **404 (`not-found.tsx`)** — shadcn-styled: heading, muted copy, `Button` home.

## Motion

- Keep `framer-motion` only for a subtle shared `Reveal` (fade/slide-in) and
  shadcn's built-in component transitions (sheet slide, toast).
- Remove: tilt, magnetic hover, glow, blur-in, staggered filter theatrics,
  animated conic borders, marquee scroll.

## Files

**Added:** `components.json`, `components/ui/*` (shadcn primitives),
`components/ModeToggle.tsx`, `components/ThemeProvider.tsx` (or inline in
`Providers`), plus deps `next-themes`, `sonner`, `lucide-react`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`
(or `tw-animate-css` for v4).

**Retired/removed:** `components/ui/Glass.tsx`, `components/AmbientBackground.tsx`,
`components/motion/TiltCard.tsx`, `components/motion/MagneticButton.tsx`,
`components/icons.tsx` (replaced by lucide).

**Rewritten:** `globals.css`, `layout.tsx`, `Providers.tsx`, `Navbar.tsx`,
`Footer.tsx`, `CartDrawer.tsx`, `ProductCard.tsx`, all `home/*`,
`products/ProductsExplorer.tsx`, `products/ProductDetail.tsx`, `not-found.tsx`,
`lib/utils.ts` (cn).

**Unchanged:** `context/CartContext.tsx`, `lib/products.ts`, `ShoeArt.tsx`,
`app/page.tsx` structure (imports may shift), routing under `app/products/*`.

## Verification

Visual redesign → **browser-based verification**, not unit tests:

1. `next build` and `eslint` both pass.
2. Dev server runs with no console/runtime errors.
3. Screenshot each page (home, products, product detail, 404) in **light and
   dark**.
4. Manually verify the cart flow: quick-add from card → `Sheet` opens →
   qty +/- → free-ship progress → toast → remove/clear → localStorage persists.
5. Confirm keyboard accessibility on the new Radix primitives (Sheet focus trap,
   Select, Dropdown).

## Out of scope

- Real product photography (ShoeArt remains the placeholder imagery).
- Checkout / payment implementation (button is a stub, as today).
- Backend, auth, search, or new features. This is a re-skin.
