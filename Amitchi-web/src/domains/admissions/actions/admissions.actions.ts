"use server";

import { db, readDb } from "@/infrastructure/database";
import { admissionApplications } from "@/infrastructure/database/schema/admissions";
import { students } from "@/infrastructure/database/schema/students";
import { studentMedicalRecords } from "@/infrastructure/database/schema/health";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, desc, and, sql, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId, getCurrentSchool } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";
import { ensureStudentFeeRecord } from "@/domains/finance/actions/finance.actions";

import { UNIVERSITY_FACULTIES } from "@/domains/admissions/constants/admissions.constants";

// ─── 1. Public School Info, University Faculties & Classes ────────────────────

export async function getPublicSchoolInfoForAdmissionsAction(schoolSlugOrId?: string | number) {
  try {
    let school: any = null;

    if (schoolSlugOrId) {
      if (typeof schoolSlugOrId === "number" || !isNaN(Number(schoolSlugOrId))) {
        school = await readDb.query.schools.findFirst({
          where: eq(schools.id, Number(schoolSlugOrId)),
        });
      } else {
        school = await readDb.query.schools.findFirst({
          where: eq(schools.slug, String(schoolSlugOrId)),
        });
      }
    }

    if (!school) {
      school = await getCurrentSchool();
    }

    if (!school) {
      school = await readDb.query.schools.findFirst({
        orderBy: [schools.id],
      });
    }

    const schoolId = school?.id || 1;

    // Fetch classes for this school
    const classes = await readDb.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
      orderBy: [schoolClasses.className],
    });

    const classNames = classes.map((c) => c.className);
    const defaultClasses = [
      "Licence 1 Informatique & IA", "Licence 1 Gestion & Finance", "Licence 1 Droit Privé",
      "Licence 2 Génie Logiciel", "Licence 3 Audit & Finance", "Master 1 Data Science",
      "Terminale D", "Terminale C", "Terminale A", "1ère D", "2nde C",
      "3ème A", "4ème A", "5ème A", "6ème A",
      "CM2", "CM1", "CE2", "CE1", "CP", "CI"
    ];

    return {
      school: school ? {
        id: school.id,
        name: school.name,
        slug: school.slug,
        logoPath: school.logoPath,
        customDomain: school.customDomain,
      } : {
        id: 1,
        name: "Edut Pro - Pôle Universitaire & Scolaire",
        slug: "main",
        logoPath: null,
      },
      classes: classNames.length > 0 ? classNames : defaultClasses,
      faculties: UNIVERSITY_FACULTIES,
    };
  } catch (error: any) {
    console.error("❌ Error fetching public school info:", error);
    return {
      school: { id: 1, name: "Edut Pro - Pôle Universitaire & Scolaire", slug: "main", logoPath: null },
      classes: [
        "Licence 1 Informatique", "Licence 1 Gestion", "Licence 1 Droit",
        "Terminale D", "1ère D", "2nde C", "3ème", "6ème"
      ],
      faculties: UNIVERSITY_FACULTIES,
    };
  }
}

// ─── 2. Public Application Tracker ────────────────────────────────────────────

function matchPhoneDigits(dbPhone?: string | null, inputPhone?: string | null): boolean {
  if (!dbPhone || !inputPhone) return false;
  const dbDigits = dbPhone.replace(/\D/g, "");
  const inputDigits = inputPhone.replace(/\D/g, "");
  if (!dbDigits || !inputDigits) return false;

  if (dbDigits === inputDigits) return true;
  if (dbDigits.endsWith(inputDigits) || inputDigits.endsWith(dbDigits)) return true;
  if (dbDigits.includes(inputDigits) || inputDigits.includes(dbDigits)) return true;

  // Last 8 digits match (standard phone number without international country code)
  const last8Db = dbDigits.slice(-8);
  const last8Input = inputDigits.slice(-8);
  return last8Db.length >= 6 && last8Db === last8Input;
}

