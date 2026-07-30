import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { data } = await supabase.from("products").select("slug,featured,category").eq("featured", true);
console.log("featured:", data.map((p) => p.slug));
