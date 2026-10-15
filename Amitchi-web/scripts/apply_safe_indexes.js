const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

let connStr = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  let remoteUrl = null;
  let localUrl = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('REMOTE_DATABASE_URL=')) {
      remoteUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('DATABASE_URL=')) {
      localUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    }
  }
  connStr = remoteUrl || localUrl || connStr;
}

if (!connStr) {
  console.error("No DATABASE_URL found!");
  process.exit(1);
}

const sql = postgres(connStr, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("🚀 Applying Remaining Safe Performance Indexes...");

  const queries = [
    { name: "students_school_id_idx", q: sql`CREATE INDEX IF NOT EXISTS students_school_id_idx ON students (school_id)` },
    { name: "students_school_level_idx", q: sql`CREATE INDEX IF NOT EXISTS students_school_level_idx ON students (school_id, educational_level)` },
    { name: "students_school_class_idx", q: sql`CREATE INDEX IF NOT EXISTS students_school_class_idx ON students (school_id, classe)` },
    { name: "students_school_status_idx", q: sql`CREATE INDEX IF NOT EXISTS students_school_status_idx ON students (school_id, statut)` },
    { name: "students_school_created_idx", q: sql`CREATE INDEX IF NOT EXISTS students_school_created_idx ON students (school_id, created_at)` },
    { name: "expenses_school_id_idx", q: sql`CREATE INDEX IF NOT EXISTS expenses_school_id_idx ON expenses (school_id)` },
    { name: "expenses_school_date_idx", q: sql`CREATE INDEX IF NOT EXISTS expenses_school_date_idx ON expenses (school_id, date_expense)` },
    { name: "expenses_school_level_idx", q: sql`CREATE INDEX IF NOT EXISTS expenses_school_level_idx ON expenses (school_id, educational_level)` },
    { name: "student_fees_school_id_idx", q: sql`CREATE INDEX IF NOT EXISTS student_fees_school_id_idx ON student_fees (school_id)` },
    { name: "student_fees_school_session_idx", q: sql`CREATE INDEX IF NOT EXISTS student_fees_school_session_idx ON student_fees (school_id, session_id)` },
    { name: "student_fees_student_id_idx", q: sql`CREATE INDEX IF NOT EXISTS student_fees_student_id_idx ON student_fees (student_id)` },
    { name: "student_fees_status_idx", q: sql`CREATE INDEX IF NOT EXISTS student_fees_status_idx ON student_fees (school_id, session_id, status)` },
    { name: "fee_payments_school_id_idx", q: sql`CREATE INDEX IF NOT EXISTS fee_payments_school_id_idx ON fee_payments (school_id)` },
    { name: "fee_payments_fee_id_idx", q: sql`CREATE INDEX IF NOT EXISTS fee_payments_fee_id_idx ON fee_payments (fee_id)` },
    { name: "fee_payments_school_date_idx", q: sql`CREATE INDEX IF NOT EXISTS fee_payments_school_date_idx ON fee_payments (school_id, date_paid)` },
  ];

  for (const item of queries) {
    try {
      await item.q;
      console.log(`✅ ${item.name}`);
    } catch (err) {
      console.warn(`⚠️ Notice for ${item.name}: ${err.message}`);
    }
  }

  console.log("🎉 Index process completed!");
  await sql.end();
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Fatal:", e);
  await sql.end();
  process.exit(1);
});
