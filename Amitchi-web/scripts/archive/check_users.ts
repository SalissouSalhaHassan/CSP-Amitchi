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
  console.log("Querying all users from users table:");
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, utilisateur, email, admin, super_admin, role_id, roles(role_name)");

  if (usersErr) {
    console.error("Error fetching users:", usersErr);
  } else {
    console.log("Users in DB:");
    console.table(users);
  }

  console.log("\nQuerying all roles:");
  const { data: roles, error: rolesErr } = await supabase
    .from("roles")
    .select("*");

  if (rolesErr) {
    console.error("Error fetching roles:", rolesErr);
  } else {
    console.log("Roles in DB:");
    console.table(roles);
  }
}

run().then(() => process.exit(0));
