import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING RLS FOR HOSTEL TABLES ===");
    
    const rls = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('hostel_rooms', 'hostel_allocations')
    `;
    console.log("RLS Info:", rls);

    const policies = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual
      FROM pg_policies
      WHERE tablename IN ('hostel_rooms', 'hostel_allocations')
    `;
    console.log("Policies:", policies);

  } catch (err: any) {
    console.error("Error inspecting RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
