import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const className = searchParams.get("className");

  if (!studentId || !className) {
    return mobileJsonError("Paramètres studentId ou className manquants", 400);
  }

  const isParent = !user.admin && !user.employeeId;
  if (isParent) {
    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }
  }

  try {
    const rawClassName = className.trim();
    const cleanClass = rawClassName.toLowerCase().replace(/\s+/g, "");

    // Find matching class
    const clsRes = await readDb.execute(sql`
      SELECT id, class_name FROM school_classes
      WHERE LOWER(REPLACE(class_name, ' ', '')) = ${cleanClass}
         OR class_name ILIKE ${rawClassName}
      LIMIT 1
    `);
    const clsRows = ((clsRes as any).rows || clsRes) as any[];

    if (!clsRows || clsRows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const classId = clsRows[0].id;

    // Fetch homeworks with student submissions
    const rowsRes = await readDb.execute(sql`
      SELECT h.id, h.title, h.description, h.class_id, h.subject_id, h.date_assigned, h.date_due, h.attachment_path, h.created_by,
             s.subject_name,
             sub.id as submission_id, sub.file_path as submission_file, sub.text_content as submission_text,
             sub.status as submission_status, sub.score as submission_score, sub.feedback as submission_feedback,
             sub.submitted_at, sub.graded_at, sub.graded_by
      FROM homework h
      LEFT JOIN school_subjects s ON h.subject_id = s.id
      LEFT JOIN homework_submissions sub ON sub.homework_id = h.id AND sub.student_id = ${studentId}
      WHERE h.class_id = ${classId}
      ORDER BY h.date_due ASC
    `);

    const rawRows = ((rowsRes as any).rows || rowsRes) as any[];

    const data = rawRows.map((h) => {
      const isSubmitted = Boolean(h.submission_id);
      const isGraded = h.submission_score !== null && h.submission_score !== undefined;
      let status = "À faire";
      if (isGraded) status = "Noté";
      else if (isSubmitted) status = "Soumis";

      return {
        id: h.id,
        title: h.title,
        description: h.description,
        class_id: h.class_id,
        subject_id: h.subject_id,
        date_assigned: h.date_assigned ? new Date(h.date_assigned).toISOString() : null,
        date_due: h.date_due ? new Date(h.date_due).toISOString() : null,
        attachment_path: h.attachment_path,
        created_by: h.created_by,
        subject_name: h.subject_name || "Matière",
        school_subjects: h.subject_name ? { subject_name: h.subject_name } : null,
        submission: isSubmitted ? {
          id: h.submission_id,
          filePath: h.submission_file,
          textContent: h.submission_text,
          status: h.submission_status || status,
          score: h.submission_score !== null ? Number(h.submission_score) : null,
          feedback: h.submission_feedback,
          submittedAt: h.submitted_at ? new Date(h.submitted_at).toISOString() : null,
          gradedAt: h.graded_at ? new Date(h.graded_at).toISOString() : null,
          gradedBy: h.graded_by,
        } : null,
        status,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[Family Homework API Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { homeworkId, studentId, textContent, filePath } = body;

    if (!homeworkId || !studentId) {
      return mobileJsonError("homeworkId et studentId obligatoires.", 400);
    }

    const sId = Number(studentId);
    const hwId = Number(homeworkId);

    // Upsert homework submission
    const existing = await readDb.execute(sql`
      SELECT id FROM homework_submissions 
      WHERE homework_id = ${hwId} AND student_id = ${sId}
      LIMIT 1
    `);
    const existingRows = ((existing as any).rows || existing) as any[];

    if (existingRows.length > 0) {
      const subId = existingRows[0].id;
      await db.execute(sql`
        UPDATE homework_submissions
        SET text_content = ${textContent || ""},
            file_path = ${filePath || null},
            status = 'Soumis',
            submitted_at = NOW()
        WHERE id = ${subId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO homework_submissions (homework_id, student_id, text_content, file_path, status, submitted_at)
        VALUES (${hwId}, ${sId}, ${textContent || ""}, ${filePath || null}, 'Soumis', NOW())
      `);
    }

    return NextResponse.json({
      success: true,
      message: "Devoir remis avec succès à l'enseignant !",
    });
  } catch (error: any) {
    console.error("[Homework Submission POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur de remise du devoir", 500);
  }
}
