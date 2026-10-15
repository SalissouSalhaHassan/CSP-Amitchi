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
    console.log("=== SEARCHING FOR STUDENT WITH FRANCAIS / MATHS ===");
    const res = await sql`
      SELECT r.*, st.nom_etudiant, st.id as student_id, s.subject_name
      FROM student_results r
      LEFT JOIN students st ON r.student_id = st.id
      LEFT JOIN school_subjects s ON r.subject_id = s.id
      WHERE s.subject_name ILIKE '%Français%' OR s.subject_name ILIKE '%Math%'
      ORDER BY r.id DESC
      LIMIT 30
    `;
    console.log(JSON.stringify(res, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
