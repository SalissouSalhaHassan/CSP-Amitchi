const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function checkUsers() {
  const rows = await sql`
    SELECT id, utilisateur, admin, super_admin, school_id, mot_de_passe 
    FROM public.users
    WHERE utilisateur ILIKE '%superadmin%' OR utilisateur ILIKE '%admin%'
    LIMIT 10
  `;
  console.log('Superadmin/Admin records found:', rows.map(r => ({
    id: r.id,
    utilisateur: r.utilisateur,
    admin: r.admin,
    super_admin: r.super_admin,
    school_id: r.school_id,
    pwd_length: r.mot_de_passe ? r.mot_de_passe.length : 0,
    pwd_preview: r.mot_de_passe ? r.mot_de_passe.substring(0, 15) : null
  })));

  const allUsers = await sql`SELECT id, utilisateur FROM public.users LIMIT 20`;
  console.log('All users in DB:', allUsers);
  await sql.end();
}

checkUsers();
