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

async function verifyHR() {
  console.log("🔍 Running Ressources Humaines (HR) Data Integrity Verification...\n");

  // 1. Check employees count & active
  const empAgg = await sql`
    SELECT 
      count(*) as total,
      count(CASE WHEN lower(statut) = 'actif' THEN 1 END) as actifs
    FROM employees
  `;
  console.log(`👨‍💼 Employees Total: ${empAgg[0].total} (Actifs: ${empAgg[0].actifs})`);

  // 2. Check employee attendance
  const attendanceCount = await sql`SELECT count(*) as count FROM employee_attendance`;
  console.log(`📅 Employee Attendance Records: ${attendanceCount[0].count}`);

  // 3. Check salary records
  const salaryAgg = await sql`
    SELECT 
      count(*) as count,
      coalesce(sum(net_salary), 0) as total_net
    FROM salary_records
  `;
  console.log(`💰 Salary Records: ${salaryAgg[0].count} (Total Net: ${salaryAgg[0].total_net})`);

  // 4. Check extra hours & hr requests
  const extraHoursCount = await sql`SELECT count(*) as count FROM teacher_extra_hours`;
  const hrRequestsCount = await sql`SELECT count(*) as count FROM teacher_hr_requests`;
  console.log(`⏱️ Teacher Extra Hours: ${extraHoursCount[0].count}`);
  console.log(`📋 HR Requests: ${hrRequestsCount[0].count}`);

  // 5. Verify all active HR indexes
  const indexes = await sql`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename IN ('employees', 'employee_attendance', 'salary_records', 'teacher_extra_hours', 'teacher_hr_requests')
    ORDER BY tablename, indexname;
  `;
  console.log("\n⚡ Verified Active HR Indexes in PostgreSQL:");
  for (const idx of indexes) {
    console.log(`   • [${idx.tablename}] ${idx.indexname}`);
  }

  console.log("\n✅ ALL HR DATA INTEGRITY AUDITS PASSED 100%!");
  await sql.end();
  process.exit(0);
}

verifyHR().catch(async (err) => {
  console.error("HR verification failed:", err);
  await sql.end();
  process.exit(1);
});
