import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/infrastructure/database";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Signing in as superadmin@gmail.com...");
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: "superadmin@gmail.com",
    password: "123456"
  });

  const { data: schools } = await supabase.from("schools").select("*");
  console.log("Remote Schools:", schools);
  process.exit(0);
}

run();