export async function getPublicApplicationStatusAction(params: {
  applicationNumber: string;
  phone: string;
}) {
  try {
    const cleanAppNumber = params.applicationNumber?.trim().toUpperCase();
    const rawPhone = params.phone?.trim();

    if (!cleanAppNumber || !rawPhone) {
      return { error: "Veuillez fournir le numéro de dossier et votre numéro de téléphone." };
    }

    const application = await readDb.query.admissionApplications.findFirst({
      where: eq(admissionApplications.applicationNumber, cleanAppNumber),
      with: {
        school: true,
        admittedStudent: true,
      },
    });

    if (!application) {
      return {
        error: "Aucun dossier trouvé avec ce numéro. Vérifiez le numéro de dossier (ex: UNIV-2026-001-XXXX ou ADM-2026-001-XXXX).",
      };
    }

    // Verify Phone matches candidate or parent
    const isPhoneValid = (
      matchPhoneDigits(application.parentPhone, rawPhone) ||
      matchPhoneDigits(application.candidatePhone, rawPhone) ||
      matchPhoneDigits(application.parentWhatsapp, rawPhone) ||
      matchPhoneDigits(application.candidateWhatsapp, rawPhone)
    );

    if (!isPhoneValid) {
      return {
        error: "Le numéro de téléphone ne correspond pas à ce dossier. Veuillez saisir le numéro utilisé lors de l'inscription.",
      };
    }

    return {
      success: true,
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        studentFirstName: application.studentFirstName,
        studentLastName: application.studentLastName,
        photoUrl: application.photoUrl,
        dateOfBirth: application.dateOfBirth,
        placeOfBirth: application.placeOfBirth,
        nationality: application.nationality,
        gender: application.gender,
        educationLevel: application.educationLevel || "Université / Supérieur",
        faculty: application.faculty,
        department: application.department,
        degreeProgram: application.degreeProgram || application.targetClass,
        degreeLevel: application.degreeLevel,
        studyMode: application.studyMode,
        academicYear: application.academicYear,
        bacSeries: application.bacSeries,
        bacYear: application.bacYear,
        bacMention: application.bacMention,
        bacRollNumber: application.bacRollNumber,
        candidatePhone: application.candidatePhone,
        candidateEmail: application.candidateEmail,
        parentName: application.parentName,
        parentPhone: application.parentPhone,
        parentRelation: application.parentRelation,
        targetClass: application.targetClass,
        status: application.status,
        admissionScore: application.admissionScore,
        interviewScore: application.interviewScore,
        interviewDate: application.interviewDate,
        juryDecision: application.juryDecision,
        juryComment: application.juryComment,
        reviewNotes: application.reviewNotes,
        reviewedBy: application.reviewedBy,
        reviewedAt: application.reviewedAt,
        generatedMatricule: application.generatedMatricule,
        createdAt: application.createdAt,
        schoolName: application.school?.name || "Edut Pro",
        schoolLogo: application.school?.logoPath,
        tuitionDepositPaid: application.tuitionDepositPaid,
      },
    };
  } catch (error: any) {
    console.error("❌ Application tracker error:", error);
    return { error: "Erreur serveur lors de la recherche du dossier." };
  }
}

// ─── 3. Dashboard Statistics ──────────────────────────────────────────────────

export async function getAdmissionsDashboardStats() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return { totalApplications: 0, pendingReview: 0, admitted: 0, rejected: 0, universityCount: 0 };
    }

    const rows = await readDb.query.admissionApplications.findMany({
      where: eq(admissionApplications.schoolId, schoolId),
      columns: {
        id: true,
        status: true,
        educationLevel: true,
        degreeLevel: true,
        admissionScore: true,
      },
    });

    const totalApplications = rows.length;
    const pendingReview = rows.filter((r) => r.status === "En attente" || r.status === "En examen").length;
    const admitted = rows.filter((r) => r.status === "Admis / Accepté" || r.status === "Admis sous condition").length;
    const rejected = rows.filter((r) => r.status === "Refusé").length;
    const universityCount = rows.filter((r) => (r.educationLevel || "").toLowerCase().includes("univ") || (r.educationLevel || "").toLowerCase().includes("sup")).length;

    return {
      totalApplications,
      pendingReview,
      admitted,
      rejected,
      universityCount,
    };
  });
}

// ─── 4. List Applications with Rich Filters ───────────────────────────────────

