import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("Checking if pedagogie_remediations table exists on REMOTE DB...");
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pedagogie_remediations'
      );
    `;
    console.log("Exists:", result[0].exists);
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
