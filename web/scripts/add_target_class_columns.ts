import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote DB to add target_class columns...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function addColumns() {
  try {
    await client`
      ALTER TABLE student_term_summaries
      ADD COLUMN IF NOT EXISTS target_class_id INTEGER REFERENCES school_classes(id),
      ADD COLUMN IF NOT EXISTS target_class_name VARCHAR(100);
    `;
    console.log("✅ Successfully added target_class_id and target_class_name to student_term_summaries!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding columns:", err);
    process.exit(1);
  }
}

addColumns();
