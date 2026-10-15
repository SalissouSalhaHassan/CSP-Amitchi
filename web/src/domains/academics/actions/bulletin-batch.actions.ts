"use server";

import { db } from "@/infrastructure/database";
import { bulletinRecords, schoolClasses, academicPeriods, schoolSessions, exams, examResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { BulletinEngine, BatchOptions, BatchResult } from "@/domains/academics/services/bulletin-engine";

// ─── fetchBulletinDataForClass ─────────────────────────────────────────────────
// Récupère toutes les données nécessaires pour générer les bulletins d'une classe
export async function fetchBulletinDataForClass(
  classId: number,
  periodId: number,
  schoolId: number
) {
  try {
    // 1. Info classe + branchInfo + headerConfig
    const classInfo = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.id, classId),
        schoolId ? or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)) : undefined
      ),
    });

    // 2. Période (semestre/trimestre)
    const period = await db.query.academicPeriods.findFirst({
      where: eq(academicPeriods.id, periodId),
      with: { session: true },
    });

    // 3. Élèves de la classe (via students.classId ou students.classe)
    let classStudents: any[] = [];
    if (classInfo) {
      classStudents = await db.query.students.findMany({
        where: and(
          schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined,
          or(
            eq(students.classId, classId),
            classInfo.className ? eq(students.classe, classInfo.className) : undefined
          )
        ),
      });
    }

    if (classStudents.length === 0) {
      classStudents = await db.query.students.findMany({
        where: schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined,
        limit: 50,
      });
    }

    return {
      classInfo,
      period,
      session: period?.session,
      students: classStudents,
      total: classStudents.length,
    };
  } catch (err) {
    console.error("[bulletin-batch.actions] fetchBulletinDataForClass:", err);
    return null;
  }
}

// ─── startBulletinBatch ────────────────────────────────────────────────────────
// Server Action: Lance la génération en lot
export async function startBulletinBatch(
  bulletinsData: any[],
  opts: BatchOptions
): Promise<BatchResult & { ok: boolean; error?: string }> {
  try {
    const result = await BulletinEngine.generateBatch(bulletinsData, opts);
    return { ok: true, ...result };
  } catch (err: any) {
    console.error("[startBulletinBatch] Error:", err);
    return { ok: false, generated: 0, failed: bulletinsData.length, results: [], error: err?.message };
  }
}

// ─── getBulletinHistory ────────────────────────────────────────────────────────
// Récupère l'historique des bulletins pour un élève
export async function getBulletinHistory(studentId: number) {
  return BulletinEngine.listBulletinsForStudent(studentId);
}

// ─── getClassBulletinHistory ──────────────────────────────────────────────────
// Récupère l'historique de tous les bulletins d'une classe
export async function getClassBulletinHistory(classId: number, period?: string) {
  return BulletinEngine.listBulletinsForClass(classId, period);
}

// ─── cancelBulletin ────────────────────────────────────────────────────────────
// Annule un bulletin (le token QR renverra "annulé")
export async function cancelBulletin(verifyToken: string) {
  try {
    await db
      .update(bulletinRecords)
      .set({ status: "annulé" })
      .where(eq(bulletinRecords.verifyToken, verifyToken));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

// ─── verifyBulletinByToken ─────────────────────────────────────────────────────
// Utilisé par la page /verify/bulletin/[token]
export async function verifyBulletinByToken(token: string) {
  return BulletinEngine.getBulletinByToken(token);
}

// ─── getStudentBulletinData ───────────────────────────────────────────────────
// Récupère et agrège toutes les notes, moyennes et métadonnées d'un élève pour le bulletin
export async function getStudentBulletinData(
  studentId: number,
  classId: number,
  periodId: number,
  schoolId: number
) {
  try {
    // 1. Info élève
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined
      ),
    });

    // 2. Info classe
    const classInfo = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true },
    });

    // 3. Période & Session
    const period = await db.query.academicPeriods.findFirst({
      where: eq(academicPeriods.id, periodId),
      with: { session: true },
    });

    // 4. Nombre total d'élèves dans la classe
    const totalStudentsInClass = await db.query.students.findMany({
      where: and(
        schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined,
        or(
          eq(students.classId, classId),
          classInfo?.className ? eq(students.classe, classInfo.className) : undefined
        )
      ),
    });

    // 5. Examens de la période pour cette classe
    const classExams = await db.query.exams.findMany({
      where: and(
        eq(exams.classId, classId),
        eq(exams.periodId, periodId),
        schoolId ? or(eq(exams.schoolId, schoolId), isNull(exams.schoolId)) : undefined
      ),
      with: {
        subject: true,
        results: {
          where: eq(examResults.studentId, studentId),
        },
      },
    });

    // 6. Transformer les examens en résultats par matière
    const results = classExams.map((ex: any) => {
      const mark = ex.results?.[0]?.marksObtained ?? 0;
      const max = ex.maxMarks ?? 20;
      const coef = ex.subject?.coefficient ?? 1;
      const noteSur20 = max > 0 ? (mark / max) * 20 : mark;
      return {
        subjectId: ex.subjectId,
        subjectName: ex.subject?.subjectName ?? "Matière",
        coefficient: coef,
        note: noteSur20,
        totalPoints: noteSur20 * coef,
        appreciation: noteSur20 >= 16 ? "Très Bien" : noteSur20 >= 14 ? "Bien" : noteSur20 >= 12 ? "Assez Bien" : noteSur20 >= 10 ? "Passable" : "Insuffisant",
      };
    });

    const totalCoefficients = results.reduce((acc: number, r: any) => acc + (r.coefficient || 1), 0);
    const totalPoints = results.reduce((acc: number, r: any) => acc + (r.totalPoints || 0), 0);
    const generalAverage = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

    return {
      studentInfo: {
        id: student?.id,
        nomEtudiant: student?.nomEtudiant || "Élève",
        numAdmission: student?.numAdmission || "",
        classe: student?.classe || classInfo?.className || "Classe",
        educationalLevel: student?.educationalLevel || "Tous",
        photoUrl: student?.photoPath || null,
      },
      classInfo: {
        id: classInfo?.id,
        className: classInfo?.className || "Classe",
        section: classInfo?.section?.sectionName || "",
      },
      periodInfo: {
        id: period?.id,
        name: period?.name || "Période",
        sessionName: period?.session?.sessionName || "Année Scolaire",
      },
      results,
      generalAverage,
      totalStudents: totalStudentsInClass.length || 1,
      rank: 1, // Placeholder calculated rank
    };
  } catch (err) {
    console.error("[getStudentBulletinData] Error:", err);
    throw err;
  }
}
