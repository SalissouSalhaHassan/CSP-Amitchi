const postgres = require('postgres');
const DB_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function checkPermissionsTable() {
  const sql = postgres(DB_URL, { ssl: 'require', prepare: false });
  try {
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'role_permissions';
    `;
    console.log('Columns of role_permissions:', tableInfo);

    const count = await sql`SELECT COUNT(*) FROM public.role_permissions`;
    console.log('role_permissions count:', count);
  } finally {
    await sql.end();
  }
}

checkPermissionsTable();
