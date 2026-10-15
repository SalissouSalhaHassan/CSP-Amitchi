export const dynamic = "force-dynamic";

import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId, getActiveBranchData } from "@/domains/auth/services/school";
import { 
  getActiveEducationalLevel, 
  hasAllEducationalLevels, 
  isStudentInEducationalLevel 
} from "@/domains/auth/services/rbac";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions, schoolClasses } from "@/infrastructure/database/schema/academics";
import { 
  studentFees, 
  feePayments, 
  cogesPayments,
  scholarships,
  studentScholarships,
  studentPaymentSchedules
} from "@/infrastructure/database/schema/finance";
import { eq, and, or, isNull, desc, inArray, sql, ilike } from "drizzle-orm";
import FinanceClient from "./finance-client";
import StudentFinanceView from "@/domains/finance/components/StudentFinanceView";
import { ensureStudentFeeRecord } from "@/domains/finance/actions/finance.actions";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; class?: string; status?: string }>;
}) {
  try {
    const params = await searchParams;
    const user = await getCurrentUser();
    const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

    const rawRoleName =
      typeof (user as any)?.role === "string"
        ? (user as any).role
        : (user as any)?.role?.roleName || "";
    const roleName = String(rawRoleName).toLowerCase();
    const isStudent =
      roleName.includes("élève") ||
      roleName.includes("eleve") ||
      roleName.includes("étudiant") ||
      roleName.includes("etudiant") ||
      roleName.includes("student") ||
      Boolean(user?.studentId);

    // 1. IF STUDENT: Render personalized student financial dashboard
    if (isStudent && user?.schoolId) {
      let linkedStudent = null;

      if (user.studentId) {
        linkedStudent = await readDb.query.students.findFirst({
          where: eq(students.id, user.studentId),
        }).catch(() => null);
      }

      if (!linkedStudent) {
        const cleanUser = user.utilisateur?.trim() || "";
        const cleanName = user.nomPrenom?.trim() || "";
        linkedStudent = await readDb.query.students.findFirst({
          where: and(
            eq(students.schoolId, user.schoolId),
            or(
              eq(students.numAdmission, cleanUser),
              eq(students.numAdmission, cleanUser.toUpperCase()),
              eq(students.nomEtudiant, cleanName)
            )
          ),
        }).catch(() => null);
      }

      if (linkedStudent) {
        const [studentFee, coges, headerConfigRes] = await Promise.all([
          readDb.query.studentFees.findFirst({
            where: and(
              eq(studentFees.schoolId, user.schoolId),
              eq(studentFees.studentId, linkedStudent.id)
            ),
          }).catch(() => null),
          readDb.query.cogesPayments
            .findMany({
              where: and(
                eq(cogesPayments.schoolId, user.schoolId),
                eq(cogesPayments.studentId, linkedStudent.id)
              ),
              orderBy: (c, { desc }) => [desc(c.datePaid)],
            })
            .catch(() => []),
          getDocumentHeaderConfig().catch(() => ({ data: null })),
        ]);

        let payments: any[] = [];
        if (studentFee?.id) {
          payments = await readDb.query.feePayments
            .findMany({
              where: and(
                eq(feePayments.schoolId, user.schoolId),
                eq(feePayments.feeId, studentFee.id)
              ),
              orderBy: (p, { desc }) => [desc(p.datePaid)],
            })
            .catch(() => []);
        }

        return (
          <StudentFinanceView
            student={linkedStudent}
            fee={studentFee}
            payments={payments}
            cogesPayments={coges}
            headerConfig={(headerConfigRes as any)?.data ?? null}
            user={user}
          />
        );
      }
    }

    // 2. IF ADMIN / STAFF: General School Financial Management
    // 0. Resolve active branch and educational level scope
    const [{ branchData }, activeEduLevel] = await Promise.all([
      getActiveBranchData(user).catch(() => ({ branchData: null, allBranches: [] })),
      getActiveEducationalLevel(user).catch(() => null),
    ]);

    const activeLevel = activeEduLevel ||
      (branchData?.instType && !hasAllEducationalLevels(branchData.instType) ? branchData.instType : null) ||
      (user?.educationalLevel && !hasAllEducationalLevels(user.educationalLevel) ? user.educationalLevel : null);

    const isLevelScoped = Boolean(activeLevel && !hasAllEducationalLevels(activeLevel));

    // Fast single-query session lookup prioritizing active session
    let sessionRow = await readDb.query.schoolSessions.findFirst({
      where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
      orderBy: (s, { desc }) => [
        sql`CASE WHEN ${s.isActive} = TRUE THEN 0 WHEN LOWER(TRIM(${s.status})) = 'actif' THEN 1 ELSE 2 END`,
        desc(s.id),
      ],
    }).catch(() => null);

    // Fast indexed studentFees query
    let feeRows = await readDb.select().from(studentFees)
      .where(
        and(
          sessionRow?.id ? eq(studentFees.sessionId, sessionRow.id) : undefined,
          or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId))
        )
      )
      .catch(() => []);

    if (!feeRows || feeRows.length === 0) {
      feeRows = await readDb.select().from(studentFees)
        .where(or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId)))
        .catch(() => []);
    }

    // Auto-heal check: ensure any active student missing from studentFees, or with totalExpected = 0, is repaired
    if (sessionRow?.id) {
      try {
        const activeStudents = await readDb.select({ id: students.id }).from(students)
          .where(
            and(
              or(eq(students.schoolId, schoolId), isNull(students.schoolId)),
              or(
                eq(students.statut, "Actif"),
                isNull(students.statut),
                ilike(students.statut, "actif%"),
                eq(students.statut, "Inscrit")
              )
            )
          )
          .catch(() => []);

        const existingFeeStudentIds = new Set((feeRows || []).map(f => f.studentId).filter(Boolean));
        const missingStudentIds = activeStudents.map(s => s.id).filter(id => !existingFeeStudentIds.has(id));
        const zeroExpectedStudentIds = (feeRows || []).filter(f => !f.totalExpected || Number(f.totalExpected) === 0).map(f => f.studentId).filter(Boolean) as number[];

        const idsToHeal = Array.from(new Set([...missingStudentIds, ...zeroExpectedStudentIds]));
        if (idsToHeal.length > 0) {
          console.log(`[FinancePage] Found ${idsToHeal.length} student(s) to heal (capping initial batch to 10)...`);
          // Heal at most 10 synchronously so serverless requests do not timeout or exhaust connections
          const syncBatch = idsToHeal.slice(0, 10);
          await Promise.all(syncBatch.map((id) => ensureStudentFeeRecord(id, schoolId).catch(() => null)));

          // Refresh feeRows so the current render displays the healed data
          feeRows = await readDb.select().from(studentFees)
            .where(
              and(
                eq(studentFees.sessionId, sessionRow.id),
                or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId))
              )
            )
            .catch(() => []);
        }
      } catch (healErr) {
        console.warn("[FinancePage] Auto-heal check warning:", healErr);
      }
    }

    // Fetch associated students and payments in parallel using our new composite indexes
    const studentIds = (feeRows || []).map(f => f.studentId).filter(Boolean) as number[];
    const feeIds = (feeRows || []).map(f => f.id).filter(Boolean) as number[];

    const [studentRows, paymentRows, classRows, headerConfigRes, scholarshipRows, scheduleRows] = await Promise.all([
      studentIds.length > 0
        ? readDb.select({
            id: students.id,
            nomEtudiant: students.nomEtudiant,
            numAdmission: students.numAdmission,
            classe: students.classe,
            educationalLevel: students.educationalLevel,
            photoPath: students.photoPath,
            sexe: students.sexe,
            statut: students.statut,
          })
          .from(students)
          .where(inArray(students.id, studentIds))
          .catch(() => [])
        : Promise.resolve([]),

      feeIds.length > 0
        ? readDb.select({
            id: feePayments.id,
            feeId: feePayments.feeId,
            amount: feePayments.amount,
            reduction: feePayments.reduction,
            paymentMode: feePayments.paymentMode,
            reference: feePayments.reference,
            datePaid: feePayments.datePaid,
            recordedBy: feePayments.recordedBy,
            monthConcerned: feePayments.monthConcerned,
          })
          .from(feePayments)
          .where(inArray(feePayments.feeId, feeIds))
          .catch(() => [])
        : Promise.resolve([]),

      readDb.select()
        .from(schoolClasses)
        .where(or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)))
        .catch(() => []),

      getDocumentHeaderConfig().catch(() => ({ data: null })),

      studentIds.length > 0
        ? (readDb || db)
            .select({
              id: studentScholarships.id,
              studentId: studentScholarships.studentId,
              scholarshipId: studentScholarships.scholarshipId,
              academicYear: studentScholarships.academicYear,
              customDiscountPercentage: studentScholarships.customDiscountPercentage,
              allocatedAmount: studentScholarships.allocatedAmount,
              decisionReference: studentScholarships.decisionReference,
              status: studentScholarships.status,
              notes: studentScholarships.notes,
              scholarshipName: scholarships.name,
              scholarshipProvider: scholarships.provider,
              scholarshipType: scholarships.type,
              scholarshipDiscountValue: scholarships.discountValue,
            })
            .from(studentScholarships)
            .leftJoin(scholarships, eq(studentScholarships.scholarshipId, scholarships.id))
            .where(inArray(studentScholarships.studentId, studentIds))
            .catch(() => [])
        : Promise.resolve([]),

      studentIds.length > 0
        ? (readDb || db)
            .select()
            .from(studentPaymentSchedules)
            .where(inArray(studentPaymentSchedules.studentId, studentIds))
            .orderBy(studentPaymentSchedules.dueDate)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const studentMap = new Map((studentRows || []).map(s => [s.id, s]));
    const paymentsMap = new Map<number, any[]>();
    for (const p of (paymentRows || [])) {
      if (!p.feeId) continue;
      if (!paymentsMap.has(p.feeId)) paymentsMap.set(p.feeId, []);
      paymentsMap.get(p.feeId)!.push(p);
    }

    const scholarshipMap = new Map((scholarshipRows || []).map(s => [s.studentId, s]));
    const schedulesMap = new Map<number, any[]>();
    for (const sc of (scheduleRows || [])) {
      if (!sc.studentId) continue;
      if (!schedulesMap.has(sc.studentId)) schedulesMap.set(sc.studentId, []);
      schedulesMap.get(sc.studentId)!.push(sc);
    }

    // Assemble and deduplicate fee objects
    const seenStudents = new Map<number, any>();
    for (const f of (feeRows || [])) {
      if (!f.studentId) continue;
      const existing = seenStudents.get(f.studentId);
      if (!existing || (f.totalPaid || 0) > (existing.totalPaid || 0)) {
        seenStudents.set(f.studentId, {
          ...f,
          student: studentMap.get(f.studentId) || null,
          payments: paymentsMap.get(f.id) || [],
          scholarship: scholarshipMap.get(f.studentId) || null,
          schedules: schedulesMap.get(f.studentId) || [],
        });
      }
    }

    let fees = Array.from(seenStudents.values());
    let classes = (classRows || []) as any[];

    if (isLevelScoped && activeLevel) {
      fees = fees.filter(f => isStudentInEducationalLevel(f.student, activeLevel));
      classes = classes.filter(c => {
        return isStudentInEducationalLevel(
          {
            educationalLevel: c.educationalLevel || c.section?.educationalLevel,
            classe: c.className,
          },
          activeLevel
        );
      });
    }

    const headerConfig = (headerConfigRes as any)?.data || null;

    // KPI Calculations
    const totalExpected = fees.reduce((s, f) => s + (f.totalExpected || 0), 0);
    const totalPaid = fees.reduce((s, f) => s + (f.totalPaid || 0), 0);
    const totalDebts = fees.reduce((s, f) => s + Math.max(0, f.balance || 0), 0);
    const totalReductions = fees.reduce((s, f) => s + (f.totalReduction || 0), 0);
    const countPaid = fees.filter((f) => f.status === "Soldé" || f.status === "Payé").length;
    const countPartial = fees.filter((f) => f.status === "Partiel").length;
    const countUnpaid = fees.filter((f) => f.status === "Impayé" || f.status === "En retard").length;
    const totalStudents = fees.length;
    const recoveryRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    const allowedFeeIdSet = new Set(fees.map(f => f.id));
    const allPayments = (paymentRows || []).filter(p => !isLevelScoped || allowedFeeIdSet.has(p.feeId)) as any[];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    let revenueYear = 0;

    for (const p of allPayments) {
      const amt = Number(p.amount || 0);
      const time = p.datePaid ? new Date(p.datePaid).getTime() : 0;
      if (time >= todayStart) revenueToday += amt;
      if (time >= weekStart) revenueWeek += amt;
      if (time >= monthStart) revenueMonth += amt;
      if (time >= yearStart) revenueYear += amt;
    }
    if (revenueYear === 0) revenueYear = totalPaid;

    const totalPaymentsCount = allPayments.length;

    // Monthly data
    const schoolMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
    const monthNames = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
    const targetYear = now.getFullYear();
    const monthlyData = schoolMonths.map((m, i) => {
      const monthPayments = allPayments.filter(p => {
        if (!p.datePaid) return false;
        const d = new Date(p.datePaid);
        return d.getMonth() === m && d.getFullYear() === targetYear;
      });
      return {
        month: monthNames[i],
        amount: monthPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        count: monthPayments.length,
      };
    });

    const classMap = new Map<string, { expected: number; paid: number; unpaid: number; count: number }>();
    for (const f of fees) {
      const cname = f.student?.classe || "Non assigné";
      if (!classMap.has(cname)) classMap.set(cname, { expected: 0, paid: 0, unpaid: 0, count: 0 });
      const entry = classMap.get(cname)!;
      entry.expected += f.totalExpected || 0;
      entry.paid += f.totalPaid || 0;
      entry.unpaid += Math.max(0, f.balance || 0);
      entry.count += 1;
    }
    const classSummary = Array.from(classMap.entries())
      .map(([className, d]) => ({
        className,
        ...d,
        rate: d.expected > 0 ? Math.round((d.paid / d.expected) * 100) : 0,
      }))
      .sort((a, b) => b.expected - a.expected);

    const unpaidAlerts = fees
      .filter((f) => (f.balance || 0) > 0)
      .map((f) => ({
        id: f.id,
        studentName: f.student?.nomEtudiant || "Inconnu",
        classe: f.student?.classe || "-",
        photoPath: f.student?.photoPath || null,
        balance: f.balance || 0,
        totalExpected: f.totalExpected || 0,
        totalPaid: f.totalPaid || 0,
        status: f.status || "Impayé",
        lastPayment: f.payments?.[0]?.datePaid || null,
      }))
      .sort((a, b) => b.balance - a.balance);

    const advancedStats = {
      totalExpected,
      totalPaid,
      totalDebts,
      totalReductions,
      currentBalance: totalPaid,
      recoveryRate,
      totalPaymentsCount,
      countPaid,
      countPartial,
      countUnpaid,
      totalStudents,
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueYear,
      monthlyData,
      classSummary,
      unpaidAlerts,
    };

    const activeSessionName = sessionRow?.sessionName || (headerConfig as any)?.schoolYear || "2025–2026";
    const schoolName = (user as any)?.school?.name || (headerConfig as any)?.schoolName || "GROUP AIIU-NIGER";

    const stats = {
      totalExpected,
      totalCollected: totalPaid,
      totalDebts,
    };

    return (
      <FinanceClient
        fees={fees}
        stats={stats}
        classes={classes}
        advancedStats={advancedStats}
        headerConfig={headerConfig}
        activeSessionName={activeSessionName}
        schoolName={schoolName}
        currentUser={user}
        currentSchoolId={schoolId}
      />
    );
  } catch (error) {
    console.error("[FinancePage Error]:", error);
    return (
      <FinanceClient
        fees={[]}
        stats={{ totalExpected: 0, totalCollected: 0, totalDebts: 0 }}
        classes={[]}
        advancedStats={null}
        headerConfig={null}
        activeSessionName="2025–2026"
        schoolName="GROUP AIIU-NIGER"
        currentUser={null}
        currentSchoolId={9}
      />
    );
  }
}
