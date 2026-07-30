import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 pt-32 text-center">
      <div className="glass glass-specular w-full rounded-3xl p-12">
        <p className="brand-gradient-text text-7xl font-black">404</p>
        <h1 className="mt-4 text-2xl font-bold">This pair walked off</h1>
        <p className="mt-2 text-muted">
          The page you’re looking for isn’t on the shelf. Let’s get you back to the collection.
        </p>
        <Link
          href="/products"
          className="group mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-accent-glow)]"
        >
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] transition-transform duration-500 group-hover:scale-110" />
          Browse shoes
          <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
