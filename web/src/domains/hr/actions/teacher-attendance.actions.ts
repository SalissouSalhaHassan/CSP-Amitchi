"use server";

import { db } from "@/infrastructure/database";
import { teacherSessionAttendance } from "@/infrastructure/database/schema/attendance";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolClasses, schoolSubjects, timetableEntries, timetableSettings } from "@/infrastructure/database/schema/academics";
import { eq, and, sql, inArray, desc, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType, getTeacherEmployee, checkEducationalLevelAccess, getCompatibleLevels } from "@/domains/auth/services/rbac";

// Helper to map JS day index to French day names used in timetable_entries.dayName
function getDayName(dayIndex: number): string {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  return days[dayIndex] || "Lundi";
}

// Helper to generate dates in a range
function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const curr = new Date(startDate);
  // Normalize hours
  curr.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Loads a teacher's schedule and matches it with actual session attendances.
 */
export async function getTeacherScheduleAttendance(
  employeeId: number,
  filterType: "day" | "week" | "month" | "year",
  dateStr: string
) {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    let targetId = employeeId;
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp || emp.id !== employeeId) {
        throw new Error("Non autorisé à voir l'emploi du temps d'un autre enseignant.");
      }
      targetId = emp.id;
    }

    const baseDate = new Date(dateStr);
    let startDate = new Date(baseDate);
    let endDate = new Date(baseDate);

    if (filterType === "day") {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filterType === "week") {
      // Find Monday
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startDate = new Date(baseDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filterType === "month") {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // year
      startDate = new Date(baseDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    // 1. Fetch timetable entries for this teacher
    const timetable = await db.query.timetableEntries.findMany({
      where: eq(timetableEntries.employeeId, targetId),
      with: {
        class: true,
        subject: true,
      },
    });

    // 2. Fetch actual attendance scans in the date range
    const scans = await db.query.teacherSessionAttendance.findMany({
      where: and(
        eq(teacherSessionAttendance.employeeId, targetId),
        sql`DATE(${teacherSessionAttendance.date}) >= DATE(${startDate.toISOString()})`,
        sql`DATE(${teacherSessionAttendance.date}) <= DATE(${endDate.toISOString()})`
      ),
    });

    // Create a lookup map for attendance: "YYYY-MM-DD_periodNumber"
    const attendanceMap = new Map();
    scans.forEach((scan) => {
      if (scan.date) {
        const dStr = scan.date.toISOString().split("T")[0];
        const key = `${dStr}_${scan.periodNumber}_${scan.classId}`;
        attendanceMap.set(key, scan);
      }
    });

    // 3. Expand the schedule for all dates in the range
    const dates = getDatesInRange(startDate, endDate);
    const slots: any[] = [];

    dates.forEach((date) => {
      const dayName = getDayName(date.getDay());
      // Filter entries scheduled for this day name
      const dailyTimetable = timetable.filter((t) => t.dayName === dayName);

      dailyTimetable.forEach((entry) => {
        const dStr = date.toISOString().split("T")[0];
        const key = `${dStr}_${entry.periodNumber}_${entry.classId}`;
        const match = attendanceMap.get(key);

        let status = "Absent"; // Default if past
        let scannedAt = null;
        let scanMethod = null;
        let remarques = "";
        let attendanceRecordId = null;

        if (match) {
          status = match.status;
          scannedAt = match.scannedAt;
          scanMethod = match.scanMethod;
          remarques = match.remarques;
          attendanceRecordId = match.id;
        } else {
          // If the date is today or in the future
          const todayStr = new Date().toISOString().split("T")[0];
          if (dStr > todayStr) {
            status = "Planifié"; // Future
          } else if (dStr === todayStr) {
            // Check if period time is in the future
            // For now, let's keep it simple: if no scan yet today, it could be "En attente"
            status = "Planifié";
          }
        }

        slots.push({
          date: new Date(date),
          dateStr: dStr,
          dayName,
          periodNumber: entry.periodNumber,
          classId: entry.classId,
          className: entry.class?.className || "Classe inconnue",
          subjectName: entry.subject?.subjectName || "Matière inconnue",
          subjectCode: entry.subject?.subjectCode || "",
          roomName: entry.roomName || "Non spécifiée",
          timetableEntryId: entry.id,
          status,
          scannedAt,
          scanMethod,
          remarques,
          attendanceRecordId,
        });
      });
    });

    // Sort slots chronologically
    slots.sort((a, b) => {
      if (a.dateStr !== b.dateStr) {
        return a.dateStr.localeCompare(b.dateStr);
      }
      return a.periodNumber - b.periodNumber;
    });

    // Calculate stats
    const totalSlots = slots.length;
    const attended = slots.filter((s) => s.status === "Présent" || s.status === "En Retard").length;
    const absent = slots.filter((s) => s.status === "Absent").length;
    const late = slots.filter((s) => s.status === "En Retard").length;
    const rate = totalSlots > 0 ? Math.round((attended / totalSlots) * 100) : 100;

    return {
      slots,
      stats: {
        total: totalSlots,
        attended,
        absent,
        late,
        rate,
      },
    };
  });
}

