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
  const sample = await sql`SELECT * FROM users LIMIT 1`;
  if (sample.length > 0) {
    console.log("User Keys:", Object.keys(sample[0]));
    console.log("First user:", { id: sample[0].id, nom: sample[0].nomPrenom || sample[0].utilisateur, schoolId: sample[0].school_id || sample[0].schoolId });
  }

  const allSchools = await sql`SELECT id, name, slug FROM schools ORDER BY id`;
  console.log("All Schools in DB:", allSchools);

  // Check if school 9 exists
  const school9 = await sql`SELECT * FROM schools WHERE id = 9`;
  console.log("School 9 in DB:", school9);

  if (school9.length === 0) {
    console.log("Creating School ID 9 if needed or checking why user was assigned school 9...");
  }

  await sql.end();
}

check().catch(console.error);
