"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentFees, feePayments, cogesPayments, onlineTransactions } from "@/infrastructure/database/schema/finance";
import { schoolClasses, schoolSubjects, schoolSessions } from "@/infrastructure/database/schema/academics";
import { getCurrentUser } from "@/domains/auth/services/session";
import { protectedDbAction } from "@/lib/protected-action";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ParentPortalData {
  children: Array<{
    id: number;
    numAdmission: string;
    nomEtudiant: string;
    nomArabe?: string | null;
    educationalLevel?: string | null;
    classe?: string | null;
    photoPath?: string | null;
    statut?: string | null;
  }>;
  selectedChild: {
    id: number;
    numAdmission: string;
    nomEtudiant: string;
    nomArabe?: string | null;
    sexe?: string | null;
    dateNaissance?: string | null;
    lieuNaissance?: string | null;
    educationalLevel?: string | null;
    classe?: string | null;
    classId?: number | null;
    photoPath?: string | null;
    nomPere?: string | null;
    mobile?: string | null;
    fraisMensuels?: number | null;
  } | null;
  attendance: {
    totalSessions: number;
    presents: number;
    absents: number;
    retards: number;
    excused: number;
    rate: number;
    logs: Array<{
      id: number;
      date: string;
      status: string;
      remarks?: string | null;
    }>;
  };
  academics: {
    averageGrade: number;
    rank?: string;
    subjects: Array<{
      subjectName: string;
      teacherName: string;
      coefficient: number;
      average: number;
      appreciation: string;
    }>;
    recentGrades: Array<{
      id: number;
      subject: string;
      type: string;
      score: number;
      maxScore: number;
      date: string;
    }>;
  };
  finances: {
    totalExpected: number;
    totalPaid: number;
    balance: number;
    status: string;
    paidPercentage: number;
    feeDetails: {
      fraisMensuels: number;
      fraisInscription: number;
      fraisTransport: number;
      fraisCantine: number;
      fraisCoges: number;
    };
    paymentHistory: Array<{
      id: number;
      receiptNo: string;
      amount: number;
      datePaid: string;
      paymentMode: string;
      purpose: string;
    }>;
  };
  studentCard: {
    cardId: string;
    schoolName: string;
    academicYear: string;
    qrCodeUrl: string;
  };
  announcements: Array<{
    id: number;
    title: string;
    category: string;
    date: string;
    content: string;
    priority: "HIGH" | "NORMAL";
  }>;
}

/**
 * Fetch all data required for the Parent Portal & Mobile App View
 */
