import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote DB to create period_extension_requests table...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function createTable() {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS period_extension_requests (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        period_id INTEGER REFERENCES academic_periods(id),
        period_name VARCHAR(100),
        teacher_id INTEGER,
        teacher_name VARCHAR(150),
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'En attente',
        requested_at TIMESTAMP DEFAULT NOW(),
        handled_at TIMESTAMP
      );
    `;
    console.log("✅ Successfully created period_extension_requests table in Supabase Remote DB!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating table:", err);
    process.exit(1);
  }
}

createTable();
