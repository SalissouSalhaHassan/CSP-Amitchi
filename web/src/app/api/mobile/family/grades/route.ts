import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : null;

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    // 1. First attempt: Query student_results with session filtering (including session_id IS NULL)
    let rawRows: any[] = [];

    if (sessionId) {
      const rowsRes = await readDb.execute(sql`
        SELECT r.*, s.subject_name, s.subject_code
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId} 
          AND (r.session_id = ${sessionId} OR r.session_id IS NULL)
        ORDER BY r.term, r.subject_id
      `);
      rawRows = ((rowsRes as any).rows || rowsRes) as any[];
    }

    // 2. Fallback: If no rows found with sessionId, fetch all results for this student
    if (rawRows.length === 0) {
      const fallbackRes = await readDb.execute(sql`
        SELECT r.*, s.subject_name, s.subject_code
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId}
        ORDER BY r.session_id DESC NULLS LAST, r.term, r.subject_id
      `);
      rawRows = ((fallbackRes as any).rows || fallbackRes) as any[];
    }

    // 3. Fallback / Merge with exam_results (in case school enters grades through Examens module or import)
    if (rawRows.length === 0) {
      try {
        const examRowsRes = await readDb.execute(sql`
          SELECT 
            er.id,
            er.student_id,
            e.subject_id,
            e.class_id,
            COALESCE(ap.session_id, er.school_id) as session_id,
            COALESCE(ap.name, e.exam_name, 'Session Principale') as term,
            NULL::double precision as class_work_score,
            er.marks_obtained as exam_score,
            er.marks_obtained as total_score,
            COALESCE(cs.coefficient, 1) as coefficient,
            (COALESCE(er.marks_obtained, 0) * COALESCE(cs.coefficient, 1)) as weighted_score,
            NULL::varchar as rank,
            0 as absences,
            er.remarks as observation,
            NULL::varchar as appreciation,
            s.subject_name,
            s.subject_code
          FROM exam_results er
          JOIN exams e ON er.exam_id = e.id
          LEFT JOIN academic_periods ap ON e.period_id = ap.id
          LEFT JOIN school_subjects s ON e.subject_id = s.id
          LEFT JOIN class_subjects cs ON (cs.class_id = e.class_id AND cs.subject_id = e.subject_id)
          WHERE er.student_id = ${studentId}
          ORDER BY er.id DESC
        `);
        rawRows = ((examRowsRes as any).rows || examRowsRes) as any[];
      } catch (examErr) {
        console.warn("Could not query exam_results fallback:", examErr);
      }
    }

    const data = rawRows.map((r) => {
      const cw = r.class_work_score !== null && r.class_work_score !== undefined ? Number(r.class_work_score) : null;
      const ex = r.exam_score !== null && r.exam_score !== undefined ? Number(r.exam_score) : null;
      const coef = r.coefficient !== null && Number(r.coefficient) > 0 ? Number(r.coefficient) : 1;

      let tot = r.total_score !== null && r.total_score !== undefined ? Number(r.total_score) : null;
      if (tot === null && (cw !== null || ex !== null)) {
        if (cw !== null && ex !== null) {
          tot = (cw + ex) / 2;
        } else {
          tot = ex !== null ? ex : cw;
        }
      }

      let wScore = r.weighted_score !== null && r.weighted_score !== undefined ? Number(r.weighted_score) : null;
      if (wScore === null && tot !== null) {
        wScore = tot * coef;
      }

      return {
        id: r.id,
        student_id: r.student_id,
        subject_id: r.subject_id,
        class_id: r.class_id,
        session_id: r.session_id,
        term: r.term || "Semestre 1",
        class_work_score: cw,
        exam_score: ex,
        total_score: tot,
        coefficient: coef,
        weighted_score: wScore,
        rank: r.rank || null,
        absences: r.absences !== null ? Number(r.absences) : 0,
        observation: r.observation || "",
        appreciation: r.appreciation || "",
        school_subjects: {
          subject_name: r.subject_name || "Matière",
          subject_code: r.subject_code || "",
        },
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
