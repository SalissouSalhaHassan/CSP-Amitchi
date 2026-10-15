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
    console.log("🚀 Expanding SaaS Schema to all modules...");

    const tablesToUpdate = [
      "students",
      "expense_categories",
      "expenses",
      "revenue_categories",
      "revenues",
      "pos_sales",
      "student_fees",
      "fee_payments",
      "school_sessions",
      "academic_periods",
      "educational_levels",
      "school_sections",
      "school_classes",
      "school_subjects",
      "class_subjects",
      "exams",
      "exam_results"
    ];

    for (const table of tablesToUpdate) {
      console.log(`Updating table: ${table}...`);
      try {
        await sql`ALTER TABLE ${sql(table)} ADD COLUMN IF NOT EXISTS "school_id" integer REFERENCES schools(id)`;
        console.log(`✅ Table ${table} updated.`);
      } catch (e) {
        console.warn(`⚠️ Error updating table ${table}:`, e.message);
      }
    }

    console.log("🏁 SaaS Schema expansion completed!");
  } catch (error) {
    console.error("❌ Fatal error in SaaS schema expansion:", error);
  } finally {
    process.exit(0);
  }
}

run();
