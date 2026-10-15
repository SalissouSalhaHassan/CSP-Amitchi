const postgres = require("postgres");

const dbUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const sql = postgres(dbUrl, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const schools = await sql`SELECT id, name FROM schools`;
    console.log("Found schools:", schools);
    
    for (const school of schools) {
      // Check if session 2024-2025 already exists for this school
      const existing = await sql`
        SELECT id FROM school_sessions 
        WHERE school_id = ${school.id} AND session_name = '2024-2025'
      `;
      
      if (existing.length === 0) {
        console.log(`Adding session '2024-2025' for school: ${school.name} (id: ${school.id})`);
        await sql`
          INSERT INTO school_sessions (school_id, session_name, status, is_active)
          VALUES (${school.id}, '2024-2025', 'Actif', true)
        `;
      } else {
        console.log(`Session '2024-2025' already exists for school: ${school.name} (id: ${school.id})`);
      }
    }
    
    console.log("✅ Finished adding missing session.");
    process.exit(0);
  } catch (err) {
    console.error("Error executing script:", err);
    process.exit(1);
  }
}

run();
