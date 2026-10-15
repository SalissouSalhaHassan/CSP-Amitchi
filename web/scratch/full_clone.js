const postgres = require('postgres');
const fs = require('fs');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('--- Database Duplication Tool ---');
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  const newSql = postgres(NEW_URL, { ssl: 'require' });

  try {
    // 1. Get all public tables
    const tables = await oldSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' and table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    console.log(`Discovered ${tables.length} tables in public schema.`);

    // 2. Fetch all column definitions
    const columns = await oldSql`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    console.log(`Fetched ${columns.length} columns.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

main();
