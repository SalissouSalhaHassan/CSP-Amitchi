const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const dbUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
const isRemote = true;

const sql = postgres(dbUrl, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  try {
    const students = await sql`
      SELECT nom_etudiant, session, classe 
      FROM students 
      WHERE classe = '6ème A'
      LIMIT 10
    `;
    
    console.log("=== INSPECTING STUDENTS IN 6ème A (REMOTE DB) ===");
    console.log("Total students found:", students.length);
    students.forEach(s => {
      console.log(`Student: ${s.nom_etudiant} | Session in DB: "${s.session}"`);
    });
    
    const sessions = await sql`
      SELECT id, session_name, is_active, status 
      FROM school_sessions
    `;
    console.log("\n=== SESSIONS IN DB ===");
    sessions.forEach(s => {
      console.log(`Session: "${s.session_name}" | Active: ${s.is_active} | Status: ${s.status}`);
    });

    const periods = await sql`
      SELECT id, name, period_type, session_id, is_active 
      FROM academic_periods
    `;
    console.log("\n=== ACADEMIC PERIODS IN DB ===");
    periods.forEach(p => {
      console.log(`Period: "${p.name}" | Type: ${p.period_type} | Session ID: ${p.session_id} | Active: ${p.is_active}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error inspecting:", err);
    process.exit(1);
  }
}

inspect();
