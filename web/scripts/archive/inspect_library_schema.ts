import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING library_books TABLE SCHEMA ===");
    
    // Columns info
    const cols = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'library_books'
    `;
    console.log("Columns:", cols);

    // Constraints info
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'library_books'::regclass
    `;
    console.log("Constraints:", constraints);

  } catch (err: any) {
    console.error("Error inspecting schema:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
