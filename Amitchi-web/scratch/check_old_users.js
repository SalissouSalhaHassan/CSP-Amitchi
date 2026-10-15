const postgres = require('postgres');

async function checkOld() {
  const oldSql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  try {
    const users = await oldSql`SELECT id, utilisateur, mot_de_passe, admin, super_admin, school_id FROM public.users`;
    console.log('Old DB users:', users.map(u => ({ id: u.id, user: u.utilisateur, pwd: u.mot_de_passe, admin: u.admin, super: u.super_admin })));
  } finally {
    await oldSql.end();
  }
}

checkOld();
