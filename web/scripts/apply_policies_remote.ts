import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    const sqlPath = path.join(__dirname, "setup-self-rls.sql");
    const queries = fs.readFileSync(sqlPath, "utf8");

    console.log("Applying self-RLS policies to REMOTE database...");
    await sql.unsafe(queries);
    console.log("✅ RLS policies applied to REMOTE database successfully!");

  } catch (err: any) {
    console.error("❌ Failed to apply policies to REMOTE database:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