export async function getAdmissionApplicationsList(params?: {
  status?: string;
  targetClass?: string;
  educationLevel?: string;
  faculty?: string;
  query?: string;
  page?: number;
  limit?: number;
}) {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { applications: [], total: 0, page: 1, limit: 25, totalPages: 1 };

    let whereClause = eq(admissionApplications.schoolId, schoolId);

    if (params?.status && params.status !== "ALL" && params.status !== "Tous") {
      whereClause = and(whereClause, eq(admissionApplications.status, params.status)) as any;
    }
    if (params?.targetClass && params.targetClass !== "ALL" && params.targetClass !== "Tous") {
      whereClause = and(whereClause, eq(admissionApplications.targetClass, params.targetClass)) as any;
    }
    if (params?.educationLevel && params.educationLevel !== "ALL" && params.educationLevel !== "Tous") {
      whereClause = and(whereClause, eq(admissionApplications.educationLevel, params.educationLevel)) as any;
    }
    if (params?.faculty && params.faculty !== "ALL" && params.faculty !== "Toutes") {
      whereClause = and(whereClause, eq(admissionApplications.faculty, params.faculty)) as any;
    }

    if (params?.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(admissionApplications.applicationNumber, q),
          ilike(admissionApplications.studentFirstName, q),
          ilike(admissionApplications.studentLastName, q),
          ilike(admissionApplications.candidateEmail, q),
          ilike(admissionApplications.degreeProgram, q),
          ilike(admissionApplications.parentName, q),
          ilike(admissionApplications.parentPhone, q)
        )
      ) as any;
    }

    const isPaginated = typeof params?.page === "number" || typeof params?.limit === "number";
    const limit = params?.limit ? Math.min(Math.max(1, params.limit), 100) : (isPaginated ? 25 : undefined);
    const page = Math.max(1, params?.page || 1);
    const offset = limit ? (page - 1) * limit : undefined;

    let totalCount = 0;
    if (isPaginated) {
      const countRes = await readDb
        .select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(whereClause);
      totalCount = Number(countRes[0]?.count || 0);
    }

    const applications = await readDb.query.admissionApplications.findMany({
      where: whereClause,
      orderBy: [desc(admissionApplications.createdAt)],
      limit: limit,
      offset: offset,
    });

    return { 
      applications,
      total: isPaginated ? totalCount : applications.length,
      page: isPaginated ? page : 1,
      limit: limit || applications.length,
      totalPages: isPaginated && limit ? Math.ceil(totalCount / limit) : 1
    };
  });
}

// ─── 5. Submit Multi-Level & University Application ─────────────────────────