/**
 * Records a presence check-in for a teacher when scanning a class QR code.
 */
export async function recordTeacherSessionScan(classId: number, employeeId: number) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    let targetEmployeeId = employeeId;
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) {
        throw new Error("Compte enseignant non configuré ou non lié.");
      }
      targetEmployeeId = emp.id;
    }

    const now = new Date();
    const todayDayName = getDayName(now.getDay());

    // 1. Get today's timetable entries for this class and teacher
    const todayEntries = await db.query.timetableEntries.findMany({
      where: and(
        eq(timetableEntries.classId, classId),
        eq(timetableEntries.employeeId, targetEmployeeId),
        eq(timetableEntries.dayName, todayDayName)
      ),
      with: {
        subject: true,
        class: true,
      },
    });

    if (todayEntries.length === 0) {
      return {
        success: false,
        error: "Aucune séance de cours n'est programmée pour vous dans cette classe aujourd'hui (" + todayDayName + ").",
      };
    }

    // Get classroom settings to evaluate period times
    const settings = await db.query.timetableSettings.findFirst({
      where: isNull(timetableSettings.classId),
    });

    const dayStartStr = settings?.dayStart || "08:00";
    const periodDuration = settings?.periodDuration || 60; // in minutes
    const recessAfter = settings?.recessAfter || 3;
    const recessDuration = settings?.recessDuration || 30; // in minutes

    // Parse day start
    const [startH, startM] = dayStartStr.split(":").map(Number);
    const startMinutes = startH * 60 + startM;

    // Helper to calculate period start/end in minutes from midnight
    function getPeriodRange(period: number) {
      let offset = (period - 1) * periodDuration;
      if (period > recessAfter) {
        offset += recessDuration;
      }
      return {
        start: startMinutes + offset,
        end: startMinutes + offset + periodDuration,
      };
    }

    // Determine current time in minutes from midnight
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find if there is a session active right now, or near right now (+/- 30 minutes)
    let resolvedEntry = todayEntries[0];
    let minDiff = Infinity;

    todayEntries.forEach((entry) => {
      const { start, end } = getPeriodRange(entry.periodNumber);
      // If current time is within period start-15 mins and end+15 mins
      if (currentMinutes >= start - 20 && currentMinutes <= end + 20) {
        resolvedEntry = entry;
        minDiff = 0;
      } else {
        const diff = Math.min(
          Math.abs(currentMinutes - start),
          Math.abs(currentMinutes - end)
        );
        if (diff < minDiff) {
          minDiff = diff;
          resolvedEntry = entry;
        }
      }
    });

    // Check if attendance already recorded for this slot today
    const todayStr = now.toISOString().split("T")[0];
    const existing = await db.query.teacherSessionAttendance.findFirst({
      where: and(
        eq(teacherSessionAttendance.employeeId, targetEmployeeId),
        eq(teacherSessionAttendance.classId, classId),
        eq(teacherSessionAttendance.periodNumber, resolvedEntry.periodNumber),
        sql`DATE(${teacherSessionAttendance.date}) = DATE(${now.toISOString()})`
      ),
    });

    if (existing) {
      return {
        success: true,
        alreadyRecorded: true,
        entry: {
          periodNumber: resolvedEntry.periodNumber,
          subjectName: resolvedEntry.subject?.subjectName,
          className: resolvedEntry.class?.className,
          scannedAt: existing.scannedAt,
        },
      };
    }

    // Insert attendance
    await db.insert(teacherSessionAttendance).values({
      schoolId,
      employeeId: targetEmployeeId,
      classId: classId,
      subjectId: resolvedEntry.subjectId,
      timetableEntryId: resolvedEntry.id,
      date: now,
      periodNumber: resolvedEntry.periodNumber,
      status: "Présent",
      scanMethod: "QR_CODE",
      scannedAt: now,
    });

    revalidatePath("/dashboard/hr/attendance/teacher/" + targetEmployeeId);
    revalidatePath("/dashboard/hr/reports");

    return {
      success: true,
      entry: {
        periodNumber: resolvedEntry.periodNumber,
        subjectName: resolvedEntry.subject?.subjectName,
        className: resolvedEntry.class?.className,
        scannedAt: now,
      },
    };
  });
}

