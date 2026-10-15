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
    const users = await sql`
      SELECT u.id, u.school_id, u.utilisateur, u.nom_prenom, u.student_id, u.role_id, s.nom_etudiant, s.num_admission, s.classe, s.mobile
      FROM users u
      LEFT JOIN students s ON u.student_id = s.id
      WHERE u.school_id = 9 OR u.utilisateur ILIKE '%habsatou%' OR u.nom_prenom ILIKE '%habsatou%' OR u.utilisateur ILIKE '%almou%'
      ORDER BY u.id DESC
    `;
    console.log("USERS AND LINKED STUDENTS:");
    for (const u of users) {
      console.log(JSON.stringify(u));
    }

    console.log("\nSTUDENTS with Habsatou or Almou or Saminou:");
    const students = await sql`
      SELECT id, school_id, num_admission, nom_etudiant, classe, mobile, whatsapp
      FROM students
      WHERE nom_etudiant ILIKE '%habsatou%' OR nom_etudiant ILIKE '%almou%' OR nom_etudiant ILIKE '%saminou%'
    `;
    for (const s of students) {
      console.log(JSON.stringify(s));
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
