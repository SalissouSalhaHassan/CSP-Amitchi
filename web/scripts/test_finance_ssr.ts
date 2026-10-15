import { db, readDb } from "../src/infrastructure/database";
import { students } from "../src/infrastructure/database/schema/students";
import { schoolSessions, schoolClasses } from "../src/infrastructure/database/schema/academics";
import { studentFees, feePayments, cogesPayments } from "../src/infrastructure/database/schema/finance";
import { eq, and, or, isNull, desc, sql } from "drizzle-orm";
import { getDocumentHeaderConfig } from "../src/domains/settings/actions/settings.actions";

async function testSSR() {
  console.log("🔍 Testing Finance SSR Logic...");
  const schoolId = 9;

  try {
    console.log("1. Finding Session...");
    let sessionRow = await readDb.query.schoolSessions.findFirst({
      where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
      orderBy: [
        sql`CASE WHEN ${schoolSessions.isActive} = TRUE THEN 0 WHEN LOWER(TRIM(${schoolSessions.status})) = 'actif' THEN 1 ELSE 2 END`,
        desc(schoolSessions.id),
      ],
    });
    console.log("✅ Session:", sessionRow?.id, sessionRow?.sessionName);

    console.log("2. Querying Student Fees with Relations...");
    const feeRows = await readDb.query.studentFees.findMany({
      where: and(
        sessionRow?.id ? eq(studentFees.sessionId, sessionRow.id) : undefined,
        or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId))
      ),
      with: {
        student: {
          columns: {
            id: true,
            nomEtudiant: true,
            numAdmission: true,
            classe: true,
            educationalLevel: true,
            photoPath: true,
            sexe: true,
            statut: true,
          }
        },
        payments: {
          columns: {
            id: true,
            feeId: true,
            amount: true,
            reduction: true,
            paymentMode: true,
            reference: true,
            datePaid: true,
            recordedBy: true,
            monthConcerned: true,
          },
          orderBy: [desc(feePayments.datePaid)]
        }
      },
      orderBy: [desc(studentFees.id)]
    });
    console.log("✅ Fee Rows:", feeRows.length);

    console.log("3. Payment Aggregation Query...");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const paymentSumsRes = await readDb
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)`,
        todayAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${todayStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        weekAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${weekStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        monthAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${monthStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        yearAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${yearStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(feePayments)
      .where(or(eq(feePayments.schoolId, schoolId), isNull(feePayments.schoolId)));
    console.log("✅ Payment Sums:", paymentSumsRes);

    console.log("4. School Classes Query...");
    const classRows = await readDb
      .select()
      .from(schoolClasses)
      .where(or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)));
    console.log("✅ Classes:", classRows.length);

    console.log("5. Header Config Query...");
    const headerConfigRes = await getDocumentHeaderConfig();
    console.log("✅ Header Config:", headerConfigRes);

    console.log("🎉 ALL QUERIES SUCCEEDED WITH ZERO ERRORS!");
  } catch (err) {
    console.error("❌ SSR FAILED WITH ERROR:", err);
  }
}

testSSR().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
