import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

// handle_new_user trigger already inserted the profile as 'customer'; promote it.
const { error: upErr } = await admin
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", data.user.id);
if (upErr) {
  console.error("FAIL promoting:", upErr.message);
  process.exit(1);
}
console.log(`Admin created: ${email} (${data.user.id})`);
