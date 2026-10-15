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

async function run() {
  console.log("Attempting to login to remote Supabase as salissousalha@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "salissousalha@gmail.com",
    password: "123456",
  });

  if (error) {
    console.error("❌ Login failed:", error.message);
    process.exit(1);
  }

  const session = data.session;
  console.log("✅ Auth Login Success! User ID:", data.user?.id);
  console.log("Session Access Token starts with:", session?.access_token.substring(0, 20) + "...");

  // Query users table without join
  console.log("\nQuerying 'users' table in Supabase via API (no join)...");
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("*")
    .eq("supabase_id", data.user?.id)
    .maybeSingle();

  if (profileErr) {
    console.error("❌ Failed to query users table:", profileErr.message);
  } else {
    console.log("User profile (no join):", profile);
  }

  // Query users table with join
  console.log("\nQuerying 'users' table in Supabase via API (with roles join)...");
  const { data: profileWithRoles, error: profileWithRolesErr } = await supabase
    .from("users")
    .select("*, roles(*)")
    .eq("supabase_id", data.user?.id)
    .maybeSingle();

  if (profileWithRolesErr) {
    console.error("❌ Failed to query users table with roles join:", profileWithRolesErr.message);
  } else {
    console.log("User profile (with roles join):", profileWithRoles);
  }

  console.log("\nQuerying 'employees' table in Supabase via API...");
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("email", "salissousalha@gmail.com")
    .maybeSingle();

  if (empErr) {
    console.error("❌ Failed to query employees table:", empErr.message);
  } else {
    console.log("Employee record in Supabase table:", employee);
  }

  if (employee) {
    console.log("\nQuerying 'class_subjects' table via API...");
    const { data: classes, error: classesErr } = await supabase
      .from("class_subjects")
      .select("*, school_classes(class_name), school_subjects(subject_name)")
      .eq("employee_id", employee.id);

    if (classesErr) {
      console.error("❌ Failed to query class_subjects:", classesErr.message);
    } else {
      console.log("Assignments retrieved:", JSON.stringify(classes, null, 2));
    }
  }
}

run().then(() => process.exit(0));
