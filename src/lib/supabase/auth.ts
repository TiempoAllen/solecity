import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

// Use at the top of admin server components / actions.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// Use at the top of customer-account server components.
export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}
