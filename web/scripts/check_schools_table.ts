import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("🔍 Inspecting columns of public.schools table...");
  const columns = await sql.unsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schools'
  `);
  console.table(columns);

  console.log("\n🧪 Testing update query...");
  try {
    const res = await sql.unsafe(`
      UPDATE public.schools 
      SET plan = 'enterprise', status = 'active', subscription_expiry = NOW() + INTERVAL '1 year', license_key = 'EDUT-ENT-TEST-2027'
      WHERE id = 9
      RETURNING *
    `);
    console.log("✅ Update succeeded:", res[0]);
  } catch (e: any) {
    console.error("❌ Update failed with error:", e.message);
  }

  await sql.end();
  process.exit(0);
}

main();
