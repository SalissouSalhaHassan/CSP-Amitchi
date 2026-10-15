const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const OLD_HASH = '$2b$10$uV2e754PBO7v4ymEvCwaFu3RiMuanl8bBSLYWCi6w0UjpDDj0dEiq';

console.log('Test bcrypt match with salissou1994S:', bcrypt.compareSync('salissou1994S', OLD_HASH));

async function update() {
  const sql = postgres(NEW_URL, { ssl: 'require' });
  try {
    const res = await sql`
      UPDATE public.users 
      SET mot_de_passe = ${OLD_HASH}
      WHERE id = 4
      RETURNING id, utilisateur, mot_de_passe, admin, super_admin;
    `;
    console.log('Updated user 4 in NEW DB:', res);
  } catch (e) {
    console.error('Error updating:', e);
  } finally {
    await sql.end();
  }
}

update();
