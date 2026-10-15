import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("Checking remote academic_periods and school_sessions...");
    const periods = await sql`SELECT * FROM academic_periods`;
    console.log("Current remote periods:", periods);
    const sessions = await sql`SELECT * FROM school_sessions`;
    console.log("Current remote sessions:", sessions);
  } catch (err: any) {
    console.error("❌ Database operation failed:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
