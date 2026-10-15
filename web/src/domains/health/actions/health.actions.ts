"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  studentMedicalRecords,
  infirmaryVisits,
} from "@/infrastructure/database/schema/health";
import { students } from "@/infrastructure/database/schema/students";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, desc, sql, and, gte, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── Health Dashboard Summary ───────────────────────────────────────────────

export async function getHealthDashboardData() {
  return protectedDbAction("Infirmary", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Total records and visits
    const [totalRecordsRes, visitsTodayRes, urgentVisitsRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(studentMedicalRecords)
        .where(schoolId ? eq(studentMedicalRecords.schoolId, schoolId) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(infirmaryVisits)
        .where(
          and(
            schoolId ? eq(infirmaryVisits.schoolId, schoolId) : undefined,
            gte(infirmaryVisits.visitDate, todayStart)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(infirmaryVisits)
        .where(
          and(
            schoolId ? eq(infirmaryVisits.schoolId, schoolId) : undefined,
            or(
              eq(infirmaryVisits.severity, "Urgent"),
              eq(infirmaryVisits.severity, "Urgent / Critique")
            )
          )
        ),
    ]);

    const totalMedicalRecords = Number(totalRecordsRes[0]?.count || 0);
    const visitsToday = Number(visitsTodayRes[0]?.count || 0);
    const urgentCasesCount = Number(urgentVisitsRes[0]?.count || 0);

    // 2. Recent 20 visits with student join
    const recentVisitsRaw = await db
      .select({
        id: infirmaryVisits.id,
        visitDate: infirmaryVisits.visitDate,
        studentId: infirmaryVisits.studentId,
        studentName: students.nomEtudiant,
        studentClass: students.classe,
        admissionNo: students.numAdmission,
        symptoms: infirmaryVisits.symptoms,
        temperature: infirmaryVisits.temperature,
        bloodPressure: infirmaryVisits.bloodPressure,
        heartRate: infirmaryVisits.heartRate,
        diagnosis: infirmaryVisits.diagnosis,
        careProvided: infirmaryVisits.careProvided,
        prescriptions: infirmaryVisits.prescriptions,
        severity: infirmaryVisits.severity,
        outcome: infirmaryVisits.outcome,
        parentNotified: infirmaryVisits.parentNotified,
        nurseName: infirmaryVisits.nurseName,
        notes: infirmaryVisits.notes,
      })
      .from(infirmaryVisits)
      .leftJoin(students, eq(infirmaryVisits.studentId, students.id))
      .where(schoolId ? eq(infirmaryVisits.schoolId, schoolId) : undefined)
      .orderBy(desc(infirmaryVisits.visitDate))
      .limit(30);

    // 3. Students with allergies / chronic conditions count
    const activeAlertsRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentMedicalRecords)
      .where(
        and(
          schoolId ? eq(studentMedicalRecords.schoolId, schoolId) : undefined,
          or(
            sql`length(trim(coalesce(${studentMedicalRecords.allergies}, ''))) > 0`,
            sql`length(trim(coalesce(${studentMedicalRecords.chronicConditions}, ''))) > 0`
          )
        )
      );

    const activeMedicalAlerts = Number(activeAlertsRes[0]?.count || 0);

    return {
      success: true,
      stats: {
        totalMedicalRecords,
        visitsToday,
        urgentCasesCount,
        activeMedicalAlerts,
      },
      recentVisits: recentVisitsRaw,
    };
  });
}

// ─── Visits CRUD & Emergency Alert ──────────────────────────────────────────

