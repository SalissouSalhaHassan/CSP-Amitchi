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
    console.log("=== TOTAL ATTENDANCE ROWS ===");
    const total = await sql`SELECT count(*) FROM student_attendance`;
    console.log(total);

    console.log("=== RECENT ATTENDANCE ROWS ===");
    const rows = await sql`
      SELECT a.id, a.student_id, s.nom_etudiant, a.date, a.status, a.remark, a.recorded_by
      FROM student_attendance a
      LEFT JOIN students s ON a.student_id = s.id
      ORDER BY a.id DESC
      LIMIT 10
    `;
    console.log(rows);

    console.log("=== RESULTS / BULLETINS FOR 413 & 414 ===");
    const res = await sql`
      SELECT id, student_id, class_id, subject_id, term, absences
      FROM student_results
      WHERE student_id IN (413, 414, 410)
    `;
    console.log(res);

    console.log("=== TIMETABLES FOR CLASS L1 Administration ===");
    const timetables = await sql`
      SELECT t.id, t.class_id, c.class_name, t.day_of_week, t.start_time, t.end_time, s.subject_name
      FROM timetables t
      LEFT JOIN school_classes c ON t.class_id = c.id
      LEFT JOIN school_subjects s ON t.subject_id = s.id
      WHERE c.class_name ILIKE '%L1%Admin%'
    `;
    console.log(timetables);

    console.log("=== HOMEWORK FOR CLASS L1 Administration ===");
    const homework = await sql`
      SELECT h.id, h.title, h.class_id, c.class_name, h.due_date
      FROM homeworks h
      LEFT JOIN school_classes c ON h.class_id = c.id
      WHERE c.class_name ILIKE '%L1%Admin%'
    `;
    console.log(homework);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