/**
 * Manually saves/overrides teacher session attendance (e.g. by HR).
 */
export async function saveManualTeacherSessionAttendance(data: {
  employeeId: number;
  classId: number;
  subjectId?: number;
  timetableEntryId?: number;
  dateStr: string;
  periodNumber: number;
  status: string;
  remarques?: string;
}) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      throw new Error("Non autorisé.");
    }

    const targetDate = new Date(data.dateStr);

    const existing = await db.query.teacherSessionAttendance.findFirst({
      where: and(
        eq(teacherSessionAttendance.employeeId, data.employeeId),
        eq(teacherSessionAttendance.classId, data.classId),
        eq(teacherSessionAttendance.periodNumber, data.periodNumber),
        sql`DATE(${teacherSessionAttendance.date}) = DATE(${targetDate.toISOString()})`
      ),
    });

    if (existing) {
      await db
        .update(teacherSessionAttendance)
        .set({
          status: data.status,
          remarques: data.remarques || "",
          scanMethod: "MANUAL",
        })
        .where(eq(teacherSessionAttendance.id, existing.id));
    } else {
      await db.insert(teacherSessionAttendance).values({
        schoolId,
        employeeId: data.employeeId,
        classId: data.classId,
        subjectId: data.subjectId || null,
        timetableEntryId: data.timetableEntryId || null,
        date: targetDate,
        periodNumber: data.periodNumber,
        status: data.status,
        remarques: data.remarques || "",
        scanMethod: "MANUAL",
        scannedAt: new Date(),
      });
    }

    revalidatePath("/dashboard/hr/attendance/teacher/" + data.employeeId);
    revalidatePath("/dashboard/hr/reports");
    return { success: true };
  });
}

/**
 * Loads HR Report Center teacher data.
 */
