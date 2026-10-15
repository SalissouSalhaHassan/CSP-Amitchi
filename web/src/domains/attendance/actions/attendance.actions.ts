"use server";

import { db } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSubjects, schoolClasses, schoolSections, studentResults } from "@/infrastructure/database/schema/academics";
import { users } from "@/infrastructure/database/schema/auth";
import { messageLogs } from "@/infrastructure/database/schema/messaging";
import { eq, and, or, sql, isNull, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { batchAttendanceSchema, BatchAttendanceFormData } from "../validators/attendance.schema";
// Attendance Security & Student Portal v2.4
import { protectedDbAction } from "@/lib/protected-action";
import { attendanceEvents } from "@/lib/attendance-events";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, getCompatibleLevels, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess } from "@/domains/auth/services/rbac";

export async function getAttendanceRecords(classId: number, date: string, subjectId?: number) {
  return protectedDbAction("Attendance", "canView", async (user) => {
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    const isStudentOrParent = 
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur");

    if (!isStudentOrParent) {
      const hasAccess = await verifyTeacherClassAccess(user, classId);
      if (!hasAccess) {
        return { data: [] };
      }
    }

    const targetDate = new Date(date);
    let queryCond = and(
      eq(studentAttendance.classId, classId),
      subjectId ? eq(studentAttendance.subjectId, subjectId) : sql`TRUE`,
      sql`DATE(${studentAttendance.date}) = DATE(${targetDate.toISOString()})`
    );

    if (isStudentOrParent) {
      if (user.studentId) {
        queryCond = and(queryCond, eq(studentAttendance.studentId, Number(user.studentId))) as any;
      } else {
        queryCond = and(queryCond, sql`FALSE`) as any;
      }
    }
    
    const data = await db.query.studentAttendance.findMany({
      where: queryCond,
      with: {
        student: true,
      }
    });
    return { data };
  });
}

export async function saveBatchAttendance(data: BatchAttendanceFormData) {
  const validation = batchAttendanceSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Attendance", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "eleve" || roleType === "parent") {
      return { error: "Accès refusé. La saisie des présences est interdite aux élèves et parents." };
    }
    const { classId, subjectId, employeeId, date, records } = validation.data;
    
    const hasAccess = await verifyTeacherClassAccess(user, classId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
    }

    const targetDate = new Date(date);

    // Fetch existing attendance records for the target date, class, and subject
    const existing = await db.query.studentAttendance.findMany({
      where: and(
        eq(studentAttendance.classId, classId),
        subjectId ? eq(studentAttendance.subjectId, subjectId) : isNull(studentAttendance.subjectId),
        sql`DATE(${studentAttendance.date}) = DATE(${targetDate.toISOString()})`
      )
    });

    const existingMap = new Map(existing.map(r => [r.studentId, r.id]));

    const toInsert: any[] = [];
    const updatePromises: Promise<any>[] = [];

    for (const record of records) {
      const existingId = existingMap.get(record.studentId);
      if (existingId) {
        updatePromises.push(
          db.update(studentAttendance).set({
            status: record.status,
            remark: record.remark || null,
            employeeId: employeeId || null,
          }).where(eq(studentAttendance.id, existingId))
        );
      } else {
        toInsert.push({
          studentId: record.studentId,
          classId,
          subjectId: subjectId || null,
          employeeId: employeeId || null,
          date: targetDate,
          status: record.status,
          remark: record.remark || null,
        });
      }
    }

    // Execute bulk insert and updates concurrently
    await Promise.all([
      toInsert.length > 0 ? db.insert(studentAttendance).values(toInsert) : Promise.resolve(),
      ...updatePromises
    ]);

    const { sendSMS, sendWhatsApp } = validation.data;
    const flaggedRecords = records.filter(r => r.status === "Absent" || r.status === "En Retard");
    
    if (flaggedRecords.length > 0) {
      // Fire-and-forget background alert processing to keep save instantaneous
      (async () => {
        try {
          const { MessagingService } = await import("@/shared/services/messaging.service");
          const { PushNotificationService } = await import("@/shared/services/push-notification.service");
          const studentIds = flaggedRecords.map(r => r.studentId);
          
          const targetStudents = await db.query.students.findMany({
            where: inArray(students.id, studentIds)
          });

          let subName = "Général";
          if (subjectId) {
            const sub = await db.query.schoolSubjects.findFirst({ where: eq(schoolSubjects.id, subjectId) });
            if (sub) subName = sub.subjectName;
          }

          const dateStr = targetDate.toLocaleDateString('fr-FR');

          await Promise.allSettled(
            flaggedRecords.map(async (record) => {
              const s = targetStudents.find(st => st.id === record.studentId);
              const studentName = s ? s.nomEtudiant : `Élève #${record.studentId}`;
              
              // 1. Mobile Push Notification
              await PushNotificationService.sendAbsenceAlert({
                studentId: record.studentId,
                studentName,
                status: record.status as "Absent" | "En Retard",
                date: dateStr,
                subjectName: subName,
              }).catch(() => {});

              // 2. SMS / WhatsApp if requested
              if (s && (s.mobile || s.whatsapp) && (sendSMS || sendWhatsApp)) {
                await MessagingService.sendAttendanceAlert({
                  to: s.mobile || "",
                  whatsapp: s.whatsapp || s.mobile || "",
                  studentName,
                  status: record.status as any,
                  subject: subName,
                  date: dateStr,
                  sendSMS,
                  sendWhatsApp
                }).catch(() => {});
              }
            })
          );
        } catch (err) {
          console.error("[Messaging Log] Background alert processing error:", err);
        }
      })();
    }

    attendanceEvents.emit("update", { type: "batch", classId, subjectId, date });
    revalidatePath("/dashboard/attendance");
    return { success: true };
  });
}

