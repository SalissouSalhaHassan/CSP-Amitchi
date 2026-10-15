const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function listUsers() {
  const users = await sql`SELECT id, utilisateur, admin, super_admin, school_id, educational_level, role_id FROM public.users ORDER BY id ASC`;
  console.log('Total users in new DB:', users.length);
  console.table(users);
  await sql.end();
}

listUsers();
