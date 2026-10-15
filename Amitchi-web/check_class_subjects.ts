import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("\n=== LISTING COLUMNS FOR exam_results ===");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'exam_results'
    `;
    console.log("Columns of exam_results:", columns);
    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ FAILED:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
