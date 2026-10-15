import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { record_id, incident_type, report_text } = await request.json();

    if (!record_id || !incident_type) {
      return NextResponse.json({ error: "record_id et incident_type requis." }, { status: 400 });
    }

    const recordId = parseInt(record_id);

    // Verify if record exists
    const check = await db.execute(sql`
      SELECT id FROM exam_attendance_marks WHERE id = ${recordId} LIMIT 1
    `);
    const checkRows = (Array.isArray(check) ? check : (check as any).rows || []) as any[];

    if (checkRows.length === 0) {
      return NextResponse.json({ error: "Enregistrement introuvable." }, { status: 400 });
    }

    // If Fraud (Triche) or Exclusion, set marks_obtained to 0.0!
    if (incident_type === "Fraude (Triche)" || incident_type === "Exclusion") {
      await db.execute(sql`
        UPDATE exam_attendance_marks 
        SET incident_type = ${incident_type}, 
            incident_report = ${report_text || ""},
            marks_obtained = 0.0
        WHERE id = ${recordId}
      `);
    } else {
      await db.execute(sql`
        UPDATE exam_attendance_marks 
        SET incident_type = ${incident_type}, 
            incident_report = ${report_text || ""}
        WHERE id = ${recordId}
      `);
    }

    return NextResponse.json({ status: "success", message: "Incident enregistré avec succès." });
  } catch (error: any) {
    console.error("Error saving exam incident:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
