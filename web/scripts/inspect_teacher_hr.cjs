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

async function main() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableNames = tables.map(t => t.table_name);
    console.log("Has teacher_extra_hours:", tableNames.includes('teacher_extra_hours'));
    console.log("Has teacher_hr_requests:", tableNames.includes('teacher_hr_requests'));
    console.log("Has salary_records:", tableNames.includes('salary_records'));
    console.log("Has employees:", tableNames.includes('employees'));

    const emps = await sql`SELECT id, nom, emp_id, poste, salaire_base, school_id, email, mobile FROM employees LIMIT 10`;
    console.log("Sample Employees:", emps);

    const usersSample = await sql`SELECT id, utilisateur, nom_prenom, role_id, employee_id, school_id FROM users LIMIT 10`;
    console.log("Sample Users:", usersSample);

    if (tableNames.includes('teacher_extra_hours')) {
      const extra = await sql`SELECT * FROM teacher_extra_hours LIMIT 5`;
      console.log("Extra hours:", extra);
    }
    if (tableNames.includes('teacher_hr_requests')) {
      const reqs = await sql`SELECT * FROM teacher_hr_requests LIMIT 5`;
      console.log("HR requests:", reqs);
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
