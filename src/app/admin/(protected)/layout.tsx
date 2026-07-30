import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { signOutAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between border-b pb-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold">Dashboard</Link>
          <Link href="/admin/products" className="text-muted-foreground hover:text-foreground">Products</Link>
        </nav>
        <form action={signOutAdmin}>
          <Button variant="outline" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
