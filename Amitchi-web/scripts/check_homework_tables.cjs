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

async function test() {
  try {
    console.log("Checking homework tables...");
    const homeworkCols = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND (table_name LIKE '%homework%' OR table_name LIKE '%submission%' OR table_name LIKE '%lms%')
    `;
    console.log("Tables found:", homeworkCols);

    const hwCount = await sql`SELECT count(*) FROM homework`;
    console.log("Homework count:", hwCount);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

test();
