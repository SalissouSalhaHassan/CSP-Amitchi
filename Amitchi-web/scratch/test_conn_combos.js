const postgres = require('postgres');

async function test(user, host, port = 6543) {
  const url = `postgresql://${user}:salissou1994S@${host}:${port}/postgres`;
  const sql = postgres(url, { ssl: 'require' });
  try {
    const res = await sql`SELECT 1 as connected`;
    console.log('SUCCESS for user:', user, 'host:', host, 'port:', port);
  } catch (e) {
    console.log('FAIL for user:', user, 'host:', host, 'port:', port, '->', e.message);
  } finally {
    await sql.end();
  }
}

async function run() {
  await test('postgres.ntlncvstzmfqbqystpwi', 'aws-0-us-west-1.pooler.supabase.com', 6543);
  await test('postgres', 'aws-0-us-west-1.pooler.supabase.com', 6543);
  await test('postgres', 'db.ntlncvstzmfqbqystpwi.supabase.co', 5432);
}
run();
