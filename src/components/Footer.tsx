import Link from "next/link";
import { InstagramIcon, TruckIcon, ShieldIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 px-4 pb-10 sm:px-6">
      <div className="glass glass-specular mx-auto max-w-6xl overflow-hidden rounded-3xl p-8 sm:p-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] text-sm font-black text-white">
                S
              </span>
              <span className="text-lg font-black tracking-tight">
                SOLE<span className="brand-gradient-text">CITY</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted">
              Authentic sneakers & clogs, curated in Cebu City since 2023. ANTA · Under Armour ·
              Basketball · Clogs. We ship nationwide.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.instagram.com/solecity.est23/"
                target="_blank"
                rel="noreferrer noopener"
                className="grid h-10 w-10 place-items-center rounded-full glass text-muted transition-glass hover:text-white hover:glow-ring"
                aria-label="SOLECITY on Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <span className="text-sm text-faint">@solecity.est23</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">Shop</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {["All", "ANTA", "Basketball", "Under Armour", "Clogs"].map((c) => (
                <li key={c}>
                  <Link
                    href={c === "All" ? "/products" : `/products?category=${encodeURIComponent(c)}`}
                    className="transition-colors hover:text-white"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">Promise</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-[--color-brand-3]" /> 100% Authentic pairs
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-[--color-brand-2]" /> Nationwide shipping
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-faint sm:flex-row">
          <p>© {new Date().getFullYear()} SOLECITY. All rights reserved.</p>
          <p>Cebu City, Philippines · Concept storefront</p>
        </div>
      </div>
    </footer>
  );
}
