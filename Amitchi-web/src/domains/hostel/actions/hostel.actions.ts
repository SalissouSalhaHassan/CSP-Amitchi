"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  hostelRooms,
  hostelAllocations,
  hostelNightAttendance,
  hostelExitPermissions,
  hostelVisitorsLog,
} from "@/infrastructure/database/schema/hostel";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── 1. Rooms & Allocations ──────────────────────────────────────────────────

export async function getHostelRooms() {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const data = await readDb.query.hostelRooms.findMany({
      where: eq(hostelRooms.schoolId, schoolId),
      orderBy: [desc(hostelRooms.createdAt)],
    });
    return { data };
  });
}

export async function getHostelAllocations() {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const data = await readDb.query.hostelAllocations.findMany({
      where: eq(hostelAllocations.schoolId, schoolId),
      with: {
        student: true,
        room: true,
      },
      orderBy: [desc(hostelAllocations.createdAt)],
    });
    return { data };
  });
}

export async function saveHostelRoom(data: any, id?: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const payload = {
      ...data,
      schoolId,
    };
    if (id) {
      await db
        .update(hostelRooms)
        .set(payload)
        .where(and(eq(hostelRooms.id, id), eq(hostelRooms.schoolId, schoolId)));
    } else {
      await db.insert(hostelRooms).values(payload);
    }
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function allocateRoom(studentId: number, roomId: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const room = await db.query.hostelRooms.findFirst({
      where: and(eq(hostelRooms.id, roomId), eq(hostelRooms.schoolId, schoolId)),
    });

    if (!room) {
      return { error: "Chambre introuvable" };
    }

    const activeAllocations = await db.query.hostelAllocations.findMany({
      where: and(
        eq(hostelAllocations.roomId, roomId),
        eq(hostelAllocations.status, "Occupé")
      ),
    });

    if (activeAllocations.length >= (room.capacity || 1)) {
      return { error: "Chambre complète" };
    }

    await db.insert(hostelAllocations).values({
      studentId,
      roomId,
      status: "Occupé",
      joinDate: new Date(),
      schoolId,
    });

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function vacateRoom(allocationId: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const alloc = await db.query.hostelAllocations.findFirst({
      where: and(eq(hostelAllocations.id, allocationId), eq(hostelAllocations.schoolId, schoolId)),
    });

    if (!alloc || alloc.status === "Libéré") return { error: "Déjà libéré" };

    await db
      .update(hostelAllocations)
      .set({ status: "Libéré", leaveDate: new Date() })
      .where(and(eq(hostelAllocations.id, allocationId), eq(hostelAllocations.schoolId, schoolId)));

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelRoom(id: number) {
  return protectedDbAction("Hostel", "canDelete", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    await db.delete(hostelRooms).where(and(eq(hostelRooms.id, id), eq(hostelRooms.schoolId, schoolId)));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelAllocation(id: number) {
  return protectedDbAction("Hostel", "canDelete", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    await db.delete(hostelAllocations).where(and(eq(hostelAllocations.id, id), eq(hostelAllocations.schoolId, schoolId)));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

// ─── 2. Nightly Attendance Roll Call ─────────────────────────────────────────

export async function getNightAttendanceList(date: string) {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const records = await readDb.query.hostelNightAttendance.findMany({
      where: and(
        eq(hostelNightAttendance.schoolId, schoolId),
        eq(hostelNightAttendance.date, date)
      ),
      with: {
        student: true,
        room: true,
      },
    });
    return { data: records };
  });
}

export async function recordNightAttendanceAction(records: {
  roomId: number;
  studentId: number;
  date: string;
  time?: string;
  status: string; // 'Présent' | 'Absent non justifié' | 'Permission / Weekend' | 'Infirmerie'
  remarks?: string;
}[]) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    for (const item of records) {
      // Check if record exists for this date and student
      const existing = await db.query.hostelNightAttendance.findFirst({
        where: and(
          eq(hostelNightAttendance.schoolId, schoolId),
          eq(hostelNightAttendance.studentId, item.studentId),
          eq(hostelNightAttendance.date, item.date)
        ),
      });

      let recordId: number;
      if (existing) {
        await db
          .update(hostelNightAttendance)
          .set({
            status: item.status,
            time: item.time || nowTime,
            remarks: item.remarks,
            checkedBy: user.nomPrenom || user.utilisateur || "Surveillant",
          })
          .where(eq(hostelNightAttendance.id, existing.id));
        recordId = existing.id;
      } else {
        const [inserted] = await db
          .insert(hostelNightAttendance)
          .values({
            schoolId,
            roomId: item.roomId,
            studentId: item.studentId,
            date: item.date,
            time: item.time || nowTime,
            status: item.status,
            remarks: item.remarks,
            checkedBy: user.nomPrenom || user.utilisateur || "Surveillant",
          })
          .returning();
        recordId = inserted.id;
      }

      // If Absent non justifié -> send WhatsApp & SMS alert to parent
      if (item.status === "Absent non justifié") {
        try {
          const student = await db.query.students.findFirst({
            where: eq(students.id, item.studentId),
          });
          const room = await db.query.hostelRooms.findFirst({
            where: eq(hostelRooms.id, item.roomId),
          });

          const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;
          if (parentPhone && student) {
            await MessagingService.sendHostelNightAbsenceAlert({
              to: parentPhone,
              whatsapp: (student as any)?.whatsapp || parentPhone,
              parentName: (student as any)?.nomPere || (student as any)?.nomParent || "Parent d'élève",
              studentName: student.nomEtudiant || "L'élève",
              roomNumber: room?.roomNumber || "N/A",
              buildingName: room?.buildingName || "Internat",
              date: item.date,
              time: item.time || nowTime,
              schoolName: "Edut Pro",
              sendSMS: true,
              sendWhatsApp: true,
            });

            await db
              .update(hostelNightAttendance)
              .set({
                parentNotified: true,
                parentNotifiedAt: new Date(),
              })
              .where(eq(hostelNightAttendance.id, recordId));
          }
        } catch (err) {
          console.error("⚠️ Failed to send hostel night absence alert:", err);
        }
      }
    }

    revalidatePath("/dashboard/hostel");
    return { success: true, message: "Appel de nuit enregistré avec succès." };
  });
}

// ─── 3. Exit Passes & Weekend Permissions ─────────────────────────────────────

export async function getHostelExitPermissionsList(status?: string) {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const list = await readDb.query.hostelExitPermissions.findMany({
      where: status && status !== "ALL"
        ? and(eq(hostelExitPermissions.schoolId, schoolId), eq(hostelExitPermissions.status, status))
        : eq(hostelExitPermissions.schoolId, schoolId),
      with: {
        student: true,
        room: true,
      },
      orderBy: [desc(hostelExitPermissions.createdAt)],
    });
    return { data: list };
  });
}

