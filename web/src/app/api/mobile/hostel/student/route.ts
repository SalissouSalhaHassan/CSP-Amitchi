import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import {
  hostelAllocations,
  hostelRooms,
  hostelNightAttendance,
  hostelExitPermissions,
} from "@/infrastructure/database/schema/hostel";
import { students } from "@/infrastructure/database/schema/students";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam ? parseInt(studentIdParam) : (user as any).studentId || null;

  if (!studentId) {
    return NextResponse.json({ success: false, error: "Identifiant élève manquant" }, { status: 400 });
  }

  try {
    // 1. Fetch active room allocation
    const allocation = await readDb.query.hostelAllocations.findFirst({
      where: and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.studentId, studentId),
        eq(hostelAllocations.status, "Occupé")
      ),
      with: {
        room: true,
        student: true,
      },
    });

    // 2. Fetch Roommates if in a room
    let roommates: any[] = [];
    if (allocation?.roomId) {
      const allInRoom = await readDb.query.hostelAllocations.findMany({
        where: and(
          eq(hostelAllocations.schoolId, schoolId),
          eq(hostelAllocations.roomId, allocation.roomId),
          eq(hostelAllocations.status, "Occupé")
        ),
        with: {
          student: true,
        },
      });
      roommates = allInRoom
        .filter((a) => a.studentId !== studentId)
        .map((a) => ({
          id: a.student?.id,
          name: a.student?.nomEtudiant,
          classe: a.student?.classe,
        }));
    }

    // 3. Fetch Nightly Attendance history
    const nightAttendance = await readDb.query.hostelNightAttendance.findMany({
      where: and(
        eq(hostelNightAttendance.schoolId, schoolId),
        eq(hostelNightAttendance.studentId, studentId)
      ),
      orderBy: [desc(hostelNightAttendance.date)],
      limit: 15,
    });

    // 4. Fetch Exit Permissions
    const exitPermissions = await readDb.query.hostelExitPermissions.findMany({
      where: and(
        eq(hostelExitPermissions.schoolId, schoolId),
        eq(hostelExitPermissions.studentId, studentId)
      ),
      orderBy: [desc(hostelExitPermissions.createdAt)],
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        isBoarder: !!allocation,
        allocation: allocation ? {
          id: allocation.id,
          roomId: allocation.roomId,
          roomNumber: allocation.room?.roomNumber,
          buildingName: allocation.room?.buildingName,
          roomType: allocation.room?.roomType,
          capacity: allocation.room?.capacity,
          joinDate: allocation.joinDate,
          status: allocation.status,
        } : null,
        roommates,
        nightAttendance,
        exitPermissions,
      },
    });
  } catch (error: any) {
    console.error("[Mobile Hostel Student API Error]:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
