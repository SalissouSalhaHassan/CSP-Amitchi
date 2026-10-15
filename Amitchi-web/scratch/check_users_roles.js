const postgres = require('postgres');
const DB_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function check() {
  const sql = postgres(DB_URL, { ssl: 'require', prepare: false });
  try {
    const usersWithRoles = await sql`SELECT u.id, u.utilisateur, u.role_id, u.school_id, r.role_name FROM public.users u LEFT JOIN public.roles r ON u.role_id = r.id`;
    console.log('Users with roles:', usersWithRoles);

    const rolesWithUsers = await sql`
      SELECT r.id, r.role_name, COUNT(u.id) as user_count 
      FROM public.roles r 
      LEFT JOIN public.users u ON u.role_id = r.id 
      GROUP BY r.id, r.role_name 
      ORDER BY r.id ASC
    `;
    console.log('Roles with user counts:', rolesWithUsers);
  } finally {
    await sql.end();
  }
}

check();
