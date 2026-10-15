const postgres = require('postgres');
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(NEW_URL, { ssl: 'require' });

async function check() {
  const superadmin = await sql.unsafe("SELECT id, utilisateur, super_admin, admin, school_id, role_id, mot_de_passe FROM users WHERE utilisateur = 'superadmin@gmail.com'");
  console.log('Superadmin:', superadmin);

  const roles = await sql.unsafe("SELECT id, role_name FROM roles");
  console.log('Roles total:', roles.length);

  const permissions = await sql.unsafe("SELECT count(id) FROM role_permissions");
  console.log('Permissions count:', permissions);

  const usersWithRole = await sql.unsafe("SELECT r.id, r.role_name, count(u.id) as user_count FROM roles r LEFT JOIN users u ON u.role_id = r.id GROUP BY r.id, r.role_name ORDER BY r.id");
  console.log('Users per role:', usersWithRole);

  const allUsers = await sql.unsafe("SELECT id, utilisateur, super_admin, school_id, role_id FROM users");
  console.log('All users in DB:', allUsers);

  await sql.end();
}
check().catch(console.error);
