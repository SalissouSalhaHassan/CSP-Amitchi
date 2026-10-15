import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote Database Pooler for Cleanup...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function cleanDuplicateSessionsAndPeriods() {
  try {
    console.log("🚀 Starting Deep Deduplication of School Sessions & Academic Periods...");

    // 1. Fetch all schools
    const schools = await client`SELECT id, name FROM schools ORDER BY id`;

    for (const school of schools) {
      console.log(`\n🏫 Processing School ID ${school.id} (${school.name})...`);

      // Get all sessions for this school
      const sessions = await client`
        SELECT * FROM school_sessions 
        WHERE school_id = ${school.id} 
        ORDER BY id ASC
      `;

      // Group sessions by session_name
      const sessionsByName: Record<string, any[]> = {};
      for (const s of sessions) {
        const name = s.session_name.trim();
        if (!sessionsByName[name]) sessionsByName[name] = [];
        sessionsByName[name].push(s);
      }

      for (const [sessionName, group] of Object.entries(sessionsByName)) {
        if (group.length > 1) {
          console.log(`⚠️ School ${school.id}: Found ${group.length} duplicate sessions for "${sessionName}"`);
          
          // Keep the active one or the first one
          const keeper = group.find(s => s.is_active) || group[0];
          const duplicateIds = group.filter(s => s.id !== keeper.id).map(s => s.id);

          console.log(`  👉 Keeping Session ID ${keeper.id} (${keeper.session_name}). Merging IDs: ${duplicateIds.join(", ")}`);

          // Re-link all academic periods from duplicates to the keeper session
          for (const dupId of duplicateIds) {
            await client`
              UPDATE academic_periods 
              SET session_id = ${keeper.id} 
              WHERE session_id = ${dupId}
            `;
          }

          // Re-link exams if any reference duplicate session
          try {
            for (const dupId of duplicateIds) {
              await client`
                UPDATE exams 
                SET session_id = ${keeper.id} 
                WHERE session_id = ${dupId}
              `;
            }
          } catch (e) {
            // Ignore if exams table doesn't have session_id
          }

          // Delete duplicate sessions
          await client`
            DELETE FROM school_sessions 
            WHERE id = ANY(${duplicateIds})
          `;
          console.log(`  ✅ Deleted duplicate session IDs: ${duplicateIds.join(", ")}`);
        }
      }
    }

    // 2. Ensure each remaining unique session has exact unique periods (deduplicate academic_periods)
    console.log("\n🧹 Deduplicating Academic Periods for each session...");
    const allSessions = await client`SELECT id, school_id, session_name FROM school_sessions ORDER BY id`;

    for (const sess of allSessions) {
      const periods = await client`
        SELECT * FROM academic_periods 
        WHERE session_id = ${sess.id} 
        ORDER BY id ASC
      `;

      const periodsByName: Record<string, any[]> = {};
      for (const p of periods) {
        const name = p.name.trim();
        if (!periodsByName[name]) periodsByName[name] = [];
        periodsByName[name].push(p);
      }

      for (const [pName, pGroup] of Object.entries(periodsByName)) {
        if (pGroup.length > 1) {
          const keeper = pGroup[0];
          const duplicateIds = pGroup.filter(p => p.id !== keeper.id).map(p => p.id);

          // Re-link exam results / grades if referenced
          try {
            for (const dupId of duplicateIds) {
              await client`
                UPDATE exams 
                SET period_id = ${keeper.id} 
                WHERE period_id = ${dupId}
              `;
            }
          } catch (e) {
            // Ignore if exams period_id re-link is not needed
          }

          // Delete duplicate period rows
          await client`
            DELETE FROM academic_periods 
            WHERE id = ANY(${duplicateIds})
          `;
          console.log(`  ✅ Session ID ${sess.id} (${sess.session_name}): Deduplicated period "${pName}" (Deleted IDs: ${duplicateIds.join(", ")})`);
        }
      }
    }

    console.log("\n🎉 CLEANUP & DEDUPLICATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    process.exit(1);
  }
}

cleanDuplicateSessionsAndPeriods();
