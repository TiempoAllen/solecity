import { requireAdmin } from "@/lib/supabase/auth";
import { signOutAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between border-b pb-4">
        <AdminNav />
        <form action={signOutAdmin}>
          <Button variant="outline" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
