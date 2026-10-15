import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("Wiping all students and related records on REMOTE database...");
    
    // We use TRUNCATE with CASCADE to clean students and any referencing child records (like fees, results, etc.)
    await sql.unsafe(`TRUNCATE TABLE "students" RESTART IDENTITY CASCADE;`);
    
    console.log("✅ Successfully wiped all students from REMOTE database!");
  } catch (err: any) {
    console.error("❌ Failed to wipe students on REMOTE database:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
