import { localDb } from "./dexie";
import { cacheReferenceItems, getCachedReferenceItems } from "./references";

// 1. Students Caching
export async function cacheStudents(items: any[], schoolId?: number | null) {
  if (!schoolId) return;

  const unsyncedItems = await localDb.outbox
    .where("targetTable")
    .equals("students")
    .toArray();
  const unsynced = unsyncedItems.filter(item =>
    item.status !== "synced" &&
    item.status !== "cancelled" &&
    Number(item.schoolId || item.payload?.schoolId) === Number(schoolId)
  );
  const unsyncedAdmissions = new Set(unsynced.map(item => item.payload.numAdmission));

  const currentStudents = await localDb.students.where("schoolId").equals(schoolId).toArray();
  const unsyncedStudents = currentStudents.filter(s => s.numAdmission && unsyncedAdmissions.has(s.numAdmission));

  await localDb.students.where("schoolId").equals(schoolId).delete();

  if (unsyncedStudents.length > 0) {
    await localDb.students.bulkPut(unsyncedStudents);
  }

  if (items.length > 0) {
    const toPut = items
      .filter(item => !unsyncedAdmissions.has(item.numAdmission))
      .map((item) => ({
        ...item,
        schoolId,
        updatedAt: Date.now(),
      }));
    if (toPut.length > 0) {
      await localDb.students.bulkPut(toPut);
    }
  }
}

export async function getCachedStudents(schoolId?: number | null) {
  if (schoolId) {
    const bySchool = await localDb.students.where("schoolId").equals(schoolId).toArray();
    if (bySchool.length > 0) return bySchool;
    // Fallback: check if students are stored with null or another schoolId (e.g. offline created)
    const all = await localDb.students.toArray();
    const matching = all.filter(s => !s.schoolId || Number(s.schoolId) === Number(schoolId));
    if (matching.length > 0) return matching;
    return all;
  }
  return localDb.students.toArray();
}

// 2. Student Fees Caching
export async function cacheStudentFees(items: any[]) {
  if (!items || items.length === 0) return;
  await cacheReferenceItems("studentFees" as any, items, "id");

  try {
    const allPayments: any[] = [];
    for (const item of items) {
      if (Array.isArray(item.payments) && item.payments.length > 0) {
        for (const p of item.payments) {
          allPayments.push({
            id: p.id ? Number(p.id) : undefined,
            feeId: Number(p.feeId || item.id),
            amount: Number(p.amount || 0),
            reduction: Number(p.reduction || 0),
            paymentMode: p.paymentMode || "Espèces",
            reference: p.reference || `REC-${p.id || Date.now()}`,
            monthConcerned: p.monthConcerned || "Général",
            notes: p.notes || "",
            datePaid: p.datePaid || new Date().toISOString(),
            isProvisoire: Boolean(p.isProvisoire),
            updatedAt: Date.now(),
          });
        }
      }
    }
    if (allPayments.length > 0) {
      await localDb.feePayments.bulkPut(allPayments);
    }
  } catch (e) {
    console.warn("Failed to cache feePayments in localDb:", e);
  }
}

export async function getCachedStudentFees() {
  const fees = await getCachedReferenceItems<any>("studentFees" as any);
  if (!fees || fees.length === 0) return [];

  try {
    // Enrich with local payments from localDb.feePayments and localDb.outbox
    const [storedPayments, outboxItems] = await Promise.all([
      localDb.feePayments.toArray().catch(() => []),
      localDb.outbox.where("targetTable").equals("feePayments").toArray().catch(() => []),
    ]);

    const unsyncedOutbox = outboxItems.filter(
      (item) => item.status !== "synced" && item.status !== "cancelled"
    );

    const paymentsByFeeId = new Map<number, any[]>();

    for (const p of storedPayments) {
      const fId = Number(p.feeId);
      if (!paymentsByFeeId.has(fId)) paymentsByFeeId.set(fId, []);
      paymentsByFeeId.get(fId)!.push(p);
    }

    for (const o of unsyncedOutbox) {
      const fId = Number(o.payload?.feeId);
      if (!fId) continue;
      if (!paymentsByFeeId.has(fId)) paymentsByFeeId.set(fId, []);
      paymentsByFeeId.get(fId)!.push({
        ...o.payload,
        isProvisoire: true,
        recordedBy: "Local Offline",
      });
    }

    return fees.map((fee) => {
      const localPayments = paymentsByFeeId.get(Number(fee.id)) || [];
      const basePayments = Array.isArray(fee.payments) ? fee.payments : [];

      // Deduplicate payments by reference or id
      const seenPaymentKeys = new Set<string>();
      const combinedPayments: any[] = [];

      for (const p of [...localPayments, ...basePayments]) {
        const key = p.reference ? `ref:${p.reference}` : `id:${p.id}`;
        if (!seenPaymentKeys.has(key)) {
          seenPaymentKeys.add(key);
          combinedPayments.push(p);
        }
      }

      const totalPaid = combinedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalReduction = combinedPayments.reduce((sum, p) => sum + (Number(p.reduction) || 0), 0);
      const expected = Number(fee.totalExpected || 0);

      const resolvedPaid = Math.max(totalPaid, Number(fee.totalPaid || 0));
      const resolvedReduction = Math.max(totalReduction, Number(fee.totalReduction || 0));
      const balance = Math.max(0, expected - resolvedPaid - resolvedReduction);
      const status = balance <= 0 && expected > 0 ? "Soldé" : resolvedPaid > 0 ? "Partiel" : "Impayé";

      return {
        ...fee,
        totalPaid: resolvedPaid,
        totalReduction: resolvedReduction,
        balance,
        status,
        payments: combinedPayments,
      };
    });
  } catch (e) {
    console.warn("Error reconciling cached studentFees with local payments:", e);
    return fees;
  }
}

