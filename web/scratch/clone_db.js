const postgres = require('postgres');
const fs = require('fs');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  console.log('🚀 Starting direct Node.js database clone...');
  const oldSql = postgres(OLD_URL, { ssl: 'require', max: 5 });
  const newSql = postgres(NEW_URL, { ssl: 'require', max: 5 });

  try {
    // 1. Get all tables in dependency order or list them
    const tables = await oldSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    console.log(`Found ${tables.length} tables to replicate.`);

    // 2. We can fetch table DDL using information_schema or query schemas
    // Better yet: we can dump schema from old DB using PostgreSQL queries or Drizzle schema
    console.log('Fetching table definitions...');
  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}
migrate();
