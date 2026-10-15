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
    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id requis." }, { status: 400 });
    }

    const campaignId = parseInt(campaign_id);

    // 1. Get exam timetables
    const ttRes = await db.execute(sql`
      SELECT id, exam_date, start_time, end_time FROM exam_timetables WHERE campaign_id = ${campaignId}
    `);
    const timetables = (Array.isArray(ttRes) ? ttRes : (ttRes as any).rows || []) as any[];
    if (timetables.length === 0) {
      return NextResponse.json({ error: "⚠️ Aucune épreuve planifiée dans cette campagne." }, { status: 400 });
    }

    // 2. Get rooms
    const roomsRes = await db.execute(sql`
      SELECT id, name FROM exam_rooms
    `);
    const rooms = (Array.isArray(roomsRes) ? roomsRes : (roomsRes as any).rows || []) as any[];
    if (rooms.length === 0) {
      return NextResponse.json({ error: "⚠️ Aucune salle d'examen configurée dans la base." }, { status: 400 });
    }

    // 3. Get active teachers
    const teachersRes = await db.execute(sql`
      SELECT id, nom FROM employees WHERE statut = 'Actif'
    `);
    const teachers = (Array.isArray(teachersRes) ? teachersRes : (teachersRes as any).rows || []) as any[];
    if (teachers.length === 0) {
      return NextResponse.json({ error: "⚠️ Aucun enseignant actif disponible pour la surveillance." }, { status: 400 });
    }

    let assignedCount = 0;
    let conflictsAvoided = 0;

    // For each timetable entry
    for (const tt of timetables) {
      const examDateStr = new Date(tt.exam_date).toISOString();

      // Get all invigilations on this date to check for conflicts in memory
      const activeAssignmentsRes = await db.execute(sql`
        SELECT 
          i.employee_id,
          t.start_time,
          t.end_time
        FROM exam_invigilations i
        JOIN exam_timetables t ON i.timetable_id = t.id
        WHERE t.exam_date = ${examDateStr}::timestamp
      `);
      const activeAssignments = (Array.isArray(activeAssignmentsRes) ? activeAssignmentsRes : (activeAssignmentsRes as any).rows || []) as any[];

      // Get workloads of teachers in this campaign
      const workloadsRes = await db.execute(sql`
        SELECT 
          i.employee_id,
          COUNT(i.id) as count
        FROM exam_invigilations i
        JOIN exam_timetables t ON i.timetable_id = t.id
        WHERE t.campaign_id = ${campaignId}
        GROUP BY i.employee_id
      `);
      const workloadsRows = (Array.isArray(workloadsRes) ? workloadsRes : (workloadsRes as any).rows || []) as any[];
      const workloadsMap: Record<number, number> = {};
      for (const w of workloadsRows) {
        workloadsMap[w.employee_id] = parseInt(w.count);
      }

      // For each room
      for (const room of rooms) {
        // Check if room is already assigned for this exam
        const existingRes = await db.execute(sql`
          SELECT id FROM exam_invigilations 
          WHERE timetable_id = ${tt.id} AND room_id = ${room.id} LIMIT 1
        `);
        const existingRows = (Array.isArray(existingRes) ? existingRes : (existingRes as any).rows || []) as any[];
        if (existingRows.length > 0) {
          continue; // Room already assigned
        }

        // Find available teachers
        const availableTeachers: Array<{ id: number; workload: number }> = [];

        for (const teacher of teachers) {
          // Check if teacher has conflict on this date/time
          const teacherTasks = activeAssignments.filter(a => a.employee_id === teacher.id);
          let hasConflict = false;

          for (const task of teacherTasks) {
            if (checkTimeOverlap(tt.start_time, tt.end_time, task.start_time, task.end_time)) {
              hasConflict = true;
              conflictsAvoided++;
              break;
            }
          }

          if (!hasConflict) {
            const workload = workloadsMap[teacher.id] || 0;
            availableTeachers.push({ id: teacher.id, workload });
          }
        }

        // Choose teacher with lowest workload
        if (availableTeachers.length > 0) {
          availableTeachers.sort((a, b) => a.workload - b.workload);
          const chosenTeacher = availableTeachers[0];

          await db.execute(sql`
            INSERT INTO exam_invigilations (timetable_id, room_id, employee_id)
            VALUES (${tt.id}, ${room.id}, ${chosenTeacher.id})
          `);
          assignedCount++;

          // Increment workload in local map for immediate effect in next room
          workloadsMap[chosenTeacher.id] = (workloadsMap[chosenTeacher.id] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Succès: ${assignedCount} surveillants affectés automatiquement. ${conflictsAvoided} conflits d'horaires évités.`
    });
  } catch (error: any) {
    console.error("Error auto assigning invigilators:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
