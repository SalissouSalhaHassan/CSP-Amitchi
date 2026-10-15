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

async function test() {
  try {
    const schoolId = 9;
    // Check classes
    const classes = await sql`SELECT id, class_name FROM school_classes WHERE school_id = ${schoolId}`;
    console.log("Classes found:", classes.map(c => c.class_name));

    // Check subjects
    const subjects = await sql`SELECT id, subject_name FROM school_subjects WHERE school_id = ${schoolId}`;
    console.log("Subjects found:", subjects.map(s => s.subject_name));

    // Check employees in school 9
    const emps = await sql`SELECT id, nom, emp_id, poste, salaire_base FROM employees WHERE school_id = ${schoolId} LIMIT 5`;
    console.log("Employees in school 9:", emps);

    // Check teacher_extra_hours
    const extra = await sql`SELECT * FROM teacher_extra_hours WHERE school_id = ${schoolId}`;
    console.log("Extra hours in school 9:", extra);

    // Check teacher_hr_requests
    const reqs = await sql`SELECT * FROM teacher_hr_requests WHERE school_id = ${schoolId}`;
    console.log("HR requests in school 9:", reqs);

  } catch (e) {
    console.error("Test error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

test();