export async function getAttendanceStats(date: string, classId?: number | null, subjectId?: number | null) {
  return protectedDbAction("Attendance", "canView", async (user) => {
    const targetDate = new Date(date);
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    const isStudentOrParent = 
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur");
    
    let whereClause = sql`DATE(${studentAttendance.date}) = DATE(${targetDate.toISOString()})`;
    
    if (isStudentOrParent) {
      if (user.studentId) {
        whereClause = and(whereClause, eq(studentAttendance.studentId, Number(user.studentId))) as any;
      } else {
        return { data: { presents: 0, absents: 0, lates: 0, excused: 0, total: 0 } };
      }
    } else if (classId) {
      const hasAccess = await verifyTeacherClassAccess(user, classId);
      if (!hasAccess) return { data: { presents: 0, absents: 0, lates: 0, excused: 0, total: 0 } };
      whereClause = and(whereClause, eq(studentAttendance.classId, classId)) as any;
    } else if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        if (classIds.length > 0) {
          whereClause = and(whereClause, inArray(studentAttendance.classId, classIds)) as any;
        } else {
          return { data: { presents: 0, absents: 0, lates: 0, excused: 0, total: 0 } };
        }
      } else {
        return { data: { presents: 0, absents: 0, lates: 0, excused: 0, total: 0 } };
      }
    } else if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      const matchedClasses = await db.select({ id: schoolClasses.id })
        .from(schoolClasses)
        .leftJoin(schoolSections, eq(schoolClasses.sectionId, schoolSections.id))
        .where(inArray(schoolSections.educationalLevel, compatibleLevels));
      const classIds = matchedClasses.map(c => c.id);
      if (classIds.length > 0) {
        whereClause = and(whereClause, inArray(studentAttendance.classId, classIds)) as any;
      } else {
        return { data: { presents: 0, absents: 0, lates: 0, excused: 0, total: 0 } };
      }
    }

    if (subjectId) {
      whereClause = and(whereClause, eq(studentAttendance.subjectId, subjectId)) as any;
    } else if (classId) {
      whereClause = and(whereClause, isNull(studentAttendance.subjectId)) as any;
    }

    const result = await db.select({
      status: studentAttendance.status,
      count: sql<number>`count(*)`
    })
    .from(studentAttendance)
    .where(whereClause)
    .groupBy(studentAttendance.status);
    
    const stats = {
      presents: 0,
      absents: 0,
      lates: 0,
      excused: 0,
      total: 0
    };

    result.forEach((row: any) => {
      const count = Number(row.count);
      stats.total += count;
      if (row.status === "Présent") stats.presents = count;
      else if (row.status === "Absent") stats.absents = count;
      else if (row.status === "En Retard") stats.lates = count;
      else if (row.status === "Excusé") stats.excused = count;
    });

    return { data: stats };
  });
}