export async function submitHostelExitPermissionAction(data: {
  studentId: number;
  roomId?: number;
  permissionType: string;
  departureDate: string;
  returnDateExpected: string;
  guardianName?: string;
  guardianPhone?: string;
  reason: string;
}) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;

    const [inserted] = await db
      .insert(hostelExitPermissions)
      .values({
        schoolId,
        studentId: data.studentId,
        roomId: data.roomId || null,
        permissionType: data.permissionType,
        departureDate: data.departureDate,
        returnDateExpected: data.returnDateExpected,
        guardianName: data.guardianName || null,
        guardianPhone: data.guardianPhone || null,
        reason: data.reason,
        status: "En attente",
      })
      .returning();

    revalidatePath("/dashboard/hostel");
    return { success: true, id: inserted.id, message: "Demande de sortie enregistrée." };
  });
}

export async function reviewHostelExitPermissionAction(data: {
  permissionId: number;
  decision: "Approuvé" | "Rejeté";
  approvalRemarks?: string;
}) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;

    const perm = await db.query.hostelExitPermissions.findFirst({
      where: and(
        eq(hostelExitPermissions.id, data.permissionId),
        eq(hostelExitPermissions.schoolId, schoolId)
      ),
      with: {
        student: true,
      },
    });

    if (!perm) return { error: "Demande de sortie introuvable." };

    await db
      .update(hostelExitPermissions)
      .set({
        status: data.decision,
        approvedBy: user.nomPrenom || user.utilisateur || "Direction",
        approvalRemarks: data.approvalRemarks || null,
      })
      .where(eq(hostelExitPermissions.id, data.permissionId));

    // Send WhatsApp/SMS alert if approved
    if (data.decision === "Approuvé" && perm.student) {
      const parentPhone = perm.guardianPhone || (perm.student as any)?.mobile || (perm.student as any)?.whatsapp;
      if (parentPhone) {
        try {
          await MessagingService.sendHostelExitAlert({
            to: parentPhone,
            whatsapp: (perm.student as any)?.whatsapp || parentPhone,
            parentName: perm.guardianName || (perm.student as any)?.nomPere || "Parent d'élève",
            studentName: perm.student.nomEtudiant || "L'élève",
            permissionType: perm.permissionType,
            status: "Approuvé",
            departureDate: perm.departureDate,
            returnDateExpected: perm.returnDateExpected,
            schoolName: "Edut Pro",
          });
        } catch (err) {
          console.error("⚠️ Failed to send exit approval alert:", err);
        }
      }
    }

    revalidatePath("/dashboard/hostel");
    return { success: true, message: `Demande de sortie ${data.decision.toLowerCase()} avec succès.` };
  });
}

