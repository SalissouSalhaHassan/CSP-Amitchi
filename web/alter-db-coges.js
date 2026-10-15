const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("Adding new columns to coges_payments...");
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "student_id" integer`;
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "classe" varchar(100)`;
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "session" varchar(50)`;
    console.log("Done! Columns added successfully.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
run();
