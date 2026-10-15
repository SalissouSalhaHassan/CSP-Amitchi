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
    console.log("=== SEARCHING STUDENT RESULTS WITH THOSE GRADES ===");
    const res = await sql`
      SELECT r.*, st.nom_etudiant, st.id as student_id, st.classe, s.subject_name
      FROM student_results r
      LEFT JOIN students st ON r.student_id = st.id
      LEFT JOIN school_subjects s ON r.subject_id = s.id
      WHERE r.total_score IN (5.8, 6, 6.8, 8.7, 9, 11.6, 12, 13.6, 17.4, 18, 5.75, 8.75)
         OR r.weighted_score IN (5.8, 6, 6.8, 8.7, 9, 17.4, 23.2, 34.8)
         OR r.exam_score IN (5.8, 6, 6.8, 8.7, 9)
      ORDER BY r.student_id, r.id
    `;
    console.log(JSON.stringify(res, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