// 3. Exam Results Caching
export async function cacheExamResults(items: any[]) {
  await localDb.examResults.clear();
  if (items.length > 0) {
    const prepared = items.map((item) => ({
      ...item,
      updatedAt: Date.now(),
    }));
    await localDb.examResults.bulkPut(prepared);
  }
}

export async function getCachedExamResults() {
  return localDb.examResults.toArray();
}

// 4. Attendance Caching
export async function cacheAttendance(classId: number, date: string, subjectId: number | undefined, records: any[]) {
  const list = await localDb.attendanceBatches.where("classId").equals(classId).toArray();
  const existing = list.find(item => item.date === date && item.subjectId === (subjectId || 0));
  if (existing?.id) {
    await localDb.attendanceBatches.delete(existing.id);
  }
  await localDb.attendanceBatches.put({
    classId,
    subjectId: subjectId || 0,
    date,
    records,
    updatedAt: Date.now()
  });
}

export async function getCachedAttendance(classId: number, date: string, subjectId: number | undefined) {
  const list = await localDb.attendanceBatches.where("classId").equals(classId).toArray();
  const match = list.find(item => item.date === date && item.subjectId === (subjectId || 0));
  return match ? match.records : [];
}

// 5. Grading Grid & Notes Caching
export async function cacheGradingGrid(
  classId: number,
  subjectId: number,
  sessionId: number,
  term: string,
  data: any
) {
  const key = `grading_grid_${classId}_${subjectId}_${sessionId}_${term}`;
  await cacheReferenceItems("gradingGrid" as any, [{ key, data, updatedAt: Date.now() }], "key");

  // Also cache individual student results rows in localDb.studentResults
  try {
    const rawRows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (rawRows.length > 0) {
      const recordsToPut = rawRows.map((r: any) => ({
        classId,
        subjectId,
        sessionId,
        term,
        studentId: Number(r.studentId || r.student_id),
        classWorkScore: r.classWorkScore ?? r.classWork ?? r.class_work_score ?? null,
        examScore: r.examScore ?? r.examNote ?? r.exam_score ?? null,
        totalScore: r.totalScore ?? r.total ?? r.total_score ?? null,
        coefficient: r.coefficient ?? data?.coefficient ?? 1,
        weightedScore: r.weightedScore ?? r.weighted ?? r.weighted_score ?? null,
        absences: r.absences ?? r.absents ?? 0,
        observation: r.observation ?? null,
        appreciation: r.appreciation ?? null,
        rank: r.rank ?? null,
        updatedAt: Date.now(),
      }));

      // Delete existing for this specific grid
      const existing = await localDb.studentResults
        .where("[classId+subjectId+sessionId+term]")
        .equals([classId, subjectId, sessionId, term])
        .toArray();
      if (existing.length > 0) {
        await localDb.studentResults.bulkDelete(existing.map((e) => e.id!).filter(Boolean));
      }
      await localDb.studentResults.bulkPut(recordsToPut);
    }
  } catch (e) {
    console.warn("Failed to put studentResults in localDb:", e);
  }
}

