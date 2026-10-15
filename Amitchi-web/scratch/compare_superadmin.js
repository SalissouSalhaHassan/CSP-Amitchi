const postgres = require('postgres');

async function testBoth() {
  const newSql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  const oldSql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });

  try {
    const newUser = await newSql`SELECT id, utilisateur, mot_de_passe, admin, super_admin, school_id FROM public.users WHERE id = 4`;
    console.log('NEW DB user 4:', newUser);
  } catch (e) {
    console.error('Error reading new DB:', e);
  } finally {
    await newSql.end();
  }

  try {
    const oldUser = await oldSql`SELECT id, utilisateur, mot_de_passe, admin, super_admin, school_id FROM public.users WHERE id = 4`;
    console.log('OLD DB user 4:', oldUser);
  } catch (e) {
    console.error('Error reading old DB:', e);
  } finally {
    await oldSql.end();
  }
}

testBoth();
