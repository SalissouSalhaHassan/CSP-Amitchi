import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== REMOTE POLICIES ===");
    const policies = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies;
    `;
    console.log(JSON.stringify(policies, null, 2));

  } catch (err: any) {
    console.error("Error querying policies:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
