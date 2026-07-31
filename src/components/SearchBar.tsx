"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { getProducts, type Product } from "@/lib/products";
import { ShoeArt } from "@/components/ShoeArt";
import { cn, formatPHP } from "@/lib/utils";

/**
 * The catalog is small enough to filter in the browser, so it's fetched at most
 * once per page load — and only after someone actually focuses the search field.
 */
let catalogPromise: Promise<Product[]> | null = null;
function loadCatalog() {
  catalogPromise ??= getProducts();
  return catalogPromise;
}

const MAX_SUGGESTIONS = 6;

// Same fields the products page searches, so suggestions and results agree.
function matches(product: Product, query: string) {
  return [product.name, product.brand, product.colorway, product.category].some(
    (field) => field.toLowerCase().includes(query),
  );
}

type Props = {
  className?: string;
  /** Called after a successful submit — e.g. to close the mobile menu. */
  onSubmit?: () => void;
};

export function SearchBar({ className, onSubmit }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);
  // When an item is highlighted, Enter activates that item instead of submitting.
  const highlighted = useRef<Product | undefined>(undefined);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((p) => matches(p, q)).slice(0, MAX_SUGGESTIONS);
  }, [catalog, query]);

  function handleFocus() {
    if (catalog.length === 0) loadCatalog().then(setCatalog);
  }

  function go(href: string) {
    router.push(href);
    onSubmit?.();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A highlighted suggestion handles its own navigation via Item.onClick.
    if (highlighted.current) return;
    const q = query.trim();
    go(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  }

  return (
    <Autocomplete.Root
      items={suggestions}
      value={query}
      onValueChange={(value, details) => {
        if (details.reason === "item-press") {
          // Picking a suggestion navigates to that product, so don't leave its
          // full name sitting in the search box.
          setQuery("");
          return;
        }
        // Typing invalidates any highlight, so Enter falls back to a full search.
        highlighted.current = undefined;
        setQuery(value);
      }}
      // Suggestions are pre-filtered above, so skip the built-in matching.
      filter={null}
      itemToStringValue={(product: Product) => product.name}
      openOnInputClick={false}
      onItemHighlighted={(product) => {
        highlighted.current = product;
      }}
    >
      <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Autocomplete.Input
          type="search"
          name="search"
          placeholder="Search for products"
          aria-label="Search for products"
          onFocus={handleFocus}
          className="w-full rounded-full border bg-background py-2 pr-3 pl-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </form>

      <Autocomplete.Portal>
        {/* Above z-50 so suggestions clear the mobile Sheet's overlay, which
            portals after this popup and would otherwise paint over it. */}
        <Autocomplete.Positioner sideOffset={8} className="isolate z-60 outline-none">
          <Autocomplete.Popup className="max-h-(--available-height) w-(--anchor-width) min-w-72 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {/* Empty stays mounted at all times (Base UI requirement for screen-reader
                announcements) and only conditionally renders its children — so any
                padding must live on this inner span, not the Empty element itself,
                or it reserves blank space even when there are matches. */}
            <Autocomplete.Empty>
              <span className="block px-3 py-6 text-center text-sm text-muted-foreground">
                No products found.
              </span>
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(product: Product) => (
                <Autocomplete.Item
                  key={product.slug}
                  value={product}
                  onClick={() => go(`/products/${product.slug}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <div
                    aria-hidden
                    className="grid h-10 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted p-1"
                  >
                    <ShoeArt
                      seed={product.slug}
                      from={product.gradient.from}
                      to={product.gradient.to}
                      accent={product.gradient.accent}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.brand} · {product.category}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatPHP(product.price)}
                  </span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
