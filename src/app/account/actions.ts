"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signUpCustomer(
  _prev: { error?: string; info?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; info?: string }> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName) return { error: "Please enter your name." };
  if (!email) return { error: "Please enter your email." };
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // If the Supabase project requires email confirmation, signUp() returns a
  // user but no session — there's nothing to redirect into yet.
  if (data.session) redirect("/account/orders");
  return { info: "Check your email to confirm your account, then sign in." };
}

export async function signInCustomer(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect("/account/orders");
}

export async function signOutCustomer() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
