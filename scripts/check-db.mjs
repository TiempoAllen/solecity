import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.from("products").select("id");
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
console.log(`OK: products readable via anon, count=${data.length}`);
