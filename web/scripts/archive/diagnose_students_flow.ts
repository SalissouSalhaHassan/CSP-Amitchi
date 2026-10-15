import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== FULL DIAGNOSIS: WHY STUDENTS DON'T SHOW ===\n");

    // 1. All users with their EXACT field values
    const allUsers = await sql`
      SELECT u.id, u.utilisateur, u.school_id, u.admin, u.super_admin, 
             u.educational_level, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id
    `;
    console.log("ALL USERS IN DB:");
    for (const u of allUsers) {
      console.log(`  [id=${u.id}] ${u.utilisateur}`);
      console.log(`    school_id=${u.school_id}, admin=${u.admin}, super_admin=${u.super_admin}`);
      console.log(`    educational_level="${u.educational_level}", role_name="${u.role_name}"`);
    }

    console.log("\n");

    // 2. Students count per school_id and educational_level
    const studentCounts = await sql`
      SELECT school_id, educational_level, COUNT(*) as count
      FROM students
      GROUP BY school_id, educational_level
      ORDER BY school_id, educational_level
    `;
    console.log("STUDENTS COUNT BY (school_id, educational_level):");
    for (const row of studentCounts) {
      console.log(`  school_id=${row.school_id}, level="${row.educational_level}", count=${row.count}`);
    }

    console.log("\n");

    // 3. Sample students from each school
    const sampleStudents = await sql`
      SELECT id, school_id, nom_etudiant, educational_level, classe
      FROM students
      LIMIT 20
    `;
    console.log("SAMPLE STUDENTS (first 20):");
    for (const s of sampleStudents) {
      console.log(`  [id=${s.id}] school_id=${s.school_id}, "${s.nom_etudiant}", level="${s.educational_level}", class="${s.classe}"`);
    }

    console.log("\n");

    // 4. Simulate server getStudents() for superadmin@gmail.com (school_id=1, super_admin=true)
    console.log("SIMULATING getStudents() for superadmin@gmail.com (school_id=1, super_admin=true):");
    const superAdminStudents = await sql`
      SELECT COUNT(*) as total FROM students WHERE school_id = 1
    `;
    console.log(`  Total students for school_id=1: ${superAdminStudents[0].total}`);

    // 5. Simulate for col@gmail.com (school_id=9, educational_level=Collège)
    console.log("\nSIMULATING getStudents() for col@gmail.com (school_id=9, Collège):");
    const colStudents = await sql`
      SELECT COUNT(*) as total FROM students 
      WHERE school_id = 9 
      AND educational_level IN ('Collège', 'College', 'collège', 'college', 'Moyen', 'moyen', 'Collège Général', 'college general', 'Premier Cycle', 'premier cycle')
    `;
    console.log(`  Count: ${colStudents[0].total}`);

    // 6. Check if getActiveSchoolId() would return correct school_id
    // This uses the school_sessions table
    console.log("\nACTIVE SESSIONS (for getActiveSchoolId):");
    const activeSessions = await sql`
      SELECT id, school_id, session_name, status, is_active 
      FROM school_sessions 
      WHERE is_active = true
    `;
    console.log(`  Active sessions:`, activeSessions);

    // 7. Check role_permissions for Super Admin role
    console.log("\nPERMISSIONS FOR SUPER ADMIN ROLE:");
    const saRole = await sql`
      SELECT r.id, r.role_name FROM roles r WHERE LOWER(r.role_name) LIKE '%super%'
    `;
    console.log("  Super admin roles:", saRole);
    
    if (saRole.length > 0) {
      const perms = await sql`
        SELECT module_name, can_view, can_edit, can_delete
        FROM role_permissions
        WHERE role_id = ${saRole[0].id} AND module_name = 'Students'
      `;
      console.log("  Students permissions for super admin:", perms);
    }

    // 8. Check hasPermission for super admin user
    console.log("\nUSER id=4 (superadmin@gmail.com) FULL DATA:");
    const superUser = await sql`
      SELECT u.*, r.role_name, r.id as role_id_val
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = 4
    `;
    console.log(superUser[0]);

  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
