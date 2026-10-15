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

async function applyHRIndexes() {
  console.log("⚡ Applying Safe Non-Destructive HR Composite Indexes on Remote PostgreSQL...\n");

  const hrIndexes = [
    // employees table indexes
    `CREATE INDEX IF NOT EXISTS "employees_school_id_idx" ON "employees" ("school_id");`,
    `CREATE INDEX IF NOT EXISTS "employees_school_level_idx" ON "employees" ("school_id", "educational_level");`,
    `CREATE INDEX IF NOT EXISTS "employees_school_dept_idx" ON "employees" ("school_id", "departement");`,
    `CREATE INDEX IF NOT EXISTS "employees_school_status_idx" ON "employees" ("school_id", "statut");`,
    `CREATE INDEX IF NOT EXISTS "employees_school_created_idx" ON "employees" ("school_id", "created_at");`,

    // employee_attendance table indexes
    `CREATE INDEX IF NOT EXISTS "employee_attendance_emp_id_idx" ON "employee_attendance" ("employee_id");`,
    `CREATE INDEX IF NOT EXISTS "employee_attendance_emp_date_idx" ON "employee_attendance" ("employee_id", "date");`,

    // salary_records table indexes
    `CREATE INDEX IF NOT EXISTS "salary_records_emp_id_idx" ON "salary_records" ("employee_id");`,
    `CREATE INDEX IF NOT EXISTS "salary_records_emp_month_idx" ON "salary_records" ("employee_id", "month_year");`,
    `CREATE INDEX IF NOT EXISTS "salary_records_emp_status_idx" ON "salary_records" ("employee_id", "status");`,

    // teacher_extra_hours table indexes
    `CREATE INDEX IF NOT EXISTS "teacher_extra_hours_school_emp_idx" ON "teacher_extra_hours" ("school_id", "employee_id");`,
    `CREATE INDEX IF NOT EXISTS "teacher_extra_hours_school_status_idx" ON "teacher_extra_hours" ("school_id", "status");`,

    // teacher_hr_requests table indexes
    `CREATE INDEX IF NOT EXISTS "teacher_hr_requests_school_emp_idx" ON "teacher_hr_requests" ("school_id", "employee_id");`,
    `CREATE INDEX IF NOT EXISTS "teacher_hr_requests_school_status_idx" ON "teacher_hr_requests" ("school_id", "status");`,
  ];

  for (const query of hrIndexes) {
    try {
      await sql.unsafe(query);
      console.log(`✅ APPLIED: ${query.split('ON')[0].trim()} ON ${query.split('ON')[1].trim()}`);
    } catch (e) {
      console.warn(`⚠️ Warning applying index (${query}):`, e.message);
    }
  }

  console.log("\n⚡ Verifying newly created HR indexes...");
  const indexes = await sql`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename IN ('employees', 'employee_attendance', 'salary_records', 'teacher_extra_hours', 'teacher_hr_requests')
    ORDER BY tablename, indexname;
  `;
  for (const idx of indexes) {
    console.log(`   • [${idx.tablename}] ${idx.indexname}`);
  }

  await sql.end();
  console.log("\n🎉 ALL HR INDEXES APPLIED SUCCESSFULLY!");
  process.exit(0);
}

applyHRIndexes().catch(async (err) => {
  console.error("Index script failed:", err);
  await sql.end();
  process.exit(1);
});
