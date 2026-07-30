import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
      <div>
        <p className="text-7xl font-bold tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-semibold">This pair walked off</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          The page you&rsquo;re looking for isn&rsquo;t on the shelf. Let&rsquo;s get you back to
          the collection.
        </p>
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
          Browse shoes
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
