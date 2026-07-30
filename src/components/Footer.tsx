import Link from "next/link";
import { AtSign, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                S
              </span>
              <span className="text-lg font-bold tracking-tight">SOLECITY</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Authentic sneakers &amp; clogs, curated in Cebu City since 2023. ANTA · Under Armour ·
              Basketball · Clogs. We ship nationwide.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                render={
                  <a
                    href="https://www.instagram.com/solecity.est23/"
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label="SOLECITY on Instagram"
                  />
                }
              >
                <AtSign className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">@solecity.est23</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Shop</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {["All", "ANTA", "Basketball", "Under Armour", "Clogs"].map((c) => (
                <li key={c}>
                  <Link
                    href={c === "All" ? "/products" : `/products?category=${encodeURIComponent(c)}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Promise
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Shield className="size-4" /> 100% Authentic pairs
              </li>
              <li className="flex items-center gap-2">
                <Truck className="size-4" /> Nationwide shipping
              </li>
            </ul>
          </div>
        </div>

        <Separator className="mt-10" />
        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} SOLECITY. All rights reserved.</p>
          <p>Cebu City, Philippines · Concept storefront</p>
        </div>
      </div>
    </footer>
  );
}
