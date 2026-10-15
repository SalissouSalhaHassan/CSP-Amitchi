const postgres = require('postgres');

async function checkDetails() {
  const urlNew = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
  const sql = postgres(urlNew, { ssl: 'require', connect_timeout: 10 });
  try {
    const student = await sql`SELECT * FROM students`;
    console.log('Student in DB_NEW:', student);

    const classes = await sql`SELECT * FROM school_classes`;
    console.log('School classes in DB_NEW:', classes);

    const schools = await sql`SELECT * FROM schools`;
    console.log('Schools in DB_NEW:', schools);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await sql.end();
  }
}

checkDetails();
