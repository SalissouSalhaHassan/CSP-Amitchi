const postgres = require('postgres');

async function checkOldAuth() {
  const oldSql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  try {
    const users = await oldSql`SELECT id, email, encrypted_password FROM auth.users`;
    console.log('Old auth users:', users);
  } finally {
    await oldSql.end();
  }
}

checkOldAuth();
