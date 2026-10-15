const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('Connecting to OLD database to list tables and schema...');
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  const newSql = postgres(NEW_URL, { ssl: 'require' });

  try {
    const oldTables = await oldSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`Found ${oldTables.length} tables in old DB:`, oldTables.map(t => t.table_name).join(', '));

    const newTables = await newSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`Found ${newTables.length} tables in new DB.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
    process.exit(0);
  }
}

main();