export async function createInfirmaryVisitAction(data: {
  studentId: number;
  symptoms: string;
  temperature?: number | null;
  bloodPressure?: string | null;
  heartRate?: number | null;
  diagnosis?: string | null;
  careProvided?: string | null;
  prescriptions?: string | null;
  severity?: string;
  outcome?: string;
  notifyParent?: boolean;
  notes?: string | null;
}) {
  return protectedDbAction("Infirmary", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();

    const student = await db.query.students.findFirst({
      where: eq(students.id, data.studentId),
    });

    if (!student) {
      throw new Error("Élève introuvable pour ce passage à l'infirmerie.");
    }

    const nurseName = (user as any).name || (user as any).nom || user.utilisateur || "Infirmerie Scolaire";
    const nurseId = user.employeeId || null;

    let parentNotified = false;
    let parentNotificationSentAt: Date | null = null;

    // Insert visit
    const [inserted] = await db
      .insert(infirmaryVisits)
      .values({
        schoolId,
        studentId: data.studentId,
        nurseId,
        nurseName,
        symptoms: data.symptoms,
        temperature: data.temperature || null,
        bloodPressure: data.bloodPressure || null,
        heartRate: data.heartRate || null,
        diagnosis: data.diagnosis || null,
        careProvided: data.careProvided || null,
        prescriptions: data.prescriptions || null,
        severity: data.severity || "Bénin",
        outcome: data.outcome || "Retour en classe",
        parentNotified: false,
        notes: data.notes || null,
      })
      .returning();

    // Trigger parent alert if requested or severity is urgent
    if (data.notifyParent || data.severity === "Urgent" || data.severity === "Urgent / Critique") {
      try {
        const studentName = student.nomEtudiant || "l'élève";
        const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

        // 1. Send multi-channel SMS / WhatsApp via MessagingService
        if (parentPhone) {
          await MessagingService.sendInfirmaryAlert({
            to: parentPhone,
            whatsapp: (student as any)?.whatsapp || parentPhone,
            studentName,
            symptoms: data.symptoms,
            temperature: data.temperature,
            severity: data.severity,
            outcome: data.outcome,
            careProvided: data.careProvided || undefined,
            schoolName: "Edut Pro",
            sendSMS: true,
            sendWhatsApp: true,
          });
          parentNotified = true;
          parentNotificationSentAt = new Date();
        }

        // 2. Insert in-app push notification for parents linked to this student
        const linkedParents = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.studentId, data.studentId),
              schoolId ? eq(users.schoolId, schoolId) : undefined
            )
          );

        for (const p of linkedParents) {
          await db.insert(notifications).values({
            userId: p.id,
            title: `🏥 Avis Infirmerie : ${studentName}`,
            content: `Votre enfant a été admis à l'infirmerie pour : ${data.symptoms}. Température : ${data.temperature ? data.temperature + "°C" : "N/A"}. Décision : ${data.outcome || "Retour en classe"}.`,
            type: "ALERTE_SANTE",
            category: "URGENCE",
            isRead: false,
          });
        }

        if (parentNotified) {
          await db
            .update(infirmaryVisits)
            .set({
              parentNotified: true,
              parentNotificationSentAt,
            })
            .where(eq(infirmaryVisits.id, inserted.id));
        }
      } catch (err) {
        console.error("⚠️ Failed to send parent health alert:", err);
      }
    }

    revalidatePath("/dashboard/health");
    return {
      success: true,
      visitId: inserted.id,
      parentNotified,
    };
  });
}

export async function deleteInfirmaryVisitAction(visitId: number) {
  return protectedDbAction("Infirmary", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db
      .delete(infirmaryVisits)
      .where(
        and(
          eq(infirmaryVisits.id, visitId),
          schoolId ? eq(infirmaryVisits.schoolId, schoolId) : undefined
        )
      );
    revalidatePath("/dashboard/health");
    return { success: true };
  });
}

// ─── Student Medical Profile (Fiche Médicale) ───────────────────────────────

export async function getStudentMedicalRecordAction(studentId: number) {
  return protectedDbAction("Infirmary", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        schoolId ? eq(students.schoolId, schoolId) : undefined
      ),
    });

    if (!student) {
      throw new Error("Élève introuvable.");
    }

    let record = await db.query.studentMedicalRecords.findFirst({
      where: eq(studentMedicalRecords.studentId, studentId),
    });

    // If not found, return empty template with student basic info
    if (!record) {
      record = {
        id: 0,
        schoolId: student.schoolId,
        studentId: student.id,
        bloodGroup: null,
        allergies: null,
        chronicConditions: null,
        regularMedications: null,
        vaccinations: [
          { name: "BCG (Tuberculose)", isDone: true, date: "" },
          { name: "Polio (VPO)", isDone: true, date: "" },
          { name: "Pentavalent (DTC-HepB-Hib)", isDone: true, date: "" },
          { name: "Rougeole & Rubéole (RR)", isDone: true, date: "" },
          { name: "Fièvre Jaune (VAA)", isDone: true, date: "" },
          { name: "Méningite A (MenAfriVac)", isDone: false, date: "" },
          { name: "Tétanos", isDone: true, date: "" },
        ],
        emergencyContactName: (student as any)?.nomPere || (student as any)?.nomParent || "",
        emergencyContactPhone: (student as any)?.mobile || (student as any)?.whatsapp || "",
        emergencyContactRelation: "Parent",
        doctorName: null,
        doctorPhone: null,
        heightCm: null,
        weightKg: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Also fetch visit history
    const visitHistory = await db
      .select()
      .from(infirmaryVisits)
      .where(eq(infirmaryVisits.studentId, studentId))
      .orderBy(desc(infirmaryVisits.visitDate))
      .limit(20);

    return {
      success: true,
      student,
      medicalRecord: record,
      visitHistory,
    };
  });
}

