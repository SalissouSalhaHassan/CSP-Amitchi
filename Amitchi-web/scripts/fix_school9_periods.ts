import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
console.log("🔌 Connecting to Supabase Remote Database Pooler...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function fixPeriodsForAllSchoolsInDb() {
  try {
    console.log("🚀 Starting Period & Session Fix for ALL Schools in DB...");

    // Get all schools from DB
    const schools = await client`SELECT id, name, slug FROM schools ORDER BY id`;
    console.log("Found schools:", schools.map(s => `${s.id}: ${s.name} (${s.slug})`));

    const periodsToEnsure = [
      { name: "1er Semestre", type: "Semestre" },
      { name: "2ème Semestre", type: "Semestre" },
      { name: "1er Trimestre", type: "Trimestre" },
      { name: "2ème Trimestre", type: "Trimestre" },
      { name: "3ème Trimestre", type: "Trimestre" },
      { name: "1ère Séquence", type: "Séquence" },
      { name: "2ème Séquence", type: "Séquence" },
      { name: "3ème Séquence", type: "Séquence" },
      { name: "4ème Séquence", type: "Séquence" },
      { name: "5ème Séquence", type: "Séquence" },
      { name: "6ème Séquence", type: "Séquence" },
    ];

    for (const school of schools) {
      // 1. Get or create sessions for this school
      let sessions = await client`SELECT * FROM school_sessions WHERE school_id = ${school.id}`;
      
      if (sessions.length === 0) {
        const createdSession = await client`
          INSERT INTO school_sessions (school_id, session_name, is_active, status)
          VALUES (${school.id}, '2025-2026', true, 'Actif')
          RETURNING *;
        `;
        sessions = createdSession;
        console.log(`✨ School ${school.id} (${school.name}): Created initial session 2025-2026`);
      }

      // Ensure at least one active session
      const activeSession = sessions.find((s: any) => s.is_active) || sessions[0];
      await client`UPDATE school_sessions SET is_active = true WHERE id = ${activeSession.id}`;

      // 2. Ensure periods exist for all sessions of this school
      for (const sess of sessions) {
        for (const p of periodsToEnsure) {
          const existing = await client`
            SELECT * FROM academic_periods 
            WHERE school_id = ${school.id} AND session_id = ${sess.id} AND name = ${p.name}
          `;
          if (existing.length === 0) {
            const inserted = await client`
              INSERT INTO academic_periods (school_id, name, period_type, session_id, is_active)
              VALUES (${school.id}, ${p.name}, ${p.type}, ${sess.id}, true)
              RETURNING *;
            `;
            console.log(`✅ School ${school.id} (${school.name}) - Session ${sess.session_name}: Created "${p.name}"`);
          } else {
            console.log(`ℹ️ School ${school.id} (${school.name}) - Session ${sess.session_name}: "${p.name}" already exists`);
          }
        }
      }
    }

    console.log("🎉 SUCCESSFULLY populated academic periods for ALL 7 SCHOOLS in DB!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing periods:", error);
    process.exit(1);
  }
}

fixPeriodsForAllSchoolsInDb();
