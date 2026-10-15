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
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableNames = tables.map(t => t.table_name);
    console.log("Has online_transactions:", tableNames.includes('online_transactions'));
    console.log("Has syscohada_accounts:", tableNames.includes('syscohada_accounts'));
    console.log("Has syscohada_entries:", tableNames.includes('syscohada_entries'));
    console.log("Has fee_payments:", tableNames.includes('fee_payments'));
    console.log("Has student_fees:", tableNames.includes('student_fees'));

    if (tableNames.includes('online_transactions')) {
      const txns = await sql`SELECT * FROM online_transactions LIMIT 5`;
      console.log("Sample online_transactions:", txns);
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