export async function saveStudentMedicalRecordAction(data: {
  studentId: number;
  bloodGroup?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  regularMedications?: string | null;
  vaccinations?: any;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  notes?: string | null;
}) {
  return protectedDbAction("Infirmary", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    const existing = await db.query.studentMedicalRecords.findFirst({
      where: eq(studentMedicalRecords.studentId, data.studentId),
    });

    if (existing) {
      await db
        .update(studentMedicalRecords)
        .set({
          bloodGroup: data.bloodGroup || null,
          allergies: data.allergies || null,
          chronicConditions: data.chronicConditions || null,
          regularMedications: data.regularMedications || null,
          vaccinations: data.vaccinations || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          emergencyContactRelation: data.emergencyContactRelation || null,
          doctorName: data.doctorName || null,
          doctorPhone: data.doctorPhone || null,
          heightCm: data.heightCm || null,
          weightKg: data.weightKg || null,
          notes: data.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(studentMedicalRecords.id, existing.id));
    } else {
      await db.insert(studentMedicalRecords).values({
        schoolId,
        studentId: data.studentId,
        bloodGroup: data.bloodGroup || null,
        allergies: data.allergies || null,
        chronicConditions: data.chronicConditions || null,
        regularMedications: data.regularMedications || null,
        vaccinations: data.vaccinations || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContactRelation: data.emergencyContactRelation || null,
        doctorName: data.doctorName || null,
        doctorPhone: data.doctorPhone || null,
        heightCm: data.heightCm || null,
        weightKg: data.weightKg || null,
        notes: data.notes || null,
      });
    }

    revalidatePath("/dashboard/health");
    return { success: true };
  });
}

// ─── Students Medical Directory ─────────────────────────────────────────────

export async function getStudentMedicalDirectoryAction(params?: {
  search?: string;
  bloodGroup?: string;
  className?: string;
}) {
  return protectedDbAction("Infirmary", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const { search, bloodGroup, className } = params || {};

    const whereConditions = [
      schoolId ? eq(students.schoolId, schoolId) : undefined,
      eq(students.statut, "Actif"),
    ];

    if (className) {
      whereConditions.push(eq(students.classe, className));
    }

    if (search && search.trim() !== "") {
      whereConditions.push(
        or(
          ilike(students.nomEtudiant, `%${search.trim()}%`),
          ilike(students.numAdmission, `%${search.trim()}%`)
        )
      );
    }

    const rows = await db
      .select({
        studentId: students.id,
        nomEtudiant: students.nomEtudiant,
        classe: students.classe,
        numAdmission: students.numAdmission,
        sexe: students.sexe,
        dateNaissance: students.dateNaissance,
        telephoneParent: students.mobile,
        bloodGroup: studentMedicalRecords.bloodGroup,
        allergies: studentMedicalRecords.allergies,
        chronicConditions: studentMedicalRecords.chronicConditions,
        heightCm: studentMedicalRecords.heightCm,
        weightKg: studentMedicalRecords.weightKg,
        medicalRecordId: studentMedicalRecords.id,
      })
      .from(students)
      .leftJoin(
        studentMedicalRecords,
        eq(students.id, studentMedicalRecords.studentId)
      )
      .where(and(...whereConditions.filter(Boolean)))
      .orderBy(students.classe, students.nomEtudiant)
      .limit(100);

    if (bloodGroup && bloodGroup !== "ALL") {
      return {
        success: true,
        students: rows.filter((r) => r.bloodGroup === bloodGroup),
      };
    }

    return {
      success: true,
      students: rows,
    };
  });
}
