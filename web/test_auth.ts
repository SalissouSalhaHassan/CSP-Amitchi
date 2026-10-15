import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin(email: string, pass: string) {
  console.log(`Testing login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    console.error(`❌ Login failed for ${email}: ${error.message} (status: ${error.status})`);
  } else {
    console.log(`✅ Login SUCCESS for ${email}! User ID: ${data.user?.id}`);
  }
}

async function run() {
  await testLogin("superadmin@gmail.com", "123456");
  await testLogin("viewer@test.com", "password123");
  await testLogin("superadmin@gmail.com", "TemporaryPassword123!");
}

run().then(() => process.exit(0));
