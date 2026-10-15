const postgres = require("postgres");

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const run = async () => {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'hostel_allocations'
    `;
    console.log("=== REMOTE COLUMNS IN HOSTEL_ALLOCATIONS ===");
    console.log(columns);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
