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

function matchPhone(dbPhone, inputPhone) {
  if (!dbPhone || !inputPhone) return false;
  const dbDigits = dbPhone.replace(/\D/g, '');
  const inputDigits = inputPhone.replace(/\D/g, '');
  if (!dbDigits || !inputDigits) return false;

  // Match if exact, or if either is a suffix/substring of length >= 6
  if (dbDigits === inputDigits) return true;
  if (dbDigits.endsWith(inputDigits) || inputDigits.endsWith(dbDigits)) return true;
  if (dbDigits.includes(inputDigits) || inputDigits.includes(dbDigits)) return true;
  
  // Last 8 digits match (standard phone number without country code)
  const last8Db = dbDigits.slice(-8);
  const last8Input = inputDigits.slice(-8);
  return last8Db.length >= 6 && last8Db === last8Input;
}

async function testMatch() {
  const appNumber = 'UNIV-2026-003-2244';
  const inputPhone = '+227 99 42 52 98';

  const rows = await sql`
    SELECT * FROM admission_applications
    WHERE UPPER(TRIM(application_number)) = ${appNumber.toUpperCase().trim()}
  `;

  if (rows.length === 0) {
    console.log("No app found by number");
    await sql.end();
    return;
  }

  const app = rows[0];
  const isMatch = (
    matchPhone(app.parent_phone, inputPhone) ||
    matchPhone(app.candidate_phone, inputPhone) ||
    matchPhone(app.parent_whatsapp, inputPhone) ||
    matchPhone(app.candidate_whatsapp, inputPhone)
  );

  console.log(`Matching result for ${appNumber} with input "${inputPhone}":`, isMatch ? "✅ MATCHED!" : "❌ NO MATCH");
  await sql.end();
}

testMatch().catch(console.error);
