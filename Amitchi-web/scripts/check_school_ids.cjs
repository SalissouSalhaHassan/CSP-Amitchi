const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

function getDbUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return process.env.DATABASE_URL;
}

const dbUrl = getDbUrl();
const sql = postgres(dbUrl, { max: 1 });

async function check() {
  const usersWith9 = await sql`SELECT id, utilisateur, school_id, admin, super_admin FROM users WHERE school_id = 9`;
  console.log("Users with school_id = 9:", usersWith9);

  const distinctSchoolIdsInUsers = await sql`SELECT DISTINCT school_id FROM users`;
  console.log("Distinct school_id in users:", distinctSchoolIdsInUsers);

  const distinctSchoolIdsInStudents = await sql`SELECT DISTINCT school_id FROM students`;
  console.log("Distinct school_id in students:", distinctSchoolIdsInStudents);

  await sql.end();
}

check().catch(console.error);
