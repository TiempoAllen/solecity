import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowIcon, InstagramIcon } from "@/components/icons";

export function CTASection() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <Reveal>
        <div className="animated-border relative overflow-hidden rounded-[2.5rem]">
          <div className="glass-strong relative overflow-hidden rounded-[2.4rem] px-8 py-14 text-center sm:px-16 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 0%, rgba(139,92,246,0.25), transparent 60%)",
              }}
            />
            <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-[--color-brand-3]">
              Ready when you are
            </p>
            <h2 className="relative mx-auto mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Find your next pair in the <span className="brand-gradient-text">SOLECITY</span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-md text-muted">
              Browse the full lineup or message us directly — authentic kicks, delivered nationwide.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-accent-glow)]"
              >
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] transition-transform duration-500 group-hover:scale-110" />
                Explore all shoes
                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="https://www.instagram.com/solecity.est23/"
                target="_blank"
                rel="noreferrer noopener"
                className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-foreground transition-glass hover:bg-white/10"
              >
                <InstagramIcon className="h-4 w-4" />
                DM on Instagram
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
