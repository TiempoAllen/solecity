import Link from "next/link";
import { ArrowRight, AtSign } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export function CTASection() {
  return (
    <section className="mx-auto mt-20 mb-24 max-w-6xl px-4 sm:px-6">
      <Reveal>
        <div className="rounded-xl border bg-muted/40 px-8 py-14 text-center sm:px-16 sm:py-20">
          <p className="text-sm text-muted-foreground">Ready when you are</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Find your next pair in the SOLECITY
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Browse the full lineup or message us directly — authentic kicks, delivered nationwide.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className={cn(buttonVariants({ size: "lg" }))}>
              Explore all shoes
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://www.instagram.com/solecity.est23/"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <AtSign className="size-4" />
              DM on Instagram
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
