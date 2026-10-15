import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import {
  lmsVirtualClasses,
  lmsVirtualAttendance,
} from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, desc, or, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    let studentId = user.studentId;
    if (studentIdParam) {
      studentId = Number(studentIdParam);
    }

    let classId: number | null = null;
    if (studentId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      classId = student?.classId || null;
    }

    const whereCondition = classId
      ? or(eq(lmsVirtualClasses.classId, classId), isNull(lmsVirtualClasses.classId))
      : undefined;

    const lives = await db.query.lmsVirtualClasses.findMany({
      where: whereCondition,
      with: {
        class: true,
        subject: true,
        teacher: true,
      },
      orderBy: [desc(lmsVirtualClasses.sessionDate)],
    });

    let attendedIds = new Set<number>();
    if (studentId) {
      const attendances = await db.query.lmsVirtualAttendance.findMany({
        where: eq(lmsVirtualAttendance.studentId, studentId),
      });
      attendedIds = new Set(attendances.map((a) => a.virtualClassId).filter(Boolean) as number[]);
    }

    const enriched = lives.map((v) => ({
      ...v,
      hasAttended: attendedIds.has(v.id),
      className: v.class?.className || "Toutes les classes",
      subjectName: v.subject?.subjectName || "Général",
      teacherName: v.teacher?.nom || "Enseignant",
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (e: any) {
    console.error("[LMS Virtual Classes API Error]:", e);
    return mobileJsonError(e?.message || "Erreur serveur", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const virtualClassId = Number(body.virtualClassId);
    let studentId = user.studentId || Number(body.studentIdParam);

    if (!virtualClassId || !studentId) {
      return mobileJsonError("Paramètres manquants (virtualClassId, studentId)", 400);
    }

    const existing = await db.query.lmsVirtualAttendance.findFirst({
      where: and(
        eq(lmsVirtualAttendance.virtualClassId, virtualClassId),
        eq(lmsVirtualAttendance.studentId, studentId)
      ),
    });

    if (!existing) {
      await db.insert(lmsVirtualAttendance).values({
        virtualClassId,
        studentId,
        status: "Present",
        durationMinutes: Number(body.durationMinutes) || 45,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Présence enregistrée avec succès",
    });
  } catch (e: any) {
    return mobileJsonError(e?.message || "Erreur enregistrement présence", 500);
  }
}
