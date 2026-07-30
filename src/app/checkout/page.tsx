import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prefill = { name: "", email: "" };
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", user.id)
      .maybeSingle();
    prefill = {
      name: profile?.full_name ?? "",
      email: profile?.email ?? user.email ?? "",
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Guest checkout — no account required. Ships nationwide from Cebu City.
      </p>
      <div className="mt-8">
        <CheckoutForm prefill={prefill} />
      </div>
    </div>
  );
}