export async function submitAdmissionApplicationAction(data: {
  schoolId?: number;
  schoolSlug?: string;
  educationLevel?: string;
  faculty?: string;
  department?: string;
  degreeProgram?: string;
  degreeLevel?: string;
  studyMode?: string;
  academicYear?: string;
  targetClass: string;
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  gender: string;
  placeOfBirth?: string;
  nationality?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateWhatsapp?: string;
  bacSeries?: string;
  bacYear?: string;
  bacMention?: string;
  bacRollNumber?: string;
  previousSchool?: string;
  previousGradeAvg?: string;
  parentName: string;
  parentRelation?: string;
  parentPhone: string;
  parentWhatsapp?: string;
  parentEmail?: string;
  parentProfession?: string;
  address?: string;
  city?: string;
  birthCertificateUrl?: string;
  photoUrl?: string;
  idCardPassportUrl?: string;
  bacTranscriptUrl?: string;
  bacCertificateUrl?: string;
  higherEdTranscriptUrl?: string;
  cvUrl?: string;
  coverLetter?: string;
  recommendationLetterUrl?: string;
  reportCardUrl?: string;
  medicalNotes?: string;
  paymentReceiptUrl?: string;
}) {
  try {
    let schoolId: number | undefined = data.schoolId;

    if (!schoolId && data.schoolSlug) {
      const school = await readDb.query.schools.findFirst({
        where: eq(schools.slug, data.schoolSlug),
      });
      if (school) schoolId = school.id;
    }

    if (!schoolId) {
      schoolId = (await getActiveSchoolId()) || 1;
    }

    const finalSchoolId: number = Number(schoolId || 1);

    const schoolRow = await readDb.query.schools.findFirst({
      where: eq(schools.id, finalSchoolId),
    });
    const schoolName = schoolRow?.name || "Edut Pro";

    const currentYear = new Date().getFullYear();
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(eq(admissionApplications.schoolId, finalSchoolId));
    
    const seq = Number(countRes[0]?.count || 0) + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = (data.educationLevel || "").toLowerCase().includes("univ") ? "UNIV" : "ADM";
    const applicationNumber = `${prefix}-${currentYear}-${String(seq).padStart(3, "0")}-${randomSuffix}`;

    const [inserted] = await db
      .insert(admissionApplications)
      .values({
        applicationNumber,
        schoolId: finalSchoolId,
        educationLevel: data.educationLevel || "Université / Supérieur",
        faculty: data.faculty || null,
        department: data.department || null,
        degreeProgram: data.degreeProgram || data.targetClass,
        degreeLevel: data.degreeLevel || "Licence 1",
        studyMode: data.studyMode || "Présentiel / Temps plein",
        academicYear: data.academicYear || `${currentYear}–${currentYear + 1}`,
        targetClass: data.targetClass,
        studentFirstName: data.studentFirstName.trim(),
        studentLastName: data.studentLastName.trim(),
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || "M",
        placeOfBirth: data.placeOfBirth || "Niamey",
        nationality: data.nationality || "Nigérienne",
        candidateEmail: data.candidateEmail || null,
        candidatePhone: data.candidatePhone || null,
        candidateWhatsapp: data.candidateWhatsapp || null,
        bacSeries: data.bacSeries || null,
        bacYear: data.bacYear || null,
        bacMention: data.bacMention || null,
        bacRollNumber: data.bacRollNumber || null,
        previousSchool: data.previousSchool || null,
        previousGradeAvg: data.previousGradeAvg || null,
        parentName: data.parentName.trim(),
        parentRelation: data.parentRelation || "Père",
        parentPhone: data.parentPhone.trim(),
        parentWhatsapp: data.parentWhatsapp || data.parentPhone.trim(),
        parentEmail: data.parentEmail || null,
        parentProfession: data.parentProfession || null,
        address: data.address || null,
        city: data.city || "Niamey",
        photoUrl: data.photoUrl || null,
        birthCertificateUrl: data.birthCertificateUrl || null,
        idCardPassportUrl: data.idCardPassportUrl || null,
        bacTranscriptUrl: data.bacTranscriptUrl || null,
        bacCertificateUrl: data.bacCertificateUrl || null,
        higherEdTranscriptUrl: data.higherEdTranscriptUrl || null,
        cvUrl: data.cvUrl || null,
        coverLetter: data.coverLetter || null,
        recommendationLetterUrl: data.recommendationLetterUrl || null,
        reportCardUrl: data.reportCardUrl || null,
        medicalNotes: data.medicalNotes || null,
        paymentReceiptUrl: data.paymentReceiptUrl || null,
        status: "En attente",
        parentNotified: false,
      })
      .returning();

    // Send instant WhatsApp / SMS acknowledgment
    try {
      const studentFullName = `${data.studentLastName.toUpperCase()} ${data.studentFirstName}`;
      const contactPhone = data.candidatePhone || data.parentPhone;
      await MessagingService.sendAdmissionReceivedAlert({
        to: contactPhone,
        whatsapp: data.candidateWhatsapp || data.parentWhatsapp || contactPhone,
        parentName: data.parentName,
        studentName: studentFullName,
        applicationNumber,
        targetClass: data.degreeProgram || data.targetClass,
        schoolName: schoolName,
        sendSMS: true,
        sendWhatsApp: true,
      });

      await db
        .update(admissionApplications)
        .set({ parentNotified: true, parentNotificationSentAt: new Date() })
        .where(eq(admissionApplications.id, inserted.id));
    } catch (err) {
      console.error("⚠️ Failed to send admission received notification:", err);
    }

    revalidatePath("/dashboard/admissions");
    return {
      success: true,
      applicationNumber,
      applicationId: inserted.id,
      schoolName,
      message: "Candidature enregistrée avec succès. Vous recevrez un accusé de réception par SMS / WhatsApp.",
    };
  } catch (error: any) {
    console.error("❌ Submit admission application error:", error);
    return { error: error?.message || "Erreur lors de la soumission de la candidature." };
  }
}

