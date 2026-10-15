import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { qr_data, timetable_id } = await request.json();

    if (!qr_data || !timetable_id) {
      return NextResponse.json({ error: "Données QR ou ID examen manquants." }, { status: 400 });
    }

    const timetableId = parseInt(timetable_id);

    // Parse the QR code payload (e.g. CAMP:1|CAND:45|STU:102)
    const parts = qr_data.split("|");
    const dataDict: Record<string, number> = {};
    for (const p of parts) {
      const subParts = p.split(":");
      if (subParts.length === 2) {
        const key = subParts[0].trim();
        const val = parseInt(subParts[1].trim());
        if (key && !isNaN(val)) {
          dataDict[key] = val;
        }
      }
    }

    const candId = dataDict["CAND"];

    if (!candId) {
      return NextResponse.json({ error: "Format du Code QR non reconnu." }, { status: 400 });
    }

    // Verify candidate enrollment in this exam timetable entry
    const checkRes = await db.execute(sql`
      SELECT 
        r.id, 
        r.attendance_status as status, 
        s.nom_etudiant as name
      FROM exam_attendance_marks r
      JOIN exam_candidates c ON r.candidate_id = c.id
      JOIN students s ON c.student_id = s.id
      WHERE r.candidate_id = ${candId} AND r.timetable_id = ${timetableId}
      LIMIT 1
    `);
    const checkRows = (Array.isArray(checkRes) ? checkRes : (checkRes as any).rows || []) as any[];

    if (checkRows.length === 0) {
      return NextResponse.json({ 
        error: "Cet étudiant n'est pas inscrit à cet examen spécifique." 
      }, { status: 400 });
    }

    const record = checkRows[0];

    if (record.status === "Présent") {
      return NextResponse.json({ 
        status: "already_present", 
        message: `⚠️ ${record.name} est DÉJÀ marqué présent.`, 
        student_name: record.name 
      }, { status: 400 }); // status: 400 matches python backend HTTPException
    }

    // Mark as Present
    await db.execute(sql`
      UPDATE exam_attendance_marks 
      SET attendance_status = 'Présent' 
      WHERE id = ${record.id}
    `);

    return NextResponse.json({ 
      status: "success", 
      message: "Présence enregistrée.", 
      student_name: record.name 
    });
  } catch (error: any) {
    console.error("Error processing QR scan:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du Code QR." }, { status: 500 });
  }
}