export async function markHostelExitDepartureAction(permissionId: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const perm = await db.query.hostelExitPermissions.findFirst({
      where: and(
        eq(hostelExitPermissions.id, permissionId),
        eq(hostelExitPermissions.schoolId, schoolId)
      ),
      with: { student: true },
    });

    if (!perm) return { error: "Demande introuvable." };

    await db
      .update(hostelExitPermissions)
      .set({
        status: "Sorti",
        exitTime: nowTime,
      })
      .where(eq(hostelExitPermissions.id, permissionId));

    // Alert parent
    const parentPhone = perm.guardianPhone || (perm.student as any)?.mobile || (perm.student as any)?.whatsapp;
    if (parentPhone && perm.student) {
      try {
        await MessagingService.sendHostelExitAlert({
          to: parentPhone,
          whatsapp: (perm.student as any)?.whatsapp || parentPhone,
          parentName: perm.guardianName || (perm.student as any)?.nomPere || "Parent d'élève",
          studentName: perm.student.nomEtudiant,
          permissionType: perm.permissionType,
          status: "Sorti",
          returnDateExpected: perm.returnDateExpected,
          time: nowTime,
          schoolName: "Edut Pro",
        });
      } catch (err) {}
    }

    revalidatePath("/dashboard/hostel");
    return { success: true, message: "Départ enregistré et parent notifié." };
  });
}

export async function markHostelExitReturnAction(permissionId: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const nowDate = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const perm = await db.query.hostelExitPermissions.findFirst({
      where: and(
        eq(hostelExitPermissions.id, permissionId),
        eq(hostelExitPermissions.schoolId, schoolId)
      ),
      with: { student: true },
    });

    if (!perm) return { error: "Demande introuvable." };

    await db
      .update(hostelExitPermissions)
      .set({
        status: "Retourné",
        actualReturnDate: nowDate,
        returnTime: nowTime,
      })
      .where(eq(hostelExitPermissions.id, permissionId));

    // Alert parent
    const parentPhone = perm.guardianPhone || (perm.student as any)?.mobile || (perm.student as any)?.whatsapp;
    if (parentPhone && perm.student) {
      try {
        await MessagingService.sendHostelExitAlert({
          to: parentPhone,
          whatsapp: (perm.student as any)?.whatsapp || parentPhone,
          parentName: perm.guardianName || (perm.student as any)?.nomPere || "Parent d'élève",
          studentName: perm.student.nomEtudiant,
          permissionType: perm.permissionType,
          status: "Retourné",
          time: nowTime,
          schoolName: "Edut Pro",
        });
      } catch (err) {}
    }

    revalidatePath("/dashboard/hostel");
    return { success: true, message: "Retour sécurisé enregistré et parent notifié." };
  });
}

// ─── 4. Dormitory Visitors Log ────────────────────────────────────────────────

export async function getHostelVisitorsList(visitDate?: string) {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const list = await readDb.query.hostelVisitorsLog.findMany({
      where: visitDate
        ? and(eq(hostelVisitorsLog.schoolId, schoolId), eq(hostelVisitorsLog.visitDate, visitDate))
        : eq(hostelVisitorsLog.schoolId, schoolId),
      with: {
        student: true,
      },
      orderBy: [desc(hostelVisitorsLog.createdAt)],
    });
    return { data: list };
  });
}

export async function recordHostelVisitorAction(data: {
  studentId: number;
  visitorName: string;
  relation: string;
  visitorPhone?: string;
  cnic?: string;
  visitDate: string;
  entryTime: string;
  exitTime?: string;
  purpose?: string;
  remarks?: string;
}) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;

    const [inserted] = await db
      .insert(hostelVisitorsLog)
      .values({
        schoolId,
        studentId: data.studentId,
        visitorName: data.visitorName,
        relation: data.relation || "Parent",
        visitorPhone: data.visitorPhone || null,
        cnic: data.cnic || null,
        visitDate: data.visitDate,
        entryTime: data.entryTime,
        exitTime: data.exitTime || null,
        purpose: data.purpose || "Visite familiale",
        remarks: data.remarks || null,
        recordedBy: user.nomPrenom || user.utilisateur || "Gardien internat",
      })
      .returning();

    revalidatePath("/dashboard/hostel");
    return { success: true, id: inserted.id, message: "Visiteur enregistré." };
  });
}

export async function deleteHostelVisitorAction(id: number) {
  return protectedDbAction("Hostel", "canDelete", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    await db.delete(hostelVisitorsLog).where(and(eq(hostelVisitorsLog.id, id), eq(hostelVisitorsLog.schoolId, schoolId)));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}
