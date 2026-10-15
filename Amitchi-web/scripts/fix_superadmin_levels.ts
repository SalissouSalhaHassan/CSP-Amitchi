import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== FIXING SUPER ADMIN EDUCATIONAL LEVELS ===\n");

    // 1. Show current state
    const before = await sql`
      SELECT id, utilisateur, educational_level, super_admin, admin 
      FROM users 
      WHERE super_admin = true
    `;
    console.log("BEFORE - Super admin users:");
    for (const u of before) {
      console.log(`  [id=${u.id}] ${u.utilisateur} → educational_level="${u.educational_level}"`);
    }

    // 2. Fix: set educational_level = 'Tous' for ALL super admins
    const updated = await sql`
      UPDATE users 
      SET educational_level = 'Tous'
      WHERE super_admin = true AND (educational_level != 'Tous' OR educational_level IS NULL)
      RETURNING id, utilisateur, educational_level
    `;
    console.log(`\n✅ Updated ${updated.length} user(s):`);
    for (const u of updated) {
      console.log(`  [id=${u.id}] ${u.utilisateur} → educational_level="${u.educational_level}"`);
    }

    // 3. Show final state
    const after = await sql`
      SELECT id, utilisateur, educational_level, super_admin, admin 
      FROM users 
      WHERE super_admin = true
    `;
    console.log("\nAFTER - Super admin users:");
    for (const u of after) {
      console.log(`  [id=${u.id}] ${u.utilisateur} → educational_level="${u.educational_level}" ✅`);
    }

    // 4. Count students per school for verification
    console.log("\n=== STUDENT COUNTS PER SCHOOL ===");
    const counts = await sql`
      SELECT school_id, COUNT(*) as total 
      FROM students 
      GROUP BY school_id 
      ORDER BY school_id
    `;
    for (const c of counts) {
      console.log(`  school_id=${c.school_id} → ${c.total} students`);
    }

    console.log("\n✅ Done! Now run: git add . && git commit -m 'fix: super admin sees all students' && git push");

  } catch (err: any) {
    console.error("❌ Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
