import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError, canUseMobileModule } from "../_lib/auth";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { cahierTextes } from "@/infrastructure/database/schema/pedagogie";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { feePayments, studentFees, expenses, expenseCategories } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { idempotencyLogs, syncConflicts } from "@/infrastructure/database/schema/audit";

export const dynamic = "force-dynamic";

interface SyncOperationItem {
  id?: string;
  table: string;
  action: string;
  data: Record<string, any>;
  timestamp?: string;
  idempotencyKey?: string;
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  if (!user.schoolId) {
    return mobileJsonError("Utilisateur non rattaché à un établissement.", 403);
  }

  const schoolId = user.schoolId;

  try {
    const body = await request.json();
    const operations: SyncOperationItem[] = Array.isArray(body.operations)
      ? body.operations
      : body.table && body.action
      ? [body]
      : [];

    if (!operations.length) {
      return mobileJsonError("Aucune opération de synchronisation fournie.", 400);
    }

    const results: Array<{ id?: string; success: boolean; error?: string; data?: any; localId?: string; realId?: number }> = [];

    for (const op of operations) {
      const { id, table, action, data, idempotencyKey } = op;

      // 🛡️ 1. Idempotency Check: prevent duplicate billing or re-execution
      if (idempotencyKey) {
        const existingLog = await db.query.idempotencyLogs.findFirst({
          where: and(
            eq(idempotencyLogs.schoolId, schoolId),
            eq(idempotencyLogs.idempotencyKey, idempotencyKey)
          ),
        });

        if (existingLog) {
          results.push({
            id,
            success: true,
            data: existingLog.responseData || { cached: true },
          });
          continue;
        }
      }

      try {
        // 1. Student Attendance Sync
        if (table === "student_attendance" || table === "attendance") {
          const permitted = await canUseMobileModule(user, "attendance", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le module Présence." });
            continue;
          }

          if (action === "batch_attendance" && Array.isArray(data.records)) {
            const dateVal = data.dateStr ? new Date(data.dateStr) : new Date();
            const records = data.records;

            await db.transaction(async (tx) => {
              for (const rec of records) {
                const studentId = Number(rec.studentId);
                const status = rec.status || "Présent";
                const remark = rec.remark || rec.remarks || rec.justification || null;
                const classId = data.classId ? Number(data.classId) : undefined;
                const subjectId = data.subjectId ? Number(data.subjectId) : undefined;
                const employeeId = data.employeeId ? Number(data.employeeId) : undefined;

                if (!studentId) continue;

                const existing = await tx.query.studentAttendance.findFirst({
                  where: and(
                    eq(studentAttendance.schoolId, schoolId),
                    eq(studentAttendance.studentId, studentId),
                    eq(studentAttendance.date, dateVal)
                  ),
                });

                if (existing) {
                  await tx
                    .update(studentAttendance)
                    .set({
                      status,
                      remark,
                    })
                    .where(eq(studentAttendance.id, existing.id));
                } else {
                  await tx.insert(studentAttendance).values({
                    schoolId,
                    studentId,
                    classId,
                    subjectId,
                    employeeId,
                    date: dateVal,
                    status,
                    remark,
                    recordedBy: String(user.id),
                  });
                }
              }
            });

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Format d'opération Présence non supporté." });
          }
        } 
        
        // 2. Cahier de Textes Sync
        else if (table === "cahier_textes" || table === "pedagogie") {
          const permitted = await canUseMobileModule(user, "pedagogie", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le Cahier de textes." });
            continue;
          }

          if (action === "create_seance") {
            const [created] = await db
              .insert(cahierTextes)
              .values({
                schoolId,
                classId: Number(data.classId),
                subjectId: Number(data.subjectId),
                employeeId: Number(data.employeeId || user.employeeId),
                sessionDate: data.sessionDate || data.dateSeance || new Date().toISOString().split("T")[0],
                titreLecon: data.titreLecon || data.titre || "Séance",
                heureDebut: data.heureDebut,
                heureFin: data.heureFin,
                objectifs: data.objectifs,
                contenuRealise: data.contenuRealise || data.contenu,
                supportsUtilises: data.supportsUtilises,
                devoirDonne: data.devoirDonne || data.devoirMaison,
                observation: data.observation || data.remarques,
                statut: data.statut || "En attente",
              })
              .returning();

            results.push({ id, success: true, data: { id: created?.id } });
          } else if (action === "update_seance" && data.id) {
            await db
              .update(cahierTextes)
              .set({
                titreLecon: data.titreLecon || data.titre,
                heureDebut: data.heureDebut,
                heureFin: data.heureFin,
                objectifs: data.objectifs,
                contenuRealise: data.contenuRealise || data.contenu,
                supportsUtilises: data.supportsUtilises,
                devoirDonne: data.devoirDonne || data.devoirMaison,
                observation: data.observation || data.remarques,
                statut: data.statut || "En attente",
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(cahierTextes.id, Number(data.id)),
                  eq(cahierTextes.schoolId, schoolId)
                )
              );

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Action Cahier de textes inconnue." });
          }
        } 
        
        // 3. Student Results & Grades Sync
        else if (table === "student_results" || table === "academics") {
          const permitted = await canUseMobileModule(user, "academics", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour la saisie des notes." });
            continue;
          }

          if (action === "save_grades" && Array.isArray(data.grades)) {
            await db.transaction(async (tx) => {
              for (const g of data.grades) {
                const studentId = Number(g.studentId);
                const mark = Number(g.mark ?? g.examScore ?? g.note ?? 0);
                const term = String(data.term || g.term || "Trimestre 1");
                const subjectId = Number(g.subjectId || data.subjectId);
                const classId = Number(g.classId || data.classId);
                const sessionId = Number(g.sessionId || data.sessionId || 1);

                if (!studentId || !subjectId) continue;

                const existing = await tx.query.studentResults.findFirst({
                  where: and(
                    eq(studentResults.studentId, studentId),
                    eq(studentResults.subjectId, subjectId),
                    eq(studentResults.term, term)
                  ),
                });

                if (existing) {
                  // Conflict Detection: check if server value has changed since client operation
                  const serverMark = Number(existing.examScore || 0);
                  const isConflicting = serverMark !== mark && op.timestamp && existing.updatedAt && new Date(existing.updatedAt) > new Date(op.timestamp);

                  if (isConflicting) {
                    await tx.insert(syncConflicts).values({
                      schoolId,
                      tableName: "student_results",
                      recordId: String(existing.id),
                      fieldName: "examScore",
                      serverValue: { examScore: serverMark, term },
                      clientValue: { examScore: mark, term, comment: g.comment },
                      status: "pending",
                    }).catch(() => {});
                  } else {
                    await tx
                      .update(studentResults)
                      .set({
                        examScore: mark,
                        observation: g.comment || g.observation || null,
                        updatedAt: new Date(),
                      })
                      .where(eq(studentResults.id, existing.id));
                  }
                } else {
                  await tx.insert(studentResults).values({
                    studentId,
                    subjectId,
                    classId,
                    sessionId,
                    term,
                    examScore: mark,
                    observation: g.comment || g.observation || null,
                  });
                }
              }
            });

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Format de notes non reconnu." });
          }
        } 
        
        // 4. Finance Fee Payments Sync
        else if (table === "fee_payments" || table === "finance") {
          const permitted = await canUseMobileModule(user, "finance", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le module Finance." });
            continue;
          }

          if (action === "record_payment") {
            const amount = Number(data.amount || 0);
            const feeId = Number(data.feeId);

            if (!feeId || amount <= 0) {
              results.push({ id, success: false, error: "Montant ou référence de frais invalide." });
              continue;
            }

            const [created] = await db
              .insert(feePayments)
              .values({
                schoolId,
                feeId,
                amount,
                reduction: Number(data.reduction || 0),
                paymentMode: data.paymentMode || "Espèces",
                reference: data.reference || `REC-${Date.now()}`,
                monthConcerned: data.monthConcerned || null,
                datePaid: data.datePaid ? new Date(data.datePaid) : new Date(),
                recordedBy: String(user.id),
              })
              .returning();

            if (idempotencyKey) {
              await db.insert(idempotencyLogs).values({
                schoolId,
                idempotencyKey,
                endpoint: "/api/mobile/sync:fee_payments",
                responseStatus: 200,
                responseData: { id: created?.id, reference: created?.reference },
              }).catch(() => {});
            }

            results.push({ id, success: true, data: { id: created?.id, reference: created?.reference } });
          } else {
            results.push({ id, success: false, error: "Action financière non supportée." });
          }
        } 
        
        // 5. Offline Students Registration Sync (Parent-Child Cascade)
        else if (table === "students" || table === "student_admission") {
          const permitted = await canUseMobileModule(user, "admissions", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour l'inscription d'élèves." });
            continue;
          }

          if (action === "create_student" || action === "register_student") {
            const numAdmission = data.numAdmission || `ADM-${Date.now().toString().slice(-6)}`;
            const nomEtudiant = String(data.nomEtudiant || data.fullName || "Nouvel Élève");
            const localId = data.localId || op.id;

            const [created] = await db
              .insert(students)
              .values({
                schoolId,
                numAdmission,
                nomEtudiant,
                nomArabe: data.nomArabe || null,
                sexe: data.sexe || "Masculin",
                classe: data.classe || null,
                classId: data.classId ? Number(data.classId) : null,
                section: data.section || null,
                educationalLevel: data.educationalLevel || null,
                session: data.session || null,
                dateNaissance: data.dateNaissance || null,
                lieuNaissance: data.lieuNaissance || null,
                nomPere: data.nomPere || null,
                mobile: data.mobile || null,
                whatsapp: data.whatsapp || null,
                fraisInscription: Number(data.fraisInscription || 0),
                fraisMensuels: Number(data.fraisMensuels || 0),
                photoPath: data.photoPath || null,
                statut: "Actif",
              })
              .returning();

            // Also initialize or fetch fee account if fees specified
            let studentFeeAccount: any = null;
            const regFee = Number(data.fraisInscription || 0);
            const rawMonthly = Number(data.fraisMensuels || 0);
            if (created && (regFee > 0 || rawMonthly > 0)) {
              let totalExpected: number;
              const isPrimaireOrMater = String(data.educationalLevel || "").toLowerCase().includes("prim") ||
                String(data.educationalLevel || "").toLowerCase().includes("mater") ||
                String(data.classe || "").toLowerCase().includes("ce") ||
                String(data.classe || "").toLowerCase().includes("cm") ||
                String(data.classe || "").toLowerCase().includes("ci") ||
                String(data.classe || "").toLowerCase().includes("cp");

              if (rawMonthly >= 30000 || (isPrimaireOrMater && rawMonthly >= 20000)) {
                // Entered amount is already the full annual tuition
                totalExpected = regFee + rawMonthly;
              } else {
                totalExpected = regFee + (rawMonthly * 9);
              }

              if (totalExpected <= 0) totalExpected = 45000;

              [studentFeeAccount] = await db
                .insert(studentFees)
                .values({
                  schoolId,
                  studentId: created.id,
                  totalExpected,
                  totalPaid: 0,
                  balance: totalExpected,
                  status: "Impayé",
                })
                .returning();
            }

            if (idempotencyKey) {
              await db.insert(idempotencyLogs).values({
                schoolId,
                idempotencyKey,
                endpoint: "/api/mobile/sync:students",
                responseStatus: 200,
                responseData: { realId: created?.id, localId, feeId: studentFeeAccount?.id },
              }).catch(() => {});
            }

            results.push({
              id,
              success: true,
              localId,
              realId: created?.id,
              data: {
                student: created,
                feeAccount: studentFeeAccount,
              },
            });
          } else {
            results.push({ id, success: false, error: "Action sur étudiant non supportée." });
          }
        } 
        
        // 6. Expenses Sync
        else if (table === "expenses") {
          const permitted = await canUseMobileModule(user, "finance", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour enregistrer des dépenses." });
            continue;
          }

          if (action === "insert" || action === "create_expense") {
            const amount = Number(data.amount || 0);
            const description = String(data.description || "").trim();
            const categoryName = String(data.category || data.categoryName || "Général").trim();
            const paymentMode = String(data.payment_mode || data.paymentMode || "Espèces").trim();
            const dateExpense = data.date_expense || data.dateExpense ? new Date(data.date_expense || data.dateExpense) : new Date();

            let category = await db.query.expenseCategories.findFirst({
              where: and(
                eq(expenseCategories.schoolId, schoolId),
                eq(expenseCategories.name, categoryName)
              ),
            });

            if (!category) {
              try {
                const [insertedCat] = await db
                  .insert(expenseCategories)
                  .values({ schoolId, name: categoryName, description: categoryName })
                  .returning();
                category = insertedCat;
              } catch (_) {
                category = await db.query.expenseCategories.findFirst({
                  where: eq(expenseCategories.schoolId, schoolId),
                });
              }
            }

            const reference = data.reference || `DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const [created] = await db
              .insert(expenses)
              .values({
                schoolId,
                reference,
                categoryId: category?.id || null,
                amount,
                description,
                dateExpense,
                paymentMode,
                status: data.status || "Payé",
                recordedBy: user.employee?.nom || user.utilisateur || "Mobile App",
                educationalLevel: user.educationalLevel || null,
              })
              .returning();

            if (idempotencyKey) {
              await db.insert(idempotencyLogs).values({
                schoolId,
                idempotencyKey,
                endpoint: "/api/mobile/sync:expenses",
                responseStatus: 200,
                responseData: { id: created?.id, reference: created?.reference },
              }).catch(() => {});
            }

            results.push({
              id,
              success: true,
              data: { id: created?.id, reference: created?.reference },
            });
          } else {
            results.push({ id, success: false, error: "Action sur dépense non supportée." });
          }
        } else {
          results.push({
            id,
            success: false,
            error: `Entité '${table}' non autorisée pour la synchronisation directe.`,
          });
        }
      } catch (opErr: any) {
        console.error(`[Sync API] Error processing op ${id} on ${table}:${action}:`, opErr);
        results.push({
          id,
          success: false,
          error: opErr.message || "Erreur interne de synchronisation serveur.",
        });
      }
    }

    const allSuccessful = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccessful,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Sync API] Critical Handler Error:", error);
    return mobileJsonError(error.message || "Erreur serveur lors de la synchronisation.", 500);
  }
}
