import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== FIXING LIBRARY TABLES SCHEMA ===");
    
    console.log("Adding school_id to library_books...");
    await sql`
      ALTER TABLE public.library_books 
      ADD COLUMN IF NOT EXISTS school_id integer
    `;
    console.log("✅ Done adding school_id to library_books!");

    console.log("Adding school_id to library_issues...");
    await sql`
      ALTER TABLE public.library_issues 
      ADD COLUMN IF NOT EXISTS school_id integer
    `;
    console.log("✅ Done adding school_id to library_issues!");

  } catch (err: any) {
    console.error("Error fixing library tables:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
