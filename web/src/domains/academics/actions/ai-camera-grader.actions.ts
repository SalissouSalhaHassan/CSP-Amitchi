"use server";

import { db } from "@/infrastructure/database";
import { exams, examResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PushNotificationService } from "@/shared/services/push-notification.service";

export interface SaveGradedResultPayload {
  examId: number;
  studentId: number;
  schoolId: number;
  marksObtained: number;
  remarks?: string;
  detailedAnalysis?: any;
  notifyParent?: boolean;
}

export async function saveCameraGradedResult(payload: SaveGradedResultPayload) {
  try {
    const { examId, studentId, schoolId, marksObtained, remarks, detailedAnalysis, notifyParent = true } = payload;

    // Check if result already exists for this student & exam
    const existingResult = await db.query.examResults.findFirst({
      where: and(eq(examResults.examId, examId), eq(examResults.studentId, studentId)),
    });

    let savedId: number;

    if (existingResult) {
      // Update existing mark
      await db
        .update(examResults)
        .set({
          marksObtained,
          remarks: remarks || existingResult.remarks,
          recordedAt: new Date(),
        })
        .where(eq(examResults.id, existingResult.id));
      savedId = existingResult.id;
    } else {
      // Insert new result
      const [inserted] = await db
        .insert(examResults)
        .values({
          schoolId,
          examId,
          studentId,
          marksObtained,
          remarks: remarks || "Corrigé via IA Caméra",
          recordedAt: new Date(),
        })
        .returning({ id: examResults.id });
      savedId = inserted?.id || 0;
    }

    // Optionally notify via Push & WhatsApp
    if (notifyParent) {
      try {
        const student = await db.query.students.findFirst({
          where: eq(students.id, studentId),
          with: { class: true },
        });

        const exam = await db.query.exams.findFirst({
          where: eq(exams.id, examId),
          with: { subject: true },
        });

        if (student && exam) {
          const studentName = (student as any).nomEtudiant || `${(student as any).firstName || ''} ${(student as any).lastName || ''}`.trim() || "Élève";
          const subjectName = exam.subject?.subjectName || exam.examName;

          // Dispatch in-app notification via PushNotificationService
          await PushNotificationService.sendHomeworkAlert({
            homeworkTitle: `Note d'examen disponible : ${marksObtained}/${exam.maxMarks || 20} en ${subjectName}`,
            classId: student.classId || 0,
            className: (student as any).class?.className || student.classe || "Classe",
            subjectName,
            dateDue: new Date().toLocaleDateString("fr-FR"),
          });
        }
      } catch (notifErr) {
        console.warn("[saveCameraGradedResult] Notification notice:", notifErr);
      }
    }

    revalidatePath("/dashboard/academics/exams");
    revalidatePath("/dashboard/academics/grades");

    return {
      success: true,
      resultId: savedId,
      message: "Note enregistrée avec succès dans le carnet de notes.",
    };
  } catch (error: any) {
    console.error("[saveCameraGradedResult] Error:", error);
    return {
      success: false,
      error: error?.message || "Erreur lors de l'enregistrement de la note.",
    };
  }
}

export async function getExamResultsForReview(examId: number) {
  try {
    const results = await db.query.examResults.findMany({
      where: eq(examResults.examId, examId),
      with: {
        student: true,
      },
      orderBy: (t, { desc }) => [desc(t.recordedAt)],
    });
    return results;
  } catch (err) {
    console.error("[getExamResultsForReview] Error:", err);
    return [];
  }
}
