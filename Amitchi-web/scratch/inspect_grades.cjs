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
    console.log("=== SAMPLE STUDENT RESULTS ===");
    const results = await sql`
      SELECT r.id, r.student_id, st.nom_etudiant, r.subject_id, s.subject_name,
             r.class_work_score, r.exam_score, r.total_score, r.moyenne_devoirs,
             r.coefficient, r.weighted_score, r.term
      FROM student_results r
      LEFT JOIN students st ON r.student_id = st.id
      LEFT JOIN school_subjects s ON r.subject_id = s.id
      ORDER BY r.id DESC
      LIMIT 25
    `;
    console.log(JSON.stringify(results, null, 2));

    console.log("=== SAMPLE STUDENT TERM SUMMARIES ===");
    const summaries = await sql`
      SELECT s.*, st.nom_etudiant
      FROM student_term_summaries s
      LEFT JOIN students st ON s.student_id = st.id
      ORDER BY s.id DESC
      LIMIT 10
    `;
    console.log(JSON.stringify(summaries, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
