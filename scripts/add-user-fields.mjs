/**
 * Script to add phone, hon_id, department columns to users table
 * 
 * Since we can't ALTER TABLE via the Supabase REST API,
 * this script creates a temporary helper RPC function, uses it, then drops it.
 * 
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/add-user-fields.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cavznfdphddylsyzatyd.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdnpuZmRwaGRkeWxzeXphdHlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM1MTEwNCwiZXhwIjoyMDk0OTI3MTA0fQ.qODk4yh4eMnBFI8S7JW0OwJ_bYSlWzYiaNQOiEfDmMI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Since we can't ALTER TABLE via REST API, we'll store the extra user data
// in a separate user_profiles table that we CAN create via inserts.
// But first, check if we can just upsert with the columns we know exist.

const USER_DATA = [
  { id: "user-admin", phone: "+1 (602) 555-0147", hon_id: "HON-2024-0891", department: "IT Administration" },
  { id: "user-buyer", phone: "+1 (312) 555-0234", hon_id: "HON-2024-1456", department: "Procurement" },
  { id: "user-viewer", phone: "+1 (415) 555-0389", hon_id: "HON-2024-2103", department: "Operations" },
];

async function main() {
  console.log("Checking if user_profiles table exists...");

  // Try to select from user_profiles
  const { data, error } = await supabase.from("user_profiles").select("*").limit(1);

  if (error && error.code === "PGRST204") {
    // Table exists but doesn't have the right columns
    console.log("user_profiles table exists but columns may differ.");
  } else if (error && (error.message?.includes("does not exist") || error.code === "42P01")) {
    console.log("user_profiles table does not exist.");
    console.log("\n⚠️  Please run the following SQL in Supabase SQL Editor:");
    console.log("-----------------------------------------------------");
    console.log(`
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id     text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone       text,
  hon_id      text,
  department  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.user_profiles (user_id, phone, hon_id, department) VALUES
  ('user-admin',  '+1 (602) 555-0147', 'HON-2024-0891', 'IT Administration'),
  ('user-buyer',  '+1 (312) 555-0234', 'HON-2024-1456', 'Procurement'),
  ('user-viewer', '+1 (415) 555-0389', 'HON-2024-2103', 'Operations')
ON CONFLICT (user_id) DO UPDATE SET
  phone = EXCLUDED.phone,
  hon_id = EXCLUDED.hon_id,
  department = EXCLUDED.department,
  updated_at = now();
`);
    console.log("-----------------------------------------------------");
    console.log("After running the SQL above, re-run this script.");
    return;
  } else if (!error) {
    console.log("user_profiles table exists! Upserting data...");
  }

  // Try to upsert
  for (const u of USER_DATA) {
    const { error: upsertErr } = await supabase
      .from("user_profiles")
      .upsert(
        { user_id: u.id, phone: u.phone, hon_id: u.hon_id, department: u.department },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error(`Failed to upsert ${u.id}:`, upsertErr.message);
    } else {
      console.log(`✓ ${u.id} profile updated`);
    }
  }

  // Verify
  const { data: profiles } = await supabase.from("user_profiles").select("*");
  console.log("\nUser profiles:", JSON.stringify(profiles, null, 2));
}

main().catch(console.error);
