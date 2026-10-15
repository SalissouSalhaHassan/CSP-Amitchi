const postgres = require('postgres');

const url = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
console.log('Testing connection to Supabase...');

const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });

sql`SELECT NOW() as current_time, current_database() as db;`
  .then(res => {
    console.log('SUCCESS: Connected to DB!', res);
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR connecting to DB:', err);
    process.exit(1);
  });
