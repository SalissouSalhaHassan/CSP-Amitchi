const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[match[1]] = val;
  }
}

const postgres = require(path.join(__dirname, '..', 'node_modules', 'postgres'));
const connectionString = envVars.REMOTE_DATABASE_URL || envVars.DATABASE_URL;
const sql = postgres(connectionString, { ssl: 'require' });

async function testDrizzleQuery() {
  try {
    // Let's test the raw SQL query joining school_subjects and employees
    const rows = await sql`
      SELECT a.id, a.student_id, a.class_id, a.subject_id, a.employee_id, a.date, a.status, a.remark, a.recorded_by,
             s.subject_name, e.nom as teacher_name
      FROM student_attendance a
      LEFT JOIN school_subjects s ON a.subject_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.student_id = 414
      ORDER BY a.date DESC
    `;
    console.log("Success with SQL! Found rows:", rows.length);
    console.log(rows);
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

testDrizzleQuery();
