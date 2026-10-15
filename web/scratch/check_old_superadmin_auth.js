const postgres = require('postgres');

async function checkOldSuperadminAuth() {
  const oldSql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  try {
    const user = await oldSql`SELECT * FROM auth.users WHERE email = 'superadmin@gmail.com'`;
    console.log('Old auth superadmin details:', JSON.stringify(user, null, 2));
  } finally {
    await oldSql.end();
  }
}

checkOldSuperadminAuth();
