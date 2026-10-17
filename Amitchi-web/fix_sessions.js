const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function fixSessions() {
  try {
    console.log('Fixing sessions for school 12 (AMICHI)...');
    
    // Check if session 2026-2027 exists for school 12
    const existing = await sql`SELECT * FROM school_sessions WHERE school_id = 12`;
    console.log('Existing sessions for school 12:', existing);

    // Update session 16 (or insert if needed) to school_id = 12 and is_active = true
    await sql`UPDATE school_sessions SET school_id = 12, is_active = true, status = 'Actif' WHERE id = 16`;
    
    const updated = await sql`SELECT id, session_name, is_active, status, school_id FROM school_sessions WHERE school_id = 12`;
    console.log('Updated sessions for school 12:');
    console.table(updated);
  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
fixSessions();
