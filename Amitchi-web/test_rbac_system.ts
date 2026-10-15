import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function runTests() {
  try {
    const { getUserRoleType, checkEducationalLevelAccess, getCompatibleLevels } = await import("./src/domains/auth/services/rbac");
    const { db } = await import("./src/infrastructure/database");
    const { users, roles } = await import("./src/infrastructure/database/schema/auth");
    const { eq } = await import("drizzle-orm");

    console.log("🧪 Starting RBAC system verification tests...");

    // Test 1: Role Classification
    console.log("\n--- Test 1: Role Classification ---");
    
    const mockSuperAdmin = { superAdmin: true, admin: false };
    const mockGeneralDirector = { superAdmin: false, admin: true, educationalLevel: "Tous" };
    const mockLevelDirector = { superAdmin: false, admin: true, educationalLevel: "Lycée" };
    const mockTeacher = { superAdmin: false, admin: false, role: { roleName: "Professeur" } };
    const mockRegularUser = { superAdmin: false, admin: false, role: { roleName: "Secrétaire" } };

    console.log("Super Admin role classification:", await getUserRoleType(mockSuperAdmin));
    console.log("General Director role classification:", await getUserRoleType(mockGeneralDirector));
    console.log("Level Director role classification:", await getUserRoleType(mockLevelDirector));
    console.log("Teacher role classification:", await getUserRoleType(mockTeacher));
    console.log("Regular User role classification:", await getUserRoleType(mockRegularUser));

    if (await getUserRoleType(mockSuperAdmin) !== "super_admin") throw new Error("Super Admin role classification failed!");
    if (await getUserRoleType(mockGeneralDirector) !== "general_director") throw new Error("General Director role classification failed!");
    if (await getUserRoleType(mockLevelDirector) !== "level_director") throw new Error("Level Director role classification failed!");
    if (await getUserRoleType(mockTeacher) !== "teacher") throw new Error("Teacher role classification failed!");
    console.log("✅ Role Classification tests passed!");

    // Test 2: Level Isolation
    console.log("\n--- Test 2: Level Isolation ---");
    
    // Level director for Lycée should NOT access Primaire
    const hasLyc_Pri = checkEducationalLevelAccess(mockLevelDirector, "Primaire");
    const hasLyc_Lyc = checkEducationalLevelAccess(mockLevelDirector, "Lycée");
    const hasLyc_Sec = checkEducationalLevelAccess(mockLevelDirector, "Secondaire"); // compatible
    
    console.log("Lycée Director -> Primaire:", hasLyc_Pri);
    console.log("Lycée Director -> Lycée:", hasLyc_Lyc);
    console.log("Lycée Director -> Secondaire (Compatible):", hasLyc_Sec);

    if (hasLyc_Pri) throw new Error("Security breach: Lycée director was allowed to access Primaire!");
    if (!hasLyc_Lyc) throw new Error("Access denied: Lycée director denied access to Lycée!");
    if (!hasLyc_Sec) throw new Error("Access denied: Lycée director denied access to Secondaire (compatible)!");

    // General Director should access ALL levels
    const hasGen_Pri = checkEducationalLevelAccess(mockGeneralDirector, "Primaire");
    const hasGen_Lyc = checkEducationalLevelAccess(mockGeneralDirector, "Lycée");
    console.log("General Director -> Primaire:", hasGen_Pri);
    console.log("General Director -> Lycée:", hasGen_Lyc);

    if (!hasGen_Pri || !hasGen_Lyc) throw new Error("Access denied: General Director denied access to Primaire or Lycée!");
    console.log("✅ Level Isolation tests passed!");

    // Test 3: Teacher Class Isolation
    console.log("\n--- Test 3: Teacher Class Isolation ---");
    const { verifyTeacherClassAccess } = await import("./src/domains/auth/services/rbac");
    
    // Let's find a teacher in the database to run live checks
    const allUsers = await db.select().from(users);
    const teacherUser = allUsers.find(u => u.roleId === 2); // Professeur role id is 2
    
    if (teacherUser) {
      console.log(`Found teacher user: @${teacherUser.utilisateur} in DB. Running class-level verification...`);
      // Let's test their access
      // Teachers shouldn't have access to arbitrary class IDs (e.g. classId: 99999)
      const hasAccess = await verifyTeacherClassAccess(teacherUser, 99999);
      console.log(`Teacher @${teacherUser.utilisateur} -> Class 99999:`, hasAccess);
      if (hasAccess) throw new Error("Security breach: Teacher allowed to access arbitrary class ID!");
      console.log("✅ Teacher Class Isolation test passed!");
    } else {
      console.log("⚠️ No teacher user found in DB to run database class-level verification. Skipping teacher DB check.");
    }

    console.log("\n🎉 ALL SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (error: any) {
    console.error("\n❌ Test Suite Failed:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
