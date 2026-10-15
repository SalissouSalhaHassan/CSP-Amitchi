import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const { timetableId: timetableIdStr } = await params;
    const timetableId = parseInt(timetableIdStr);

    if (isNaN(timetableId)) {
      return NextResponse.json({ error: "timetableId invalide." }, { status: 400 });
    }

    const result = await db.execute(sql`
      SELECT 
        r.id,
        r.candidate_id as cand_id,
        c.student_id,
        c.roll_number as roll_no,
        s.nom_etudiant as name,
        r.attendance_status as status,
        r.incident_type as incident,
        r.incident_report as report,
        r.anonymity_code,
        r.marks_obtained
      FROM exam_attendance_marks r
      JOIN exam_candidates c ON r.candidate_id = c.id
      JOIN students s ON c.student_id = s.id
      WHERE r.timetable_id = ${timetableId}
      ORDER BY s.nom_etudiant ASC
    `);

    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formatted = rows.map((row: any) => ({
      id: row.id,
      cand_id: row.cand_id,
      student_id: row.student_id,
      roll_no: row.roll_no || "",
      name: row.name || "N/A",
      status: row.status || "Absent",
      incident: row.incident || "-",
      report: row.report || "",
      anonymity_code: row.anonymity_code || "",
      marks_obtained: row.marks_obtained !== null && row.marks_obtained !== undefined ? parseFloat(row.marks_obtained) : null
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching attendance list:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
