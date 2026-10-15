const postgres = require('postgres');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';

async function testQuery() {
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  try {
    const res = await oldSql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`;
    console.log('Tables outside system schema:', res);

    const schemaRes = await oldSql`SELECT current_schema(), current_user, current_database()`;
    console.log('Current context:', schemaRes);

    const studentRows = await oldSql`SELECT * FROM public.students LIMIT 2`;
    console.log('public.students sample:', studentRows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await oldSql.end();
  }
}

testQuery();
