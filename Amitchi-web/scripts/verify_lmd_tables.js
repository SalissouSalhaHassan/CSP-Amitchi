const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

let connStr = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  let remoteUrl = null;
  let localUrl = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('REMOTE_DATABASE_URL=')) {
      remoteUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('DATABASE_URL=')) {
      localUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    }
  }
  connStr = remoteUrl || localUrl || connStr;
}

const sql = postgres(connStr, { ssl: { rejectUnauthorized: false } });

async function verifyTables() {
  const faculties = await sql`SELECT * FROM university_faculties`;
  const departments = await sql`SELECT * FROM university_departments`;
  const programs = await sql`SELECT * FROM university_programs`;
  const ues = await sql`SELECT * FROM lmd_unites_enseignement`;
  const ecus = await sql`SELECT * FROM lmd_elements_constitutifs`;

  console.log("Faculties count:", faculties.length);
  console.log("Departments count:", departments.length);
  console.log("Programs count:", programs.length);
  console.log("UEs count:", ues.length);
  console.log("ECUs count:", ecus.length);

  process.exit(0);
}

verifyTables().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
