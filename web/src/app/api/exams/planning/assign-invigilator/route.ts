import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
    const { timetable_id, room_id, employee_id } = await request.json();

    if (!timetable_id || !room_id || !employee_id) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    const timetableId = parseInt(timetable_id);
    const roomId = parseInt(room_id);
    const employeeId = parseInt(employee_id);

    // 1. Get target exam details
    const examRes = await db.execute(sql`
      SELECT exam_date, start_time, end_time FROM exam_timetables WHERE id = ${timetableId} LIMIT 1
    `);
    const examRows = (Array.isArray(examRes) ? examRes : (examRes as any).rows || []) as any[];
    if (examRows.length === 0) {
      return NextResponse.json({ error: "Examen introuvable." }, { status: 400 });
    }
    const targetExam = examRows[0];

    // 2. Check teacher conflicts
    const tasksRes = await db.execute(sql`
      SELECT 
        r.name as room_name,
        t.start_time, 
        t.end_time 
      FROM exam_invigilations i
      JOIN exam_timetables t ON i.timetable_id = t.id
      JOIN exam_rooms r ON i.room_id = r.id
      WHERE i.employee_id = ${employeeId} 
        AND t.exam_date = ${targetExam.exam_date}::timestamp
    `);
    const teacherTasks = (Array.isArray(tasksRes) ? tasksRes : (tasksRes as any).rows || []) as any[];

    for (const task of teacherTasks) {
      if (checkTimeOverlap(targetExam.start_time, targetExam.end_time, task.start_time, task.end_time)) {
        return NextResponse.json({ 
          error: `⚠️ CONFLIT: Ce professeur surveille déjà la salle '${task.room_name}' de ${task.start_time} à ${task.end_time} !` 
        }, { status: 400 });
      }
    }

    // 3. Check if room already assigned for this exam
    const roomCheck = await db.execute(sql`
      SELECT id FROM exam_invigilations 
      WHERE timetable_id = ${timetableId} AND room_id = ${roomId} LIMIT 1
    `);
    const roomCheckRows = (Array.isArray(roomCheck) ? roomCheck : (roomCheck as any).rows || []) as any[];
    if (roomCheckRows.length > 0) {
      return NextResponse.json({ error: "Cette salle est déjà assignée pour cette épreuve." }, { status: 400 });
    }

    // 4. Assign
    await db.execute(sql`
      INSERT INTO exam_invigilations (timetable_id, room_id, employee_id)
      VALUES (${timetableId}, ${roomId}, ${employeeId})
    `);

    return NextResponse.json({ status: "success", message: "Surveillant et Salle assignés avec succès." });
  } catch (error: any) {
    console.error("Error assigning invigilator:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
