const postgres = require('postgres');
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(NEW_URL, { ssl: 'require' });

async function check() {
  const rls = await sql.unsafe(`
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('roles', 'users', 'schools', 'role_permissions');
  `);
  console.log('RLS Status:', rls);

  const policies = await sql.unsafe(`
    SELECT schemaname, tablename, policyname, roles, cmd, qual 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('roles', 'users', 'schools', 'role_permissions');
  `);
  console.log('Policies count:', policies.length, policies);

  await sql.end();
}
check().catch(console.error);
