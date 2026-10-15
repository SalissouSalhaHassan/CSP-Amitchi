const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function check() {
  const rolesCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles' ORDER BY ordinal_position`;
  console.log('Roles:');
  console.table(rolesCols);

  const permCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'role_permissions' ORDER BY ordinal_position`;
  console.log('Role Permissions:');
  console.table(permCols);

  const usersCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log('Users:');
  console.table(usersCols);

  await sql.end();
}

check();
