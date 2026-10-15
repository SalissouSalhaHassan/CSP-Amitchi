const postgres = require('postgres');

const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function verify() {
  const sql = postgres(NEW_URL, { ssl: 'require' });
  try {
    const schools = await sql`SELECT count(*)::int as count FROM public.schools`;
    const roles = await sql`SELECT count(*)::int as count FROM public.roles`;
    const permissions = await sql`SELECT count(*)::int as count FROM public.role_permissions`;
    const employees = await sql`SELECT count(*)::int as count FROM public.employees`;
    const users = await sql`SELECT count(*)::int as count FROM public.users`;
    const authUsers = await sql`SELECT count(*)::int as count FROM auth.users`;

    console.log('📊 Verification Summary for NEW Database:');
    console.log(`- Schools:          ${schools[0].count}`);
    console.log(`- Roles:            ${roles[0].count}`);
    console.log(`- Role Permissions: ${permissions[0].count}`);
    console.log(`- Employees:        ${employees[0].count}`);
    console.log(`- Public Users:     ${users[0].count}`);
    console.log(`- Auth Users:       ${authUsers[0].count}`);
  } finally {
    await sql.end();
  }
}

verify();