// ─── 6. Jury Scoring & Evaluation Action ────────────────────────────────────

export async function scoreAdmissionApplicationAction(data: {
  applicationId: number;
  admissionScore?: number;
  interviewScore?: number;
  interviewDate?: string;
  juryDecision?: string;
  juryComment?: string;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const reviewerName = (user as any).name || (user as any).nom || user.utilisateur || "Commission Pédagogique";

    await db
      .update(admissionApplications)
      .set({
        admissionScore: data.admissionScore,
        interviewScore: data.interviewScore,
        interviewDate: data.interviewDate,
        juryDecision: data.juryDecision,
        juryComment: data.juryComment,
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        status: data.juryDecision ? (data.juryDecision as any) : "En examen",
      })
      .where(
        and(
          eq(admissionApplications.id, data.applicationId),
          eq(admissionApplications.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/admissions");
    return { success: true, message: "Évaluation du jury enregistrée avec succès." };
  });
}

// ─── 7. Review, Decision & Single-Click Immatriculation ───────────────────────

export async function reviewAdmissionApplicationAction(data: {
  applicationId: number;
  decision: "Admis / Accepté" | "Refusé" | "Liste d'attente" | "En examen" | "Admis sous condition";
  reviewNotes?: string;
  assignedClass?: string;
  admissionScore?: number;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const application = await db.query.admissionApplications.findFirst({
      where: and(
        eq(admissionApplications.id, data.applicationId),
        eq(admissionApplications.schoolId, schoolId)
      ),
      with: {
        school: true,
      },
    });

    if (!application) {
      return { error: "Dossier de candidature introuvable." };
    }

    const schoolName = application.school?.name || "Edut Pro";
    const reviewerName = (user as any).name || (user as any).nom || user.utilisateur || "Commission des Admissions";
    const targetClass = data.assignedClass || application.degreeProgram || application.targetClass;
    const isUniv = (application.educationLevel || "").toLowerCase().includes("univ") || (application.educationLevel || "").toLowerCase().includes("sup");

    // IF APPROVED: Automatically create student & generate University Matricule
    if (data.decision === "Admis / Accepté" || data.decision === "Admis sous condition") {
      const year = new Date().getFullYear();

      const studentCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.schoolId, schoolId));
      
      const seq = Number(studentCountRes[0]?.count || 0) + 1;
      const prefix = isUniv ? "ETU" : "MAT";
      const matricule = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

      const studentFullName = `${application.studentLastName.toUpperCase()} ${application.studentFirstName}`;

      // 1. Insert official student record with university metadata
      const [newStudent] = await db
        .insert(students)
        .values({
          schoolId,
          numAdmission: matricule,
          nomEtudiant: studentFullName,
          dateNaissance: application.dateOfBirth,
          sexe: application.gender || "M",
          lieuNaissance: application.placeOfBirth || "Niamey",
          classe: targetClass,
          educationalLevel: isUniv ? "Université" : (application.educationLevel || "Secondaire"),
          statut: "Actif",
          nomPere: application.parentName,
          mobile: application.candidatePhone || application.parentPhone,
          whatsapp: application.candidateWhatsapp || application.parentWhatsapp || application.parentPhone,
          photoPath: application.photoUrl || null,
          behaviorScore: 20,
        })
        .returning();

      // Auto-create student financial record in Gestion Financière
      await ensureStudentFeeRecord(newStudent.id, schoolId).catch(err =>
        console.error("[reviewAdmissionApplicationAction] Auto-create fee record failed:", err)
      );

      // 2. Insert health notes if present
      if (application.medicalNotes) {
        await db.insert(studentMedicalRecords).values({
          schoolId,
          studentId: newStudent.id,
          allergies: application.medicalNotes,
          emergencyContactName: application.parentName,
          emergencyContactPhone: application.parentPhone,
          emergencyContactRelation: application.parentRelation || "Parent/Tuteur",
        });
      }

      // 3. Update application record
      await db
        .update(admissionApplications)
        .set({
          status: data.decision,
          targetClass,
          admittedStudentId: newStudent.id,
          generatedMatricule: matricule,
          admissionScore: data.admissionScore || application.admissionScore,
          reviewNotes: data.reviewNotes || "Candidature acceptée et étudiant immatriculé avec succès.",
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        })
        .where(eq(admissionApplications.id, data.applicationId));

      // 4. Send official Acceptance Alert via WhatsApp and SMS
      try {
        const contactPhone = application.candidatePhone || application.parentPhone;
        await MessagingService.sendAdmissionApprovedAlert({
          to: contactPhone,
          whatsapp: application.candidateWhatsapp || application.parentWhatsapp || contactPhone,
          parentName: application.parentName,
          studentName: studentFullName,
          matricule,
          targetClass,
          schoolName: schoolName,
          sendSMS: true,
          sendWhatsApp: true,
        });
      } catch (err) {
        console.error("⚠️ Failed to send acceptance notification:", err);
      }

      revalidatePath("/dashboard/admissions");
      revalidatePath("/dashboard/students");
      revalidatePath("/dashboard/finance");
      return {
        success: true,
        matricule,
        studentId: newStudent.id,
        message: `Félicitations ! L'étudiant a été admis et immatriculé avec le numéro : ${matricule}`,
      };
    } else {
      // For Rejections, Waiting List or In Review
      await db
        .update(admissionApplications)
        .set({
          status: data.decision,
          reviewNotes: data.reviewNotes || null,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        })
        .where(eq(admissionApplications.id, data.applicationId));

      revalidatePath("/dashboard/admissions");
      return {
        success: true,
        message: `Statut du dossier mis à jour : ${data.decision}`,
      };
    }
  });
}

