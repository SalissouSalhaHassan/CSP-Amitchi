const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });

async function checkRLS() {
  try {
    const policies = await sql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'roles';
    `;
    console.log('Policies on roles table:', policies);

    const rlsStatus = await sql`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname = 'roles';
    `;
    console.log('RLS status on roles:', rlsStatus);
  } finally {
    await sql.end();
  }
}
checkRLS();
