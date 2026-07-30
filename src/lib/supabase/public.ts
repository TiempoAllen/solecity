import { createClient } from "@supabase/supabase-js";

// Cookieless anon client for PUBLIC catalog reads. No session => Server
// Components using it stay cacheable/ISR-friendly. RLS allows public SELECT.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
