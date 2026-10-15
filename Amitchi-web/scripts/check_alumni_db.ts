import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== CHECK ALUMNI TABLES ===");
  const alumniTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('alumni', 'digital_certificates')
  `;
  console.log("Tables found:", alumniTable);

  if (alumniTable.length > 0) {
    const cols = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('alumni', 'digital_certificates')
      ORDER BY table_name, ordinal_position
    `;
    console.log("Columns:", cols);
  }

  // Check permissions / modules for Alumni
  const modules = await sql`SELECT * FROM modules WHERE nom_module ILIKE '%alumni%'`;
  console.log("Alumni module in DB:", modules);

  await sql.end();
}

main().catch(console.error);
