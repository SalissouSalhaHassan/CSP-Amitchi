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
    const schoolId = 9;
    console.log("Checking recent online_transactions...");
    const txns = await sql`SELECT * FROM online_transactions WHERE school_id = ${schoolId} ORDER BY id DESC LIMIT 3`;
    console.log("Recent transactions:", txns);

    console.log("Checking recent fee_payments...");
    const payments = await sql`SELECT * FROM fee_payments WHERE school_id = ${schoolId} ORDER BY id DESC LIMIT 3`;
    console.log("Recent fee_payments:", payments);

    console.log("Checking SYSCOHADA accounts...");
    const accounts = await sql`SELECT * FROM syscohada_accounts WHERE school_id = ${schoolId}`;
    console.log("SYSCOHADA accounts:", accounts);

    console.log("Checking recent SYSCOHADA entries...");
    const entries = await sql`SELECT * FROM syscohada_entries WHERE school_id = ${schoolId} ORDER BY id DESC LIMIT 4`;
    console.log("SYSCOHADA entries:", entries);

  } catch (e) {
    console.error("Test error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

test();
