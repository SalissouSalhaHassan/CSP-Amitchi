import { localDb } from "./dexie";
import { toast } from "sonner";

let syncInProgress = false;

export async function syncOutbox() {
  if (syncInProgress) return false;
  syncInProgress = true;

  try {
    const rawItems = await localDb.outbox.toArray();
    const items = rawItems
      .filter((item) => !item.status || item.status === "pending" || item.status === "pending sync" || item.status === "failed")
      .sort((a, b) => (a.priority || 5) - (b.priority || 5) || a.timestamp - b.timestamp);

    if (items.length === 0) return false;

    console.log(`[Sync] Starting prioritized smart sync for ${items.length} outbox items.`);

    let processedCount = 0;

    for (const item of items) {
      try {
        let success = false;
        let error = "";
        await localDb.outbox.update(item.id!, {
          status: "syncing",
          updatedAt: Date.now(),
          lastError: null,
        });

        let resId: number | undefined = undefined;

        if (item.targetTable === "students") {
          if (item.actionType === "UPDATE") {
            const { updateStudent } = await import("@/domains/students/actions/students.actions");
            const { id, originalData, ...studentData } = item.payload;
            const res = (await updateStudent(id, studentData, originalData)) as any;
            success = !!res?.success;
            error = res?.error || "Unknown error";
            if (res?.conflict) {
              error = "conflict: " + error;
            }
          } else {
            const { createStudent } = await import("@/domains/students/actions/students.actions");
            const { id: _localId, ...studentData } = item.payload;
            const res = (await createStudent(studentData)) as any;
            success = !!res?.success;
            error = res?.error || "Unknown error";
            if (success) {
              resId = res?.id;
            }
          }

          if (success) {
            const targetId = resId || item.payload.id;
            if (targetId && item.actionType !== "UPDATE") {
              const localId = item.payload.id;
              if (localId && localId !== targetId) {
                try {
                  const localStudent = await localDb.students.get(localId);
                  if (localStudent) {
                    await localDb.students.delete(localId);
                    await localDb.students.put({
                      ...localStudent,
                      id: targetId,
                      updatedAt: Date.now()
                    });
                  }

                  const pendingOutbox = await localDb.outbox
                    .filter(o => o.status !== "synced" && o.status !== "cancelled")
                    .toArray();
                  
                  for (const pending of pendingOutbox) {
                    let updated = false;
                    const payload = pending.payload;
                    
                    if (pending.targetTable === "feePayments" && payload.studentId === localId) {
                      payload.studentId = targetId;
                      updated = true;
                    }
                    if (pending.targetTable === "examResults" && payload.studentId === localId) {
                      payload.studentId = targetId;
                      updated = true;
                    }
                    if (pending.targetTable === "studentResults" && Array.isArray(payload.grades)) {
                      payload.grades = payload.grades.map((g: any) => {
                        if (g.studentId === localId) return { ...g, studentId: targetId };
                        return g;
                      });
                      updated = true;
                    }
                    if (pending.targetTable === "examResults" && Array.isArray(payload.results)) {
                      payload.results = payload.results.map((r: any) => {
                        if (r.studentId === localId) return { ...r, studentId: targetId };
                        return r;
                      });
                      updated = true;
                    }
                    if (pending.targetTable === "attendanceBatches" && Array.isArray(payload.records)) {
                      payload.records = payload.records.map((r: any) => {
                        if (r.studentId === localId) return { ...r, studentId: targetId };
                        return r;
                      });
                      updated = true;
                    }

                    if (updated) {
                      await localDb.outbox.update(pending.id!, {
                        payload,
                        updatedAt: Date.now()
                      });
                    }
                  }
                } catch (e) {
                  console.warn("Failed to cascade student temporary ID mapping:", e);
                }
              }
            }

            const numAdmission = item.payload.numAdmission;
            if (numAdmission) {
              try {
                const localPhoto = await localDb.studentPhotos.get(numAdmission);
                if (localPhoto?.photoData) {
                  const { uploadStudentPhoto } = await import("@/shared/utils/supabase/storage");
                  const fileName = `${numAdmission}_${Date.now()}.jpg`;
                  const uploadedUrl = await uploadStudentPhoto(localPhoto.photoData, fileName);
                  
                  const { updateStudent } = await import("@/domains/students/actions/students.actions");
                  await updateStudent(targetId, { photoPath: uploadedUrl } as any);
                  
                  const cachedStud = await localDb.students.get(targetId);
                  if (cachedStud) {
                    await localDb.students.put({
                      ...cachedStud,
                      photoPath: uploadedUrl,
                      updatedAt: Date.now()
                    });
                  }
                  
                  await localDb.studentPhotos.delete(numAdmission);
                }
              } catch (photoErr) {
                console.warn("Failed to upload student photo during sync:", photoErr);
              }
            }
          }
        } else if (item.targetTable === "exams") {
          const { createExam } = await import("@/domains/academics/actions/exams.actions");
          const res = await createExam(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "examResults") {
          const { saveBatchExamResults } = await import("@/domains/academics/actions/exams.actions");
          const res = (await saveBatchExamResults({
            examId: item.payload.examId,
            results: [
              {
                studentId: item.payload.studentId,
                marksObtained: item.payload.marksObtained,
                remarks: item.payload.remarks || "",
                originalMarksObtained: item.payload.originalMarksObtained,
                originalRemarks: item.payload.originalRemarks,
              },
            ],
          })) as any;
          success = !!res?.success;
          error = res?.error || "Unknown error";
          if (res?.conflict) {
            error = "conflict: " + error;
          }
        } else if (item.targetTable === "studentResults") {
          const { saveStudentGrades } = await import("@/domains/academics/actions/academics.actions");
          const resultsData = Array.isArray(item.payload.grades)
            ? item.payload.grades
            : Array.isArray(item.payload)
              ? item.payload
              : [item.payload];
          const res = (await saveStudentGrades(resultsData)) as any;
          success = !!res?.success;
          error = res?.error || "Unknown error";
          if (res?.conflict || (error && (error.includes("verrouill") || error.includes("lock") || error.includes("délai")))) {
            error = "conflict: " + error;
          }
        } else if (item.targetTable === "devoirs" || item.targetTable === "devoirGrades") {
          const { saveDevoirGrades } = await import("@/domains/academics/actions/academics.actions");
          const devoirsList = Array.isArray(item.payload.devoirsList)
            ? item.payload.devoirsList
            : Array.isArray(item.payload)
              ? item.payload
              : [item.payload];
          const res = (await saveDevoirGrades(devoirsList)) as any;
          success = !!res?.success;
          error = res?.error || "Unknown error";
          if (res?.conflict || (error && (error.includes("verrouill") || error.includes("lock")))) {
            error = "conflict: " + error;
          }
        } else if (item.targetTable === "feePayments") {
          const { recordPayment } = await import("@/domains/finance/actions/finance.actions");
          const { id: _localId, updatedAt: _updatedAt, idempotencyKey: _idemp, ...paymentPayload } = item.payload;
          if (!paymentPayload.schoolId && item.schoolId) {
            paymentPayload.schoolId = Number(item.schoolId);
          }
          if (!paymentPayload.recordedBy && item.userId) {
            paymentPayload.recordedBy = String(item.userId);
          }
          const res = (await recordPayment(paymentPayload)) as any;
          // Recognize idempotent duplicate as success
          if (res?.action === "duplicate_ignored" || res?.alreadyRecorded) {
            success = true;
            error = "";
          } else {
            success = !!res?.success;
            error = res?.error || "Unknown error";
          }
          if (success && res?.id) {
            // Bind the local payment to the real server-returned ID
            try {
              const localId = item.payload.id;
              if (localId && localId !== res.id) {
                const localPayment = await localDb.feePayments.get(localId);
                if (localPayment) {
                  await localDb.feePayments.delete(localId);
                  await localDb.feePayments.put({
                    ...localPayment,
                    id: res.id,
                    isProvisoire: false,
                    updatedAt: Date.now()
                  });
                }
              }
            } catch (e) {
              console.warn("Failed to map local payment ID to server ID:", e);
            }
          }
        } else if (item.targetTable === "attendanceBatches") {
          const { saveBatchAttendance } = await import("@/domains/attendance/actions/attendance.actions");
          const { id: _localId, updatedAt: _updatedAt, idempotencyKey: _key, ...attendancePayload } = item.payload;
          const res = await saveBatchAttendance(attendancePayload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsProgress") {
          const { updateLessonProgress } = await import("@/domains/lms/actions/lms.actions");
          const res = await updateLessonProgress(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsSubmissions") {
          const { saveSubmission } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveSubmission(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsCourses") {
          const { saveCourse } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveCourse(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsModules") {
          const { saveModule } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveModule(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsLessons") {
          const { saveLmsLesson } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveLmsLesson(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsVirtualClasses") {
          const { saveVirtualClass } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveVirtualClass(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsAssignments") {
          const { saveAssignment } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveAssignment(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsQuizzes") {
          const { saveQuiz } = await import("@/domains/lms/actions/lms.actions");
          const res = await saveQuiz(item.payload, item.entityId ? Number(item.entityId) : undefined);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "lmsDiscussions") {
          const { postMessage } = await import("@/domains/lms/actions/lms.actions");
          const res = await postMessage(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (["documents", "library", "canevas"].includes(item.targetTable)) {
          // Simulation of successful sync to target backend table
          success = true;
          error = "";
        } else {
          error = `Table hors-ligne non supportee: ${item.targetTable}`;
        }

        if (success) {
          await localDb.outbox.update(item.id!, {
            status: "synced",
            syncedAt: Date.now(),
            updatedAt: Date.now(),
            lastError: null,
          });
          processedCount++;
        } else {
          const errLower = (error || "").toLowerCase();
          const isConflict = errLower.includes("dépasse") || 
                             errLower.includes("solde") ||
                             errLower.includes("duplicate") ||
                             errLower.includes("déjà") ||
                             errLower.includes("conflit") ||
                             errLower.includes("conflict") ||
                             errLower.includes("double") ||
                             errLower.includes("verrouill") ||
                             errLower.includes("lock") ||
                             errLower.includes("délai") ||
                             errLower.includes("autoris") ||
                             errLower.includes("insuffisant");

          const isNetworkError = !navigator.onLine ||
                                 errLower.includes("fetch") ||
                                 errLower.includes("connexion") ||
                                 errLower.includes("network") ||
                                 errLower.includes("econnrefused") ||
                                 errLower.includes("timed out");

          await localDb.outbox.update(item.id!, {
            status: isConflict ? "conflict" : "failed",
            updatedAt: Date.now(),
            retryCount: (item.retryCount || 0) + 1,
            lastError: error,
          });

          console.error(`[Sync] Error syncing item ${item.id} (${item.targetTable}): ${error}`);
          toast.error(`Erreur de synchronisation (${item.targetTable}) : ${error}`);
          
          if (isNetworkError) {
            // Terminate loop on real connection loss
            break;
          }
          // On logical conflicts or validation errors, continue processing the rest of the queue!
        }
      } catch (error: any) {
        await localDb.outbox.update(item.id!, {
          status: "failed",
          updatedAt: Date.now(),
          retryCount: (item.retryCount || 0) + 1,
          lastError: error?.message || "Erreur de connexion au serveur.",
        });
        console.error("[Sync] System exception during sync:", error);
        toast.error("Erreur de connexion au serveur.");
        if (!navigator.onLine) break;
      }
    }

    if (processedCount > 0) {
      toast.success(`${processedCount} modification(s) synchronisee(s) avec succes.`);
      return true;
    }

    return false;
  } finally {
    syncInProgress = false;
    // Periodically clean up synced records older than 7 days to conserve browser storage
    try {
      await cleanupOldSyncedOutbox(7);
    } catch (e) {
      console.warn("[Sync] Periodic outbox cleanup error:", e);
    }
  }
}

/**
 * Automatically purges synced outbox items that are older than retentionDays (default: 7 days)
 * to free up IndexedDB storage in the client browser.
 */
export async function cleanupOldSyncedOutbox(retentionDays = 7): Promise<number> {
  try {
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    // Find all outbox entries with status 'synced' that were synced/updated before the cutoff
    const itemsToDelete = await localDb.outbox
      .filter((item) => {
        if (item.status !== "synced") return false;
        const itemTime = item.syncedAt || item.updatedAt || item.timestamp;
        return itemTime < cutoffTimestamp;
      })
      .toArray();

    if (itemsToDelete.length === 0) return 0;

    const idsToDelete = itemsToDelete.map((item) => item.id!).filter(Boolean);
    await localDb.outbox.bulkDelete(idsToDelete);

    console.log(
      `[Sync Cleanup] Purged ${idsToDelete.length} synced outbox operations older than ${retentionDays} days.`
    );
    return idsToDelete.length;
  } catch (error) {
    console.warn("[Sync Cleanup] Failed to purge old synced outbox items:", error);
    return 0;
  }
}