export async function getCachedGradingGrid(
  classId: number,
  subjectId: number,
  sessionId: number,
  term: string
): Promise<any | null> {
  const key = `grading_grid_${classId}_${subjectId}_${sessionId}_${term}`;
  const cachedList = await getCachedReferenceItems<any>("gradingGrid" as any);
  const match = cachedList.find((c: any) => c.key === key);
  if (match?.data) return match.data;

  // Fallback: reconstruct from localDb.studentResults
  try {
    const rows = await localDb.studentResults
      .where("[classId+subjectId+sessionId+term]")
      .equals([classId, subjectId, sessionId, term])
      .toArray();
    if (rows.length > 0) {
      return {
        success: true,
        data: rows.map((r) => ({
          studentId: r.studentId,
          classWork: r.classWorkScore?.toString() || "",
          examNote: r.examScore?.toString() || "",
          classWorkScore: r.classWorkScore,
          examScore: r.examScore,
          totalScore: r.totalScore,
          total: r.totalScore,
          coefficient: r.coefficient,
          weightedScore: r.weightedScore,
          weighted: r.weightedScore,
          absents: r.absences || 0,
          absences: r.absences || 0,
          observation: r.observation || "",
          appreciation: r.appreciation || "",
          rank: r.rank || "-",
        })),
        isLocal: true,
      };
    }
  } catch (_) {}

  return null;
}

// 6. Devoirs Grid Caching
export async function cacheDevoirGrid(
  classId: number,
  subjectId: number,
  sessionId: number,
  term: string,
  data: any
) {
  const key = `devoir_grid_${classId}_${subjectId}_${sessionId}_${term}`;
  await cacheReferenceItems("gradingGrid" as any, [{ key, data, updatedAt: Date.now() }], "key");

  try {
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (rows.length > 0) {
      const recordsToPut = rows.map((r: any) => ({
        classId,
        subjectId,
        sessionId,
        term,
        studentId: Number(r.studentId || r.student_id),
        devoirs: Array.isArray(r.devoirs) ? r.devoirs : [],
        moyenneDevoirs: r.moyenneDevoirs ?? r.moyenne_devoirs ?? null,
        updatedAt: Date.now(),
      }));

      const existing = await localDb.devoirGrades
        .where("[classId+subjectId+sessionId+term]")
        .equals([classId, subjectId, sessionId, term])
        .toArray();
      if (existing.length > 0) {
        await localDb.devoirGrades.bulkDelete(existing.map((e) => e.id!).filter(Boolean));
      }
      await localDb.devoirGrades.bulkPut(recordsToPut);
    }
  } catch (e) {
    console.warn("Failed to put devoirGrades in localDb:", e);
  }
}

export async function getCachedDevoirGrid(
  classId: number,
  subjectId: number,
  sessionId: number,
  term: string
): Promise<any | null> {
  const key = `devoir_grid_${classId}_${subjectId}_${sessionId}_${term}`;
  const cachedList = await getCachedReferenceItems<any>("gradingGrid" as any);
  const match = cachedList.find((c: any) => c.key === key);
  if (match?.data) return match.data;

  try {
    const rows = await localDb.devoirGrades
      .where("[classId+subjectId+sessionId+term]")
      .equals([classId, subjectId, sessionId, term])
      .toArray();
    if (rows.length > 0) {
      return {
        success: true,
        data: rows.map((r) => ({
          studentId: r.studentId,
          devoirs: r.devoirs,
          moyenneDevoirs: r.moyenneDevoirs,
        })),
        isLocal: true,
      };
    }
  } catch (_) {}

  return null;
}

// 7. Storage Quota & Eviction Policy
export async function enforceStorageQuotaAndEviction(): Promise<{
  usageMb: number;
  quotaMb: number;
  evictedCount: number;
}> {
  let usageMb = 0;
  let quotaMb = 0;
  let evictedCount = 0;

  try {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usageMb = Math.round((estimate.usage || 0) / (1024 * 1024));
      quotaMb = Math.round((estimate.quota || 0) / (1024 * 1024));
    }

    // Evict synced actions older than 14 days
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const syncedActions = await localDb.outbox
      .where("status")
      .equals("synced")
      .toArray();

    const oldActions = syncedActions.filter(
      (a) => (a.syncedAt || a.timestamp) < fourteenDaysAgo
    );

    if (oldActions.length > 0) {
      const idsToDelete = oldActions.map((a) => a.id!).filter(Boolean);
      await localDb.outbox.bulkDelete(idsToDelete);
      evictedCount = idsToDelete.length;
      console.log(`🧹 Evicted ${evictedCount} synced outbox actions older than 14 days.`);
    }
  } catch (err) {
    console.warn("Storage eviction warning:", err);
  }

  return { usageMb, quotaMb, evictedCount };
}