export async function getHRReportCenterData(
  filterType: "day" | "week" | "month" | "year",
  dateStr: string
) {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      throw new Error("Non autorisé.");
    }

    // Filter by level director's level
    let empWhere = eq(employees.schoolId, schoolId);
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      empWhere = and(
        empWhere,
        or(
          inArray(employees.educationalLevel, compatibleLevels),
          isNull(employees.educationalLevel),
          sql`string_to_array(${employees.educationalLevel}, ',') && ${compatibleLevels}::text[]`
        )
      ) as any;
    }

    // Get all employees
    const allEmployees = await db.query.employees.findMany({
      where: empWhere,
    });

    const baseDate = new Date(dateStr);
    let startDate = new Date(baseDate);
    let endDate = new Date(baseDate);

    if (filterType === "day") {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filterType === "week") {
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(baseDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filterType === "month") {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(baseDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    // Get timetable entries
    const empIds = allEmployees.map((e) => e.id);
    if (empIds.length === 0) {
      return {
        teachers: [],
        stats: {
          totalTeachers: 0,
          totalScheduled: 0,
          totalAttended: 0,
          totalAbsent: 0,
          overallRate: 100,
        },
      };
    }

    const timetable = await db.query.timetableEntries.findMany({
      where: inArray(timetableEntries.employeeId, empIds),
    });

    // Get attendance scans
    const scans = await db.query.teacherSessionAttendance.findMany({
      where: and(
        inArray(teacherSessionAttendance.employeeId, empIds),
        sql`DATE(${teacherSessionAttendance.date}) >= DATE(${startDate.toISOString()})`,
        sql`DATE(${teacherSessionAttendance.date}) <= DATE(${endDate.toISOString()})`
      ),
    });

    // Lookup map
    const attendanceMap = new Map();
    scans.forEach((scan) => {
      if (scan.date) {
        const dStr = scan.date.toISOString().split("T")[0];
        const key = `${scan.employeeId}_${dStr}_${scan.periodNumber}_${scan.classId}`;
        attendanceMap.set(key, scan);
      }
    });

    const dates = getDatesInRange(startDate, endDate);
    const teacherStatsMap = new Map();

    allEmployees.forEach((emp) => {
      teacherStatsMap.set(emp.id, {
        id: emp.id,
        nom: emp.nom,
        empId: emp.empId,
        poste: emp.poste || "Enseignant",
        departement: emp.departement || "Général",
        email: emp.email,
        mobile: emp.mobile,
        scheduled: 0,
        attended: 0,
        absent: 0,
        late: 0,
      });
    });

    dates.forEach((date) => {
      const dayName = getDayName(date.getDay());
      const dailyTimetable = timetable.filter((t) => t.dayName === dayName);

      dailyTimetable.forEach((entry) => {
        if (!entry.employeeId) return;
        const stats = teacherStatsMap.get(entry.employeeId);
        if (!stats) return;

        const dStr = date.toISOString().split("T")[0];
        const key = `${entry.employeeId}_${dStr}_${entry.periodNumber}_${entry.classId}`;
        const match = attendanceMap.get(key);

        stats.scheduled += 1;

        if (match) {
          if (match.status === "Présent" || match.status === "En Retard") {
            stats.attended += 1;
            if (match.status === "En Retard") stats.late += 1;
          } else {
            stats.absent += 1;
          }
        } else {
          // Check if slot is in the past
          const todayStr = new Date().toISOString().split("T")[0];
          if (dStr < todayStr) {
            stats.absent += 1;
          }
        }
      });
    });

    // Compile list
    const teachers: any[] = [];
    let globalScheduled = 0;
    let globalAttended = 0;
    let globalAbsent = 0;

    teacherStatsMap.forEach((stats) => {
      const rate = stats.scheduled > 0 ? Math.round((stats.attended / stats.scheduled) * 100) : 100;
      teachers.push({
        ...stats,
        rate,
      });

      globalScheduled += stats.scheduled;
      globalAttended += stats.attended;
      globalAbsent += stats.absent;
    });

    const overallRate = globalScheduled > 0 ? Math.round((globalAttended / globalScheduled) * 100) : 100;

    return {
      teachers,
      stats: {
        totalTeachers: allEmployees.length,
        totalScheduled: globalScheduled,
        totalAttended: globalAttended,
        totalAbsent: globalAbsent,
        overallRate,
      },
    };
  });
}
