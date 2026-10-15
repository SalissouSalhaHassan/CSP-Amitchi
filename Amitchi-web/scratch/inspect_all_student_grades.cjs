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
    const studentsWithGrades = await sql`
      SELECT DISTINCT r.student_id, st.nom_etudiant, st.classe
      FROM student_results r
      JOIN students st ON r.student_id = st.id
      ORDER BY r.student_id
      LIMIT 20
    `;

    for (const s of studentsWithGrades) {
      const grades = await sql`
        SELECT r.subject_id, r.total_score, r.class_work_score, r.exam_score, r.moyenne_devoirs, r.coefficient, r.weighted_score,
               s.subject_name, s.subject_code, r.term
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${s.student_id}
        ORDER BY r.term DESC, r.subject_id
      `;

      console.log(`\n=================== STUDENT #${s.student_id}: ${s.nom_etudiant} (${s.classe}) ===================`);
      grades.forEach(g => {
        console.log(`- ${g.subject_name} [${g.term}]: total=${g.total_score}, exam=${g.exam_score}, class_work=${g.class_work_score}, moy_dev=${g.moyenne_devoirs}, coef=${g.coefficient}, weighted=${g.weighted_score}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
