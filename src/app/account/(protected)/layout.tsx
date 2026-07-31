import { requireCustomer } from "@/lib/supabase/auth";
import { signOutCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomer();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-lg font-semibold">My account</h1>
        <form action={signOutCustomer}>
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