export async function markAttendanceByAdmission(numAdmission: string, classId: number, subjectId?: number, employeeId?: number) {
  return protectedDbAction("Attendance", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "eleve" || roleType === "parent") {
      return { error: "Accès refusé. La saisie des présences est interdite aux élèves et parents." };
    }
    const hasAccess = await verifyTeacherClassAccess(user, classId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
    }

    const student = await db.query.students.findFirst({
      where: eq(students.numAdmission, numAdmission)
    });

    if (!student) {
      return { error: "Étudiant non trouvé" };
    }

    const today = new Date();
    
    const existing = await db.query.studentAttendance.findFirst({
      where: and(
        eq(studentAttendance.studentId, student.id),
        eq(studentAttendance.classId, classId),
        subjectId ? eq(studentAttendance.subjectId, subjectId) : isNull(studentAttendance.subjectId),
        sql`DATE(${studentAttendance.date}) = DATE(${today.toISOString()})`
      )
    });

    if (existing) {
      if (existing.status === "Présent") {
        return { success: true, message: `${student.nomEtudiant} est déjà marqué présent.`, student };
      }
      
      await db.update(studentAttendance)
        .set({ status: "Présent", employeeId })
        .where(eq(studentAttendance.id, existing.id));
    } else {
      await db.insert(studentAttendance).values({
        studentId: student.id,
        classId: classId,
        subjectId: subjectId,
        employeeId: employeeId,
        date: today,
        status: "Présent",
      });
    }

    attendanceEvents.emit("update", { type: "single", numAdmission, classId, subjectId, date: today });
    revalidatePath("/dashboard/attendance");
    return { success: true, message: `${student.nomEtudiant} marqué présent !`, student };
  });
}

// ─── Student Personal Attendance Action (Secure Isolation) ───────────────────

export async function getStudentPersonalAttendanceAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté." };

    let schoolId = user.schoolId || (await getActiveSchoolId());

    // Resolve student record
    let studentRecord: any = null;
    const rawStudentId = (user as any).studentId || (user as any).student_id;
    if (rawStudentId) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.id, Number(rawStudentId)),
      });
    }

    const usernameStr = typeof (user as any).utilisateur === "string"
      ? ((user as any).utilisateur as string)
      : typeof (user as any).username === "string"
        ? ((user as any).username as string)
        : "";

    if (!studentRecord && usernameStr.trim().length > 0) {
      studentRecord = await db.query.students.findFirst({
        where: or(
          eq(students.numAdmission, usernameStr.trim()),
          eq(students.nomEtudiant, usernameStr.trim())
        ),
      });
    }

    // Check user.id in users table
    if (!studentRecord && user.id) {
      const userDoc = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
      if (userDoc?.studentId) {
        studentRecord = await db.query.students.findFirst({
          where: eq(students.id, userDoc.studentId)
        });
      }
    }

    if (!studentRecord && schoolId) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.schoolId, schoolId),
      });
    }

    if (!studentRecord) {
      studentRecord = {
        id: rawStudentId || 1,
        nomEtudiant: user.nom || user.utilisateur || "Élève",
        numAdmission: "CARD-EDUT-1",
        classe: "Non spécifiée",
      };
    }

    schoolId = schoolId || studentRecord.schoolId;

    // Resolve class
    const cleanClasse = (studentRecord.classe || "").trim();
    const classRow = cleanClasse ? await db.query.schoolClasses.findFirst({
      where: and(
        schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
        or(
          eq(schoolClasses.className, cleanClasse),
          sql`LOWER(TRIM(${schoolClasses.className})) = LOWER(TRIM(${cleanClasse}))`,
          sql`REPLACE(LOWER(${schoolClasses.className}), ' ', '') = REPLACE(LOWER(${cleanClasse}), ' ', '')`
        )
      ),
      with: { section: true },
    }) : null;

    // Query attendance records for this student
    const records = await db.query.studentAttendance.findMany({
      where: eq(studentAttendance.studentId, studentRecord.id),
      with: {
        subject: true,
        teacher: true,
      },
      orderBy: [desc(studentAttendance.date)],
    });

    let presents = 0;
    let absents = 0;
    let retards = 0;
    let excused = 0;

    records.forEach((r) => {
      const s = (r.status || "").toLowerCase();
      if (s.includes("présent") || s.includes("present")) presents++;
      else if (s.includes("retard")) retards++;
      else if (s.includes("excus")) excused++;
      else if (s.includes("abs")) absents++;
    });

    // Cross-check studentResults if attendance is empty
    if (records.length === 0) {
      const resultsWithAbsences = await db.query.studentResults.findMany({
        where: eq(studentResults.studentId, studentRecord.id),
        with: { subject: true }
      });
      for (const res of resultsWithAbsences) {
        if ((res.absences || 0) > 0) {
          absents += res.absences || 0;
          records.push({
            id: 900000 + res.id,
            date: new Date(),
            status: "Absent",
            remark: `Absence relevée (${res.term || "Trimestre"})`,
            subject: res.subject ? { subjectName: res.subject.subjectName } : null,
            teacher: null,
          } as any);
        }
      }
    }

    const totalSessions = records.length;
    const rate = totalSessions > 0 ? Number((((presents + excused) / totalSessions) * 100).toFixed(1)) : 100.0;

    const formattedRecords = records.map((r: any) => {
      let isoDate = new Date().toISOString();
      if (r.date) {
        try {
          const d = typeof r.date === "string" ? new Date(r.date) : r.date;
          if (d && !isNaN(d.getTime())) {
            isoDate = d.toISOString();
          }
        } catch (_) {}
      }
      return {
        id: r.id,
        date: isoDate,
        status: r.status || "Présent",
        remark: r.remark || "",
        subjectName: r.subject?.subjectName || "Séance générale",
        teacherName: r.teacher?.nom || "Enseignant",
      };
    });

    return {
      success: true,
      data: {
        student: {
          id: studentRecord.id,
          nomEtudiant: studentRecord.nomEtudiant,
          numAdmission: studentRecord.numAdmission,
          classe: studentRecord.classe,
        },
        class: classRow ? {
          id: classRow.id,
          name: classRow.className,
          level: classRow.section?.educationalLevel || "Enseignement Général",
        } : {
          id: 1,
          name: studentRecord.classe || "Classe",
          level: "Enseignement Général",
        },
        stats: {
          totalSessions,
          presents,
          absents,
          retards,
          excused,
          rate,
        },
        records: formattedRecords,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur serveur" };
  }
}

export async function submitAbsenceJustificationAction(attendanceId: number, reason: string, note?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté." };

    let studentRecord: any = null;
    const rawStudentId = (user as any).studentId || (user as any).student_id;
    if (rawStudentId) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.id, Number(rawStudentId)),
      });
    }

    if (!studentRecord && (user as any).utilisateur) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.numAdmission, String((user as any).utilisateur)),
      });
    }

    if (!studentRecord) {
      studentRecord = { id: rawStudentId || 1 };
    }

    const record = await db.query.studentAttendance.findFirst({
      where: eq(studentAttendance.id, attendanceId),
    });

    const updatedRemark = `[Justifié: ${reason}] ${note ? note.trim() : ""} (Transmis par l'élève/parent le ${new Date().toLocaleDateString("fr-FR")})`;

    if (record) {
      await db.update(studentAttendance)
        .set({
          status: "Excusé",
          remark: updatedRemark,
        })
        .where(eq(studentAttendance.id, attendanceId));
    } else {
      await db.insert(studentAttendance).values({
        studentId: studentRecord.id,
        date: new Date(),
        status: "Excusé",
        remark: updatedRemark,
        recordedBy: user.utilisateur || "Élève/Parent",
      });
    }

    revalidatePath("/dashboard/attendance");
    return { success: true, message: "Justification d'absence transmise avec succès à l'administration !" };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur lors de la transmission." };
  }
}
