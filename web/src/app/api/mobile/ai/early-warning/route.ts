import { NextRequest, NextResponse } from "next/server";
import { sql, eq, and } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { students } from "@/infrastructure/database/schema/students";

export const dynamic = "force-dynamic";

function computeNormalizedScoreOn20(row: any): number {
  const weighted = row.weighted_score !== null && row.weighted_score !== undefined ? Number(row.weighted_score) : null;
  const coef = Math.max(1, Number(row.coefficient || 1));
  const total = row.total_score !== null && row.total_score !== undefined ? Number(row.total_score) : null;
  const classWork = row.class_work_score !== null && row.class_work_score !== undefined ? Number(row.class_work_score) : null;
  const exam = row.exam_score !== null && row.exam_score !== undefined ? Number(row.exam_score) : null;
  const moyDev = row.moyenne_devoirs !== null && row.moyenne_devoirs !== undefined ? Number(row.moyenne_devoirs) : null;

  // 1. If weighted_score and coefficient exist and are consistent
  if (weighted !== null && weighted > 0 && coef > 0) {
    const fromWeighted = weighted / coef;
    if (fromWeighted <= 20.0) {
      return Number(fromWeighted.toFixed(2));
    }
  }

  // 2. If both classWork/moyDev and exam exist
  const cw = (moyDev !== null && moyDev > 0) ? moyDev : ((classWork !== null && classWork > 0) ? classWork : null);
  if (cw !== null && exam !== null && exam > 0) {
    if (cw <= 20.0 && exam <= 20.0) {
      return Number(((cw + exam) / 2.0).toFixed(2));
    }
  }

  // 3. From total_score
  if (total !== null && total > 0) {
    if (total <= 20.0) {
      if (classWork !== null && exam !== null && Math.abs((classWork + exam) - total) < 0.1 && (classWork + exam) > 0) {
        return Number(((classWork + exam) / 2.0).toFixed(2));
      }
      return Number(total.toFixed(2));
    } else if (total <= 40.0) {
      return Number((total / 2.0).toFixed(2));
    } else if (total <= 100.0) {
      return Number(((total / 100.0) * 20.0).toFixed(2));
    } else if (coef > 1 && (total / coef) <= 20.0) {
      return Number((total / coef).toFixed(2));
    }
  }

  // 4. Fallback to exam or classWork
  if (exam !== null && exam > 0) {
    return Number((exam <= 20.0 ? exam : (exam / 100.0) * 20.0).toFixed(2));
  }
  if (cw !== null && cw > 0) {
    return Number((cw <= 20.0 ? cw : (cw / 100.0) * 20.0).toFixed(2));
  }

  return 0;
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : null;
  const term = searchParams.get("term");

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isParent = !(user as any).admin && !user.employeeId;
  if (isParent) {
    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }
  }

  try {
    // 1. Fetch student grades with optional session and term filters
    let gradesRes;
    if (sessionId && term) {
      gradesRes = await readDb.execute(sql`
        SELECT r.subject_id, r.total_score, r.class_work_score, r.exam_score, r.moyenne_devoirs,
               r.coefficient, r.weighted_score, r.term, r.session_id,
               s.subject_name, s.subject_code
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId}
          AND (r.session_id = ${sessionId} OR r.session_id IS NULL)
          AND r.term = ${term}
        ORDER BY r.subject_id
      `);
    } else if (sessionId) {
      gradesRes = await readDb.execute(sql`
        SELECT r.subject_id, r.total_score, r.class_work_score, r.exam_score, r.moyenne_devoirs,
               r.coefficient, r.weighted_score, r.term, r.session_id,
               s.subject_name, s.subject_code
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId}
          AND (r.session_id = ${sessionId} OR r.session_id IS NULL)
        ORDER BY r.term DESC, r.subject_id
      `);
    }

    let grades = ((gradesRes as any)?.rows || gradesRes) as any[] || [];

    // Fallback: If no rows found with sessionId, fetch across all sessions
    if (grades.length === 0) {
      gradesRes = await readDb.execute(sql`
        SELECT r.subject_id, r.total_score, r.class_work_score, r.exam_score, r.moyenne_devoirs,
               r.coefficient, r.weighted_score, r.term, r.session_id,
               s.subject_name, s.subject_code
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId}
        ORDER BY r.term DESC, r.subject_id
      `);
      grades = ((gradesRes as any)?.rows || gradesRes) as any[] || [];
    }

    // 2. Fetch student attendance
    const attRes = await readDb.execute(sql`
      SELECT status, count(*) as count
      FROM student_attendance
      WHERE student_id = ${studentId}
      GROUP BY status
    `);
    const attStats = ((attRes as any).rows || attRes) as any[];
    
    let totalAbsences = 0;
    let totalLates = 0;
    for (const a of attStats) {
      const s = String(a.status || "").toLowerCase();
      const cnt = Number(a.count || 0);
      if (s.includes("abs")) totalAbsences += cnt;
      if (s.includes("retard") || s.includes("late")) totalLates += cnt;
    }

    // 3. Group and aggregate grades BY UNIQUE SUBJECT
    const subjectMap = new Map<string, {
      subjectName: string;
      totalWeightedScore: number;
      totalWeights: number;
      coefficient: number;
      evaluationsCount: number;
    }>();

    for (const g of grades) {
      const rawName = (g.subject_name || "Matière").trim();
      const normKey = rawName.toLowerCase();
      
      const score = computeNormalizedScoreOn20(g);
      const coef = Math.max(1, Number(g.coefficient || 1));

      if (score <= 0) continue; // Ignore empty / unrecorded grades

      if (!subjectMap.has(normKey)) {
        subjectMap.set(normKey, {
          subjectName: rawName,
          totalWeightedScore: score * coef,
          totalWeights: coef,
          coefficient: coef,
          evaluationsCount: 1,
        });
      } else {
        const existing = subjectMap.get(normKey)!;
        existing.totalWeightedScore += score * coef;
        existing.totalWeights += coef;
        existing.evaluationsCount += 1;
      }
    }

    const atRiskSubjects: any[] = [];
    const strongSubjects: any[] = [];
    let totalWeighted = 0;
    let totalCoeff = 0;

    for (const subj of subjectMap.values()) {
      const subjectAverage = Number((subj.totalWeightedScore / subj.totalWeights).toFixed(1));
      
      totalWeighted += subjectAverage * subj.coefficient;
      totalCoeff += subj.coefficient;

      if (subjectAverage < 10.0 && subjectAverage > 0) {
        atRiskSubjects.push({
          subjectName: subj.subjectName,
          score: subjectAverage,
          coefficient: subj.coefficient,
          severity: subjectAverage < 7.5 ? "Critique" : "Moyen",
          recommendation: `Séances de révision et exercices ciblés recommandés en ${subj.subjectName}.`,
        });
      } else if (subjectAverage >= 14.0) {
        strongSubjects.push({
          subjectName: subj.subjectName,
          score: subjectAverage,
          coefficient: subj.coefficient,
        });
      }
    }

    // Sort atRiskSubjects by lowest score first
    atRiskSubjects.sort((a, b) => a.score - b.score);
    strongSubjects.sort((a, b) => b.score - a.score);

    const overallAverage = totalCoeff > 0 ? Number((totalWeighted / totalCoeff).toFixed(1)) : 12.0;

    // 4. Calculate realistic risk level
    let riskLevel: "Faible" | "Modéré" | "Élevé" = "Faible";
    let riskSummary = `Excellent suivi général. Moyenne actuelle de ${overallAverage}/20 avec de très bons acquis.`;

    if (overallAverage < 9.5 || atRiskSubjects.filter(s => s.score < 8.0).length >= 3 || totalAbsences > 7) {
      riskLevel = "Élevé";
      riskSummary = `Attention : ${atRiskSubjects.length} matière(s) nécessitent un soutien d'urgence avant les examens finaux.`;
    } else if (atRiskSubjects.length > 0 || totalAbsences > 2 || totalLates > 3 || overallAverage < 11.5) {
      riskLevel = "Modéré";
      riskSummary = atRiskSubjects.length > 0
        ? `Bonne dynamique globale (${overallAverage}/20). Renforcement conseillé en : ${atRiskSubjects.map((s) => s.subjectName).join(", ")}.`
        : `Suivi académique satisfaisant (${overallAverage}/20). Maintenir l'effort régulier.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        riskLevel,
        riskSummary,
        overallAverage,
        atRiskCount: atRiskSubjects.length,
        atRiskSubjects,
        strongSubjects,
        attendanceAlerts: {
          absences: totalAbsences,
          lates: totalLates,
        },
        actionPlan: [
          "Organiser 2 sessions de soutien par semaine dans les matières prioritaires.",
          "Consulter le tuteur IA pour clarifier les notions difficiles.",
          "Suivre régulièrement les devoirs assignés sur l'application.",
        ],
      },
    });
  } catch (error: any) {
    console.error("[Early Warning API Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'analyse prédictive", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { action, studentId, message, riskLevel } = body;

    if (action === "notifyParent" && studentId) {
      const studentRows = await readDb
        .select({
          id: students.id,
          nomEtudiant: students.nomEtudiant,
          classe: students.classe,
        })
        .from(students)
        .where(eq(students.id, Number(studentId)))
        .limit(1);

      const stdName = studentRows[0]?.nomEtudiant || "L'élève";
      const stdClass = studentRows[0]?.classe || "Classe";

      await db.insert(notifications).values({
        title: `Alerte Pédagogique : Suivi & Soutien (${stdName})`,
        content: message || `Une alerte de niveau ${riskLevel || "Modéré"} a été émise pour ${stdName} (${stdClass}). Un renforcement dans les matières clés est conseillé avant les examens.`,
        type: riskLevel === "Élevé" ? "warning" : "info",
        category: "Pédagogie",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: "Alerte envoyée aux parents et aux responsables pédagogiques avec succès !",
      });
    }

    return mobileJsonError("Action invalide.", 400);
  } catch (error: any) {
    console.error("[Early Warning POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'envoi d'alerte", 500);
  }
}
