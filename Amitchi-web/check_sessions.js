const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function check() {
  try {
    const sessions = await sql`SELECT id, session_name, is_active, status, school_id FROM school_sessions`;
    console.log('School sessions:');
    console.table(sessions);

    const user = await sql`SELECT id, utilisateur, school_id, educational_level FROM users WHERE utilisateur ILIKE '%sani1%'`;
    console.log('User:');
    console.table(user);

    const students = await sql`SELECT id, nom_etudiant, school_id, session, classe FROM students`;
    console.log('Students:');
    console.table(students);
  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
check();
