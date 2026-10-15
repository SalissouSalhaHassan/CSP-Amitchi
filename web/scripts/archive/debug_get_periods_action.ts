import { db } from "@/infrastructure/database";
import { academicPeriods, schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq, or, isNull, and } from "drizzle-orm";

async function debugGetPeriodsAction() {
  try {
    console.log("🔍 Diagnosing getPeriods Action Logic...");

    // Test 1: Fetch with schoolId = 9
    const periodsSchool9 = await db
      .select({
        id: academicPeriods.id,
        schoolId: academicPeriods.schoolId,
        name: academicPeriods.name,
        sessionId: academicPeriods.sessionId,
      })
      .from(academicPeriods)
      .where(eq(academicPeriods.schoolId, 9));
    console.log("📊 Test 1 (schoolId = 9): Count =", periodsSchool9.length);

    // Test 2: Fetch with no where conditions (superAdmin style)
    const periodsAll = await db
      .select({
        id: academicPeriods.id,
        schoolId: academicPeriods.schoolId,
        name: academicPeriods.name,
        sessionId: academicPeriods.sessionId,
      })
      .from(academicPeriods);
    console.log("📊 Test 2 (No filter - All): Count =", periodsAll.length);

    // Test 3: Fetch with schoolId = 1 or null
    const periodsSchool1 = await db
      .select({
        id: academicPeriods.id,
        schoolId: academicPeriods.schoolId,
        name: academicPeriods.name,
        sessionId: academicPeriods.sessionId,
      })
      .from(academicPeriods)
      .where(eq(academicPeriods.schoolId, 1));
    console.log("📊 Test 3 (schoolId = 1): Count =", periodsSchool1.length);
  } catch (err) {
    console.error("❌ Diagnostic Exception:", err);
  } finally {
    process.exit(0);
  }
}

debugGetPeriodsAction();
