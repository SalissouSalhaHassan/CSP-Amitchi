import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseAuth() {
  console.log("=== REMOTE SUPABASE AUTH CHECK ===");
  const email = "superadmin@gmail.com";
  const pass = "123456";
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    console.error(`❌ Supabase Auth failed: ${error.message} (status: ${error.status})`);
    return null;
  }

  console.log(`✅ Supabase Auth SUCCESS!`);
  console.log("User details:", {
    id: data.user?.id,
    email: data.user?.email,
    role: data.user?.role,
    user_metadata: data.user?.user_metadata,
  });

  // Now, let's query the 'users' table in Supabase via client
  console.log("\nQuerying 'users' table in Supabase via API for superadmin...");
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("*, roles(*)")
    .eq("supabase_id", data.user?.id)
    .maybeSingle();

  if (profileErr) {
    console.error("❌ Failed to query users table:", profileErr.message);
  } else {
    console.log("User profile in Supabase table:", profile);
  }

  // Let's list all records in 'users' table to see what's there
  console.log("\nListing all records in remote 'users' table...");
  const { data: allUsers, error: allUsersErr } = await supabase
    .from("users")
    .select("*, roles(role_name)");

  if (allUsersErr) {
    console.error("❌ Failed to list users table:", allUsersErr.message);
  } else {
    console.log("All users in remote table:", allUsers);
  }

  return data.user?.id;
}

async function checkLocalDB(supabaseId: string | null | undefined) {
  if (!dbUrl) {
    console.log("No DATABASE_URL set");
    return;
  }
  console.log("\n=== LOCAL POSTGRESQL DB CHECK ===");
  const sql = postgres(dbUrl, { prepare: false });

  try {
    const userInDb = await sql`
      SELECT u.*, r.role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.utilisateur = 'salissousalha@gmail.com'
    `;
    console.log("User in local DB:", userInDb);

    if (supabaseId) {
      const userBySupabaseId = await sql`
        SELECT u.*, r.role_name 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.supabase_id = ${supabaseId}
      `;
      console.log("User by Supabase ID in local DB:", userBySupabaseId);
    }

    const employeeInDb = await sql`
      SELECT * FROM employees WHERE email = 'salissousalha@gmail.com'
    `;
    console.log("Employee in local DB:", employeeInDb);

  } catch (err: any) {
    console.error("Local DB query error:", err.message);
  } finally {
    await sql.end();
  }
}

async function run() {
  const uid = await checkSupabaseAuth();
  await checkLocalDB(uid);
}

run().then(() => process.exit(0));
