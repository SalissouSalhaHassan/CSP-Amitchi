const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function run() {
  try {
    const r = await sql`SELECT count(*)::int as count FROM public.students`;
    console.log('Students count in new DB:', r);
  } catch (e) {
    console.error('Error in students:', e.message);
  } finally {
    await sql.end();
  }
}

run();
