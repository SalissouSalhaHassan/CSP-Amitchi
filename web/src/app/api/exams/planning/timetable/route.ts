import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().replace(/\//g, "-");
  const parts = clean.split("-");
  if (parts.length === 3) {
    // If YYYY-MM-DD
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    // If DD-MM-YYYY
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  return (s1 < e2) && (e1 > s2);
}

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, class_id, subject_id, date, start_time, end_time, max_marks } = await request.json();

    if (!campaign_id || !class_id || !subject_id || !date || !start_time || !end_time || max_marks === undefined) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }

    const campaignId = parseInt(campaign_id);
    const classId = parseInt(class_id);
    const subjectId = parseInt(subject_id);

    // Overlap conflict check
    // Use DATE() cast for robust date comparison ignoring time component
    const dateStr = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;

    const existingResult = await db.execute(sql`
      SELECT 
        t.id, 
        t.start_time, 
        t.end_time, 
        s.subject_name 
      FROM exam_timetables t
      LEFT JOIN school_subjects s ON t.subject_id = s.id
      WHERE t.campaign_id = ${campaignId} 
        AND t.class_id = ${classId} 
        AND DATE(t.exam_date) = ${dateStr}::date
    `);
    const existingExams = (Array.isArray(existingResult) ? existingResult : (existingResult as any).rows || []) as any[];

    for (const ex of existingExams) {
      if (checkTimeOverlap(start_time, end_time, ex.start_time, ex.end_time)) {
        return NextResponse.json({ 
          error: `⚠️ CONFLIT: Cette classe a déjà un examen (${ex.subject_name}) à la même heure !` 
        }, { status: 400 });
      }
    }

    await db.execute(sql`
      INSERT INTO exam_timetables (campaign_id, class_id, subject_id, exam_date, start_time, end_time, max_marks)
      VALUES (${campaignId}, ${classId}, ${subjectId}, ${dateStr}::date, ${start_time}, ${end_time}, ${parseFloat(max_marks)})
    `);

    return NextResponse.json({ status: "success", message: "Épreuve planifiée avec succès." });
  } catch (error: any) {
    console.error("Error creating exam timetable entry:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
