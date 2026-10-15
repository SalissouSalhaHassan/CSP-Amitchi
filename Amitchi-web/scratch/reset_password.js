const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';

async function resetSuperAdminPassword() {
  const newPassword = 'salissou1994S';
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  console.log(`Setting password to '${newPassword}' (hash: ${hashedPassword})...`);

  // Update in NEW DB
  const newSql = postgres(NEW_URL, { ssl: 'require' });
  try {
    const res = await newSql`
      UPDATE public.users 
      SET mot_de_passe = ${hashedPassword}
      WHERE utilisateur ILIKE 'superadmin@gmail.com' OR utilisateur = 'superadmin'
      RETURNING id, utilisateur, admin, super_admin;
    `;
    console.log('✅ Updated in NEW Supabase DB:', res);
  } catch (err) {
    console.error('Error updating in NEW DB:', err);
  } finally {
    await newSql.end();
  }

  // Also update in OLD DB just in case
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  try {
    const resOld = await oldSql`
      UPDATE public.users 
      SET mot_de_passe = ${hashedPassword}
      WHERE utilisateur ILIKE 'superadmin@gmail.com' OR utilisateur = 'superadmin'
      RETURNING id, utilisateur, admin, super_admin;
    `;
    console.log('✅ Updated in OLD Supabase DB:', resOld);
  } catch (err) {
    console.error('Error updating in OLD DB:', err);
  } finally {
    await oldSql.end();
  }
}

resetSuperAdminPassword();