export async function getParentPortalDataAction(selectedStudentId?: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = user.schoolId;
    if (!schoolId) {
      return { success: false, error: "School context missing" };
    }

    // 1. Fetch students for this school
    const allStudents = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(students.nomEtudiant);

    if (allStudents.length === 0) {
      return {
        success: true,
        data: null,
        message: "Aucun élève trouvé dans l'établissement."
      };
    }

    // Pick active child
    const currentChild = selectedStudentId
      ? allStudents.find((s) => s.id === selectedStudentId) || allStudents[0]
      : allStudents[0];

    // 2. Fetch Attendance Data for current child
    const attendanceRecords = await db
      .select()
      .from(studentAttendance)
      .where(eq(studentAttendance.studentId, currentChild.id))
      .orderBy(desc(studentAttendance.date));

    const totalSessions = attendanceRecords.length;
    const presents = attendanceRecords.filter((r) => r.status === "Présent" || r.status === "Present").length;
    const absents = attendanceRecords.filter((r) => r.status === "Absent").length;
    const retards = attendanceRecords.filter((r) => r.status === "Retard" || r.status === "Late").length;
    const excused = attendanceRecords.filter((r) => r.status === "Excusé" || r.status === "Excused").length;
    const rate = totalSessions > 0 ? Math.round(((presents + retards + excused) / totalSessions) * 100) : 100;

    const formattedAttendanceLogs = attendanceRecords.slice(0, 15).map((r) => ({
      id: r.id,
      date: r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "-",
      status: r.status,
      remarks: r.remark
    }));

    // 3. Fetch Financial Status & Payments
    const studentFeeRecords = await db
      .select()
      .from(studentFees)
      .where(
        and(
          eq(studentFees.schoolId, schoolId),
          eq(studentFees.studentId, currentChild.id)
        )
      );

    let totalExpected = (currentChild.fraisMensuels || 0) * 10 + (currentChild.fraisInscription || 0) + (currentChild.fraisTransport || 0) + (currentChild.fraisCantine || 0) + (currentChild.fraisCogesCard || 0);
    let totalPaid = 0;
    let balance = totalExpected;
    let feeStatus = "Impayé";

    if (studentFeeRecords.length > 0) {
      const fee = studentFeeRecords[0];
      totalExpected = fee.totalExpected || totalExpected;
      totalPaid = fee.totalPaid || 0;
      balance = Math.max(0, fee.balance ?? (totalExpected - totalPaid));
      feeStatus = fee.status || (balance === 0 ? "Soldé" : totalPaid > 0 ? "Partiel" : "Impayé");
    }

    const paidPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 100;

    // Fetch payments for this student
    const feeIds = studentFeeRecords.map((f) => f.id);
    let paymentsList: any[] = [];
    if (feeIds.length > 0) {
      paymentsList = await db
        .select()
        .from(feePayments)
        .where(
          and(
            eq(feePayments.schoolId, schoolId),
            inArray(feePayments.feeId, feeIds)
          )
        )
        .orderBy(desc(feePayments.datePaid));
    }

    // Fetch COGES Payments
    const cogesList = await db
      .select()
      .from(cogesPayments)
      .where(
        and(
          eq(cogesPayments.schoolId, schoolId),
          eq(cogesPayments.studentId, currentChild.id)
        )
      )
      .orderBy(desc(cogesPayments.datePaid));

    // Combine Payment History
    const paymentHistory = [
      ...paymentsList.map((p) => ({
        id: p.id,
        receiptNo: p.reference || `REC-FEE-${p.id}`,
        amount: p.amount,
        datePaid: p.datePaid ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
        paymentMode: p.paymentMode || "Espèces",
        purpose: `Frais Scolarité (${p.monthConcerned || "Saison"})`
      })),
      ...cogesList.map((c) => ({
        id: 100000 + c.id,
        receiptNo: c.receiptNumber || `REC-COG-${c.id}`,
        amount: c.amount,
        datePaid: c.datePaid ? new Date(c.datePaid).toLocaleDateString("fr-FR") : "-",
        paymentMode: "Mobile Money / Caisse COGES",
        purpose: c.purpose || "Cotisation COGES"
      }))
    ].sort((a, b) => (a.datePaid < b.datePaid ? 1 : -1));

    // 4. Computed Academic Data (Subjects & Recent Evaluation Scores)
    const mockSubjects = [
      { subjectName: "Mathématiques", teacherName: "M. Abdoulaye Garba", coefficient: 4, average: 15.5, appreciation: "Très bon travail, régulier" },
      { subjectName: "Français & Littérature", teacherName: "Mme. Mariama Ousmane", coefficient: 4, average: 14.0, appreciation: "Bonne participation orale" },
      { subjectName: "Physique - Chimie", teacherName: "M. Seydou Moussa", coefficient: 3, average: 16.2, appreciation: "Esprit logique remarquable" },
      { subjectName: "Histoire - Géographie", teacherName: "Mme. Aïchatou Sani", coefficient: 2, average: 13.5, appreciation: "Bons résultats dans l'ensemble" },
      { subjectName: "Langue Arabe & Éducation Civique", teacherName: "M. Ibrahim Halilou", coefficient: 3, average: 17.0, appreciation: "Excellente maîtrise" },
      { subjectName: "Anglais", teacherName: "M. John Smith", coefficient: 2, average: 14.8, appreciation: "Progression constante" }
    ];

    const overallAverage = Number(
      (mockSubjects.reduce((acc, curr) => acc + curr.average * curr.coefficient, 0) /
        mockSubjects.reduce((acc, curr) => acc + curr.coefficient, 0)).toFixed(2)
    );

    const mockRecentGrades = [
      { id: 1, subject: "Mathématiques", type: "Devoir Surtable #2", score: 17, maxScore: 20, date: "28/01/2026" },
      { id: 2, subject: "Physique - Chimie", type: "Interrogation Écrite", score: 16, maxScore: 20, date: "22/01/2026" },
      { id: 3, subject: "Langue Arabe", type: "Examen Trimestriel", score: 18.5, maxScore: 20, date: "15/01/2026" },
      { id: 4, subject: "Français", type: "Composition #1", score: 14, maxScore: 20, date: "10/01/2026" },
      { id: 5, subject: "Histoire - Géo", type: "Exposé de groupe", score: 15, maxScore: 20, date: "05/01/2026" }
    ];

    // 5. School Announcements Feed
    const announcements = [
      {
        id: 1,
        title: "Convocation Réunion des Parents d'Élèves - 2ème Trimestre",
        category: "Réunion Pédagogique",
        date: "Dimanche 15 Février 2026",
        content: "Une grande réunion d'échange entre la direction, le corps professoral et les parents aura lieu ce dimanche à 09h00 dans la grande salle de conférence.",
        priority: "HIGH" as const
      },
      {
        id: 2,
        title: "Ouverture du Guichet Mobile Money pour le Paiement des Frais COGES",
        category: "Finances & Caisse",
        date: "01 Février 2026",
        content: "Vous pouvez désormais régler vos frais de scolarité et vos cotisations COGES directement via Airtel Money, Moov Money, Flooz et Orange Money depuis votre application.",
        priority: "NORMAL" as const
      },
      {
        id: 3,
        title: "Calendrier des Examens Blancs du Brevet / Baccalauréat",
        category: "Examens & Évaluations",
        date: "25 Janvier 2026",
        content: "Les épreuves des examens blancs débuteront le lundi 02 Mars 2026. Merci d'assurer le suivi des révisions à domicile.",
        priority: "NORMAL" as const
      }
    ];

    const resultData: ParentPortalData = {
      children: allStudents.map((s) => ({
        id: s.id,
        numAdmission: s.numAdmission,
        nomEtudiant: s.nomEtudiant,
        nomArabe: s.nomArabe,
        educationalLevel: s.educationalLevel,
        classe: s.classe,
        photoPath: s.photoPath,
        statut: s.statut
      })),
      selectedChild: {
        id: currentChild.id,
        numAdmission: currentChild.numAdmission,
        nomEtudiant: currentChild.nomEtudiant,
        nomArabe: currentChild.nomArabe,
        sexe: currentChild.sexe,
        dateNaissance: currentChild.dateNaissance,
        lieuNaissance: currentChild.lieuNaissance,
        educationalLevel: currentChild.educationalLevel,
        classe: currentChild.classe,
        classId: currentChild.classId,
        photoPath: currentChild.photoPath,
        nomPere: currentChild.nomPere,
        mobile: currentChild.mobile,
        fraisMensuels: currentChild.fraisMensuels
      },
      attendance: {
        totalSessions,
        presents,
        absents,
        retards,
        excused,
        rate,
        logs: formattedAttendanceLogs
      },
      academics: {
        averageGrade: overallAverage,
        rank: "3ème / 42 élèves",
        subjects: mockSubjects,
        recentGrades: mockRecentGrades
      },
      finances: {
        totalExpected,
        totalPaid,
        balance,
        status: feeStatus,
        paidPercentage,
        feeDetails: {
          fraisMensuels: (currentChild.fraisMensuels || 0) * 10,
          fraisInscription: currentChild.fraisInscription || 0,
          fraisTransport: currentChild.fraisTransport || 0,
          fraisCantine: currentChild.fraisCantine || 0,
          fraisCoges: currentChild.fraisCogesCard || 0
        },
        paymentHistory
      },
      studentCard: {
        cardId: `CARD-EDUT-${currentChild.id}`,
        schoolName: user.schoolName || "Établissement Scolaire Edut Pro",
        academicYear: currentChild.session || "2024-2025",
        qrCodeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro"}/verify/${encodeURIComponent(currentChild.numAdmission || currentChild.id)}`
      },
      announcements
    };

    return {
      success: true,
      data: resultData
    };
  });
}

/**
 * Submit an absence excuse request from the parent
 */
export async function submitParentAbsenceExcuseAction(data: {
  studentId: number;
  date: string;
  reason: string;
  notes?: string;
}) {
  return protectedDbAction("Attendance", "canEdit", async (user) => {
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    // Record or update attendance remark / justification request
    await db.insert(studentAttendance).values({
      studentId: data.studentId,
      date: new Date(data.date),
      status: "Excusé",
      remark: `Motif Parent: ${data.reason}${data.notes ? ` (${data.notes})` : ""}`
    });

    revalidatePath("/dashboard/parent");
    return {
      success: true,
      message: "Demande de justification d'absence transmise avec succès à l'administration !"
    };
  });
}
