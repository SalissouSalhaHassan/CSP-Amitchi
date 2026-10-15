const postgres = require('postgres');

async function testSelect() {
  const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  try {
    const s = await sql`SELECT id, name, slug, status FROM public.schools`;
    console.log('Schools:', s);
    const r = await sql`SELECT id, role_name FROM public.roles`;
    console.log('Roles:', r);
  } finally {
    await sql.end();
  }
}

testSelect();
