import { db } from "../src/infrastructure/database";
import { sql } from "drizzle-orm";

async function run() {
  console.log("🚀 Applying Safe Performance Indexes...");
  
  const indexes = [
    // Students
    `CREATE INDEX IF NOT EXISTS students_school_id_idx ON students (school_id);`,
    `CREATE INDEX IF NOT EXISTS students_school_level_idx ON students (school_id, educational_level);`,
    `CREATE INDEX IF NOT EXISTS students_school_class_idx ON students (school_id, classe);`,
    `CREATE INDEX IF NOT EXISTS students_school_status_idx ON students (school_id, statut);`,
    `CREATE INDEX IF NOT EXISTS students_school_created_idx ON students (school_id, created_at);`,

    // Expenses
    `CREATE INDEX IF NOT EXISTS expenses_school_id_idx ON expenses (school_id);`,
    `CREATE INDEX IF NOT EXISTS expenses_school_date_idx ON expenses (school_id, date_expense);`,
    `CREATE INDEX IF NOT EXISTS expenses_school_level_idx ON expenses (school_id, educational_level);`,

    // Revenues
    `CREATE INDEX IF NOT EXISTS revenues_school_id_idx ON revenues (school_id);`,
    `CREATE INDEX IF NOT EXISTS revenues_school_date_idx ON revenues (school_id, date_received);`,
    `CREATE INDEX IF NOT EXISTS revenues_school_level_idx ON revenues (school_id, educational_level);`,

    // Student Fees & Payments
    `CREATE INDEX IF NOT EXISTS student_fees_school_id_idx ON student_fees (school_id);`,
    `CREATE INDEX IF NOT EXISTS student_fees_school_session_idx ON student_fees (school_id, session_id);`,
    `CREATE INDEX IF NOT EXISTS student_fees_student_id_idx ON student_fees (student_id);`,
    `CREATE INDEX IF NOT EXISTS student_fees_status_idx ON student_fees (school_id, session_id, status);`,
    `CREATE INDEX IF NOT EXISTS fee_payments_school_id_idx ON fee_payments (school_id);`,
    `CREATE INDEX IF NOT EXISTS fee_payments_fee_id_idx ON fee_payments (fee_id);`,
    `CREATE INDEX IF NOT EXISTS fee_payments_school_date_idx ON fee_payments (school_id, date_paid);`,
  ];

  for (const idx of indexes) {
    try {
      await db.execute(sql.raw(idx));
      console.log(`✅ Success: ${idx}`);
    } catch (err: any) {
      console.warn(`⚠️ Notice for: ${idx} -> ${err.message}`);
    }
  }

  console.log("🎉 All safe indexes successfully ensured!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
