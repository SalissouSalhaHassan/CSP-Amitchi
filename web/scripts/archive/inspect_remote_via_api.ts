import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName: string) {
  console.log(`\n--- Querying remote table: ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select("*");
  if (error) {
    console.error(`❌ Failed to query ${tableName}:`, error.message);
  } else {
    console.log(`Success! ${tableName} count:`, data.length);
    if (data.length > 0) {
      console.table(data.slice(0, 10)); // print first 10 rows
    }
  }
}

async function run() {
  console.log("Logging in to remote Supabase to get an authenticated session...");
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: "superadmin@gmail.com",
    password: "123456"
  });

  if (loginErr) {
    console.error("❌ Login failed:", loginErr.message);
    process.exit(1);
  }
  console.log("✅ Authenticated as user:", loginData.user?.email);

  await inspectTable("roles");
  await inspectTable("users");
  await inspectTable("employees");
  await inspectTable("school_classes");
  await inspectTable("school_subjects");
  await inspectTable("class_subjects");
}

run().then(() => process.exit(0));
