import { db } from "@/infrastructure/database";
import { academicPeriods } from "@/infrastructure/database/schema/academics";
import { eq, or, isNull } from "drizzle-orm";

async function testDirectPeriodsQuery() {
  try {
    console.log("🔍 Testing getPeriods exact query via Drizzle...");

    // Test 1: Query for schoolId = 9
    const periods9 = await db
      .select()
      .from(academicPeriods)
      .where(or(eq(academicPeriods.schoolId, 9), isNull(academicPeriods.schoolId)));
    console.log("📊 Drizzle result for schoolId = 9:", periods9.length);
    console.log("Periods 9 sample:", periods9.slice(0, 2));

    // Test 2: Query for schoolId = 1
    const periods1 = await db
      .select()
      .from(academicPeriods)
      .where(or(eq(academicPeriods.schoolId, 1), isNull(academicPeriods.schoolId)));
    console.log("📊 Drizzle result for schoolId = 1:", periods1.length);

    // Test 3: Query all without where
    const periodsAll = await db.select().from(academicPeriods);
    console.log("📊 Drizzle result ALL periods:", periodsAll.length);
  } catch (err) {
    console.error("❌ Exception during direct drizzle query:", err);
  } finally {
    process.exit(0);
  }
}

testDirectPeriodsQuery();