// ─── 8. Delete Application Action ───────────────────────────────────────────

export async function deleteAdmissionApplicationAction(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Non autorisé." };

    await db
      .delete(admissionApplications)
      .where(
        and(
          eq(admissionApplications.id, id),
          eq(admissionApplications.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/admissions");
    return { success: true, message: "Dossier de candidature supprimé." };
  });
}

// ─── 9. Update / Attach Admission Application Documents ───────────────────────

export async function updateAdmissionApplicationDocumentsAction(data: {
  applicationId: number;
  documents: {
    photoUrl?: string | null;
    birthCertificateUrl?: string | null;
    idCardPassportUrl?: string | null;
    bacTranscriptUrl?: string | null;
    bacCertificateUrl?: string | null;
    higherEdTranscriptUrl?: string | null;
    cvUrl?: string | null;
    coverLetter?: string | null;
    reportCardUrl?: string | null;
  };
}) {
  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Non autorisé." };

    const updatePayload: Record<string, any> = {};
    if (data.documents.photoUrl !== undefined) updatePayload.photoUrl = data.documents.photoUrl;
    if (data.documents.birthCertificateUrl !== undefined) updatePayload.birthCertificateUrl = data.documents.birthCertificateUrl;
    if (data.documents.idCardPassportUrl !== undefined) updatePayload.idCardPassportUrl = data.documents.idCardPassportUrl;
    if (data.documents.bacTranscriptUrl !== undefined) updatePayload.bacTranscriptUrl = data.documents.bacTranscriptUrl;
    if (data.documents.bacCertificateUrl !== undefined) updatePayload.bacCertificateUrl = data.documents.bacCertificateUrl;
    if (data.documents.higherEdTranscriptUrl !== undefined) updatePayload.higherEdTranscriptUrl = data.documents.higherEdTranscriptUrl;
    if (data.documents.cvUrl !== undefined) updatePayload.cvUrl = data.documents.cvUrl;
    if (data.documents.coverLetter !== undefined) updatePayload.coverLetter = data.documents.coverLetter;
    if (data.documents.reportCardUrl !== undefined) updatePayload.reportCardUrl = data.documents.reportCardUrl;

    await db
      .update(admissionApplications)
      .set(updatePayload)
      .where(
        and(
          eq(admissionApplications.id, data.applicationId),
          eq(admissionApplications.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/admissions");
    return { success: true, message: "Pièces justificatives mises à jour avec succès." };
  });
}

