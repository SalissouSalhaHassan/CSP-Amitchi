const postgres = require('postgres');
const url = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });

async function check() {
  try {
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schools'
      );
    `;
    console.log('Schools table exists:', tableExists);

    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schools' 
      ORDER BY ordinal_position;
    `;
    console.log('Columns:');
    console.table(cols);

    const schoolsData = await sql`SELECT * FROM schools LIMIT 5;`;
    console.log('Schools rows:');
    console.table(schoolsData);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

check();
