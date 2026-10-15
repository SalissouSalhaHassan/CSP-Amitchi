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

async function inspectApplications() {
  const rows = await sql`
    SELECT id, application_number, student_first_name, student_last_name, parent_phone, candidate_phone, parent_whatsapp
    FROM admission_applications
    ORDER BY id DESC
    LIMIT 10;
  `;
  console.log("Recent applications in DB:");
  console.dir(rows, { depth: null });
  await sql.end();
}

inspectApplications().catch(console.error);
