import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote DB to add redoublement quota columns...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function addColumns() {
  try {
    console.log("Adding redoublement_count to students table...");
    await client`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS redoublement_count INTEGER DEFAULT 0;
    `;

    console.log("Adding max_redoublement to school_sections table...");
    await client`
      ALTER TABLE school_sections 
      ADD COLUMN IF NOT EXISTS max_redoublement INTEGER DEFAULT 2;
    `;

    console.log("✅ Successfully added redoublement_count and max_redoublement columns!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding redoublement quota columns:", err);
    process.exit(1);
  }
}

addColumns();
