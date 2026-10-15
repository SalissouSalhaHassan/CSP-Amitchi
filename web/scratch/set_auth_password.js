const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const hash = bcrypt.hashSync('salissou1994S', 10);

async function setPassword() {
  const sql = postgres(NEW_URL, { ssl: 'require' });
  try {
    const res = await sql`
      UPDATE auth.users 
      SET encrypted_password = ${hash}
      WHERE email = 'superadmin@gmail.com'
      RETURNING id, email;
    `;
    console.log('Updated superadmin auth password in NEW Supabase:', res);
  } finally {
    await sql.end();
  }
}

setPassword();
