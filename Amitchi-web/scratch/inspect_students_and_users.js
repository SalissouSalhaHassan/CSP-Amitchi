const postgres = require('postgres');

async function check() {
  const dbs = [
    { name: 'DB_NEW (ntlncvstzmfqbqystpwi)', url: 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres' },
    { name: 'DB_OLD (gkarotahjtyvmhjqejts)', url: 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres' }
  ];

  for (const item of dbs) {
    console.log('\n=============================================');
    console.log('Testing: ' + item.name);
    console.log('=============================================');
    const sql = postgres(item.url, { ssl: 'require', connect_timeout: 10 });
    try {
      const users = await sql`SELECT id, utilisateur, admin, super_admin, school_id, educational_level FROM users WHERE utilisateur ILIKE '%sani1%'`;
      console.log('Users matching sani1:', users);

      const studentCount = await sql`SELECT count(*) FROM students`;
      console.log('Total students in DB:', studentCount[0].count);

      const schools = await sql`SELECT id, nom_ecole FROM school_info`;
      console.log('Schools:', schools);

      const studentsSample = await sql`SELECT id, school_id, nom_etudiant, classe, educational_level FROM students LIMIT 10`;
      console.log('Students sample:', studentsSample);
    } catch (e) {
      console.log('Error on ' + item.name + ':', e.message);
    } finally {
      await sql.end();
    }
  }
}

check();
