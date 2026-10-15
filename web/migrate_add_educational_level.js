const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("🚀 Starting database migration to add educational_level column to other_revenues...");

    const table = "other_revenues";
    try {
      await sql`ALTER TABLE ${sql(table)} ADD COLUMN IF NOT EXISTS "educational_level" varchar(50)`;
      console.log(`✅ Column added to ${table}.`);
    } catch (e) {
      console.warn(`⚠️ Error updating table ${table}:`, e.message);
    }

    console.log("🏁 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
