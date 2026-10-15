import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote DB to add missing columns...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function addMissingColumns() {
  try {
    console.log("🛠️ Adding missing column 'grades_deadline' and 'is_locked' to academic_periods table if not exist...");

    await client`
      ALTER TABLE academic_periods 
      ADD COLUMN IF NOT EXISTS grades_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
    `;

    console.log("✅ Successfully added missing columns to academic_periods table!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding columns:", err);
    process.exit(1);
  }
}

addMissingColumns();
