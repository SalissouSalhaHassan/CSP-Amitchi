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
    for (const sid of [413, 414, 410]) {
      console.log(`\n=== ATTENDANCE FOR STUDENT ${sid} ===`);
      const att = await sql`
        SELECT a.id, a.student_id, a.class_id, a.subject_id, a.employee_id, a.date, a.status, a.remark, a.recorded_by,
               s.subject_name, e.nom as teacher_name
        FROM student_attendance a
        LEFT JOIN school_subjects s ON a.subject_id = s.id
        LEFT JOIN employees e ON a.employee_id = e.id
        WHERE a.student_id = ${sid}
        ORDER BY a.date DESC
      `;
      console.log(`Found ${att.length} records:`, att);

      console.log(`=== TIMETABLE FOR STUDENT ${sid} ===`);
      const student = (await sql`SELECT id, classe, school_id FROM students WHERE id = ${sid}`)[0];
      console.log("Student:", student);

      if (student && student.classe) {
        const classObj = (await sql`SELECT id, class_name FROM school_classes WHERE class_name = ${student.classe} AND school_id = ${student.school_id}`)[0];
        console.log("Class:", classObj);
        if (classObj) {
          const timetable = await sql`
            SELECT te.id, te.day_of_week, te.start_time, te.end_time, sub.subject_name, emp.nom as teacher_name, te.room
            FROM timetable_entries te
            LEFT JOIN school_subjects sub ON te.subject_id = sub.id
            LEFT JOIN employees emp ON te.employee_id = emp.id
            WHERE te.class_id = ${classObj.id}
          `;
          console.log(`Timetable entries for class ${classObj.id}:`, timetable);

          const hw = await sql`
            SELECT h.id, h.title, h.description, h.due_date, sub.subject_name
            FROM homeworks h
            LEFT JOIN school_subjects sub ON h.subject_id = sub.id
            WHERE h.class_id = ${classObj.id}
          `;
          console.log(`Homework entries for class ${classObj.id}:`, hw);
        }
      }
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
