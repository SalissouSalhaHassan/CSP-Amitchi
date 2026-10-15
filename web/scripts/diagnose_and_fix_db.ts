import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function run() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("🔍 Checking tables, row counts, and RLS status on Supabase PostgreSQL...");

  const tables = [
    "schools",
    "users",
    "roles",
    "permissions",
    "students",
    "employees",
    "school_classes",
    "school_subjects",
    "class_subjects",
    "student_fees",
    "expenses",
    "student_attendance",
    "exams",
    "student_results"
  ];

  for (const t of tables) {
    try {
      const countRes = await sql.unsafe(`SELECT count(*) FROM public.${t}`);
      const rlsRes = await sql.unsafe(`SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '${t}'`);
      const rowCount = countRes[0]?.count;
      const isRls = rlsRes[0]?.rowsecurity;
      console.log(`📊 Table [${t}]: ${rowCount} rows | RLS Enabled: ${isRls}`);
    } catch (e: any) {
      console.error(`❌ Table [${t}] error:`, e.message);
    }
  }

  // Check what users exist in the public.users table
  console.log("\n👤 Checking public.users rows:");
  try {
    const userRows = await sql.unsafe(`SELECT id, utilisateur, nom_prenom, admin, super_admin, school_id, role_id FROM public.users LIMIT 10`);
    console.table(userRows);
  } catch (e: any) {
    console.error("❌ Error fetching users:", e.message);
  }

  // Check what schools exist
  console.log("\n🏫 Checking public.schools rows:");
  try {
    const schoolRows = await sql.unsafe(`SELECT id, name, slug FROM public.schools LIMIT 10`);
    console.table(schoolRows);
  } catch (e: any) {
    console.error("❌ Error fetching schools:", e.message);
  }

  await sql.end();
  process.exit(0);
}

run();
