import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const { db } = await import("./src/infrastructure/database");
    const { sql } = await import("drizzle-orm");
    const { schoolBranches } = await import("./src/infrastructure/database/schema/settings");
    const { schoolSections, schoolClasses, schoolSessions, academicPeriods, schoolSubjects, classSubjects, sectionSubjects } = await import("./src/infrastructure/database/schema/academics");
    const { students } = await import("./src/infrastructure/database/schema/students");
    const { users } = await import("./src/infrastructure/database/schema/auth");

    console.log("Cleaning old test data...");
    await db.execute(sql`DELETE FROM student_results`);
    await db.execute(sql`DELETE FROM students`);
    await db.execute(sql`DELETE FROM class_subjects`);
    await db.execute(sql`DELETE FROM section_subjects`);
    await db.execute(sql`DELETE FROM school_classes`);
    await db.execute(sql`DELETE FROM school_subjects`);
    await db.execute(sql`DELETE FROM academic_periods`);
    await db.execute(sql`DELETE FROM school_sessions`);
    await db.execute(sql`DELETE FROM school_sections`);
    await db.execute(sql`DELETE FROM school_branches`);

    console.log("Updating superadmin's school_id to 2...");
    await db.execute(sql`UPDATE users SET school_id = 2 WHERE utilisateur = 'superadmin@gmail.com'`);

    console.log("Seeding new test data...");
    // 1. Insert a branch with default instType = "School"
    const [branch] = await db.insert(schoolBranches).values({
      schoolId: 2,
      branchName: "Branche Principal",
      instType: "School"
    }).returning();
    console.log("Created Branch:", branch);

    // 2. Insert active session
    const [session] = await db.insert(schoolSessions).values({
      schoolId: 2,
      sessionName: "2025 - 2026",
      status: "Actif",
      isActive: true
    }).returning();
    console.log("Created Session:", session);

    // 3. Insert academic period
    const [period] = await db.insert(academicPeriods).values({
      schoolId: 2,
      name: "1er Trimestre",
      periodType: "Trimestre",
      sessionId: session.id,
      isActive: true
    }).returning();
    console.log("Created Period:", period);

    // 4. Insert section under Lycée
    const [section] = await db.insert(schoolSections).values({
      schoolId: 2,
      sectionName: "Série Scientifique S",
      educationalLevel: "Lycée",
      termLabels: "1er Trimestre, 2ème Trimestre, 3ème Trimestre"
    }).returning();
    console.log("Created Section:", section);

    // 5. Insert subjects
    const [subject] = await db.insert(schoolSubjects).values({
      schoolId: 2,
      subjectName: "Mathématiques",
      subjectCode: "MATH"
    }).returning();
    console.log("Created Subject:", subject);

    // Link subject to section
    await db.insert(sectionSubjects).values({
      sectionId: section.id,
      subjectId: subject.id,
      defaultCoef: 4
    });

    // 6. Insert class 1: linked to section
    const [class1] = await db.insert(schoolClasses).values({
      schoolId: 2,
      className: "Seconde S1",
      sectionId: section.id
    }).returning();
    console.log("Created Class 1 (linked to section):", class1);

    // 7. Insert class 2: NOT linked to section
    const [class2] = await db.insert(schoolClasses).values({
      schoolId: 2,
      className: "Seconde S2",
      sectionId: null
    }).returning();
    console.log("Created Class 2 (no section):", class2);

    // 8. Insert students
    await db.insert(students).values([
      {
        schoolId: 2,
        nomEtudiant: "Jean Dupont",
        numAdmission: "ADM001",
        classe: "Seconde S1",
        educationalLevel: "Lycée"
      },
      {
        schoolId: 2,
        nomEtudiant: "Marie Curie",
        numAdmission: "ADM002",
        classe: "Seconde S2",
        educationalLevel: "Lycée"
      }
    ]);
    console.log("Created Students.");

  } catch (error) {
    console.error("Error inspecting/seeding:", error);
  } finally {
    process.exit(0);
  }
}

main();
