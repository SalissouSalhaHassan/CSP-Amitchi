import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("Adding remarks column to exam_results on REMOTE DB...");
    await sql`
      ALTER TABLE exam_results 
      ADD COLUMN IF NOT EXISTS remarks text
    `;
    console.log("✅ Column remarks added successfully to exam_results!");
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
