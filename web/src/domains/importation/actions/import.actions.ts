"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolSubjects, schoolSections, sectionSubjects, schoolClasses, exams, examResults, academicPeriods, schoolSessions, classSubjects, studentResults, educationalLevels } from "@/infrastructure/database/schema/academics";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { ensureStudentFeeRecord } from "@/domains/finance/actions/finance.actions";

function formatDate(val: any): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'number') {
    // Excel serial date to JS date
    const date = new Date((val - 25569) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val).trim();
}

function normalizeSexeStudent(val: any): "Garçon" | "Fille" {
  if (!val) return "Garçon";
  const s = String(val).trim().toLowerCase();
  if (s.startsWith("f") || s.includes("fille") || s === "f") return "Fille";
  return "Garçon";
}

function normalizeSexeEmployee(val: any): "Homme" | "Femme" {
  if (!val) return "Homme";
  const s = String(val).trim().toLowerCase();
  if (s.startsWith("f") || s.includes("femme") || s === "f" || s.startsWith("w")) return "Femme";
  return "Homme";
}

function parseOptionalNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const normalized = String(val).trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAppreciationFromAverage(average: number): string {
  if (average >= 16) return "Excellent";
  if (average >= 14) return "Très bien";
  if (average >= 12) return "Bien";
  if (average >= 10) return "Passable";
  return "Insuffisant";
}

function missingSchoolContextError() {
  return { error: "Aucun contexte d'ecole trouve. Selectionnez une ecole avant l'importation." };
}

export async function importStudentRow(data: any) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé à inscrire des élèves." };
    }

    const admissionNo = String(data.numAdmission || "").trim();
    if (!admissionNo) {
      return { error: "Le matricule/numAdmission est requis." };
    }

    const name = String(data.nomEtudiant || "").trim();
    if (!name) {
      return { error: "Le nom complet de l'élève est requis." };
    }

    const studentData = {
      schoolId,
      numAdmission: admissionNo,
      nomEtudiant: name,
      nomArabe: data.nomArabe ? String(data.nomArabe).trim() : null,
      sexe: normalizeSexeStudent(data.sexe),
      religion: data.religion ? String(data.religion).trim() : null,
      dateNaissance: formatDate(data.dateNaissance),
      lieuNaissance: data.lieuNaissance ? String(data.lieuNaissance).trim() : null,
      cnic: data.cnic ? String(data.cnic).trim() : null,
      groupeSanguin: data.groupeSanguin ? String(data.groupeSanguin).trim() : null,
      session: data.session ? String(data.session).trim() : null,
      educationalLevel: data.educationalLevel ? String(data.educationalLevel).trim() : null,
      classe: data.classe ? String(data.classe).trim() : null,
      section: data.section ? String(data.section).trim() : null,
      categorie: data.categorie ? String(data.categorie).trim() : null,
      nomPere: data.nomPere ? String(data.nomPere).trim() : null,
      cnicPere: data.cnicPere ? String(data.cnicPere).trim() : null,
      mobile: data.mobile ? String(data.mobile).trim() : null,
      whatsapp: data.whatsapp ? String(data.whatsapp).trim() : null,
      fraisMensuels: Number(data.fraisMensuels || 0),
      ancienSolde: Number(data.ancienSolde || 0),
      fraisInscription: Number(data.fraisInscription || 0),
      fraisCogesCard: Number(data.fraisCogesCard || 0),
      fraisTransportInternat: Number(data.fraisTransportInternat || 0),
      statut: data.statut ? String(data.statut).trim() : "Actif",
      behaviorScore: Number(data.behaviorScore || 18),
    };

    const existing = await db.query.students.findFirst({
      where: and(
        eq(students.schoolId, schoolId),
        eq(students.numAdmission, admissionNo)
      )
    });

    if (existing) {
      await db.update(students)
        .set(studentData)
        .where(and(eq(students.id, existing.id), eq(students.schoolId, schoolId)));
      
      // Auto-sync financial record
      await ensureStudentFeeRecord(existing.id, schoolId).catch(err =>
        console.error("[importStudentRow] Auto-sync fee record failed:", err)
      );

      revalidatePath("/dashboard/students");
      revalidatePath("/dashboard/finance");
      return { success: true, action: "update", id: existing.id };
    } else {
      const [newStud] = await db.insert(students).values(studentData).returning({ id: students.id });
      
      // Auto-create financial record
      await ensureStudentFeeRecord(newStud.id, schoolId).catch(err =>
        console.error("[importStudentRow] Auto-create fee record failed:", err)
      );

      revalidatePath("/dashboard/students");
      revalidatePath("/dashboard/finance");
      return { success: true, action: "insert", id: newStud.id };
    }
  });
}

export async function importEmployeeRow(data: any) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé." };
    }

    const empId = String(data.empId || "").trim();
    if (!empId) {
      return { error: "L'identifiant de l'employé est requis." };
    }

    const name = String(data.nom || "").trim();
    if (!name) {
      return { error: "Le nom complet est requis." };
    }

    const employeeData = {
      schoolId,
      empId,
      nom: name,
      poste: data.poste ? String(data.poste).trim() : null,
      departement: data.departement ? String(data.departement).trim() : null,
      mobile: data.mobile ? String(data.mobile).trim() : null,
      email: data.email ? String(data.email).trim() : null,
      dateEmbauche: formatDate(data.dateEmbauche),
      salaireBase: Number(data.salaireBase || 0),
      sexe: normalizeSexeEmployee(data.sexe),
      dateNaissance: formatDate(data.dateNaissance),
      cnic: data.cnic ? String(data.cnic).trim() : null,
      adresse: data.adresse ? String(data.adresse).trim() : null,
      banqueNom: data.banqueNom ? String(data.banqueNom).trim() : null,
      banqueCompte: data.banqueCompte ? String(data.banqueCompte).trim() : null,
      statut: data.statut ? String(data.statut).trim() : "Actif",
      educationalLevel: data.educationalLevel ? String(data.educationalLevel).trim() : null,
      lieuNaissance: data.lieuNaissance ? String(data.lieuNaissance).trim() : null,
      codeGrade: data.codeGrade ? String(data.codeGrade).trim() : null,
      categorie: data.categorie ? String(data.categorie).trim() : null,
      classe: data.classe ? String(data.classe).trim() : null,
      echelon: data.echelon ? String(data.echelon).trim() : null,
      fonction: data.fonction ? String(data.fonction).trim() : null,
      dateNomination: formatDate(data.dateNomination),
      lieuAffectation: data.lieuAffectation ? String(data.lieuAffectation).trim() : null,
      commune: data.commune ? String(data.commune).trim() : null,
      region: data.region ? String(data.region).trim() : null,
      dateAffectation: formatDate(data.dateAffectation),
    };

    const existing = await db.query.employees.findFirst({
      where: and(
        eq(employees.schoolId, schoolId),
        eq(employees.empId, empId)
      )
    });

    if (existing) {
      await db.update(employees)
        .set(employeeData)
        .where(and(eq(employees.id, existing.id), eq(employees.schoolId, schoolId)));
      revalidatePath("/dashboard/hr");
      return { success: true, action: "update", id: existing.id };
    } else {
      try {
        const [newEmp] = await db.insert(employees).values(employeeData).returning({ id: employees.id });
        revalidatePath("/dashboard/hr");
        return { success: true, action: "insert", id: newEmp.id };
      } catch (error: any) {
        const pgCode: string | undefined = error?.code ?? error?.cause?.code;
        if (pgCode === "23505") {
          return {
            error:
              "Le matricule employé existe déjà. Si c'est un employé d'une autre école, appliquez la migration 0004_scope_employee_emp_id_by_school.sql dans Supabase avant l'importation.",
          };
        }
        console.error("[importEmployeeRow] DB error:", pgCode, error?.message);
        return {
          error: "Erreur lors de l'insertion de l'employé. Vérifiez les données et réessayez.",
        };
      }
    }
  });
}

export async function importSubjectRow(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé." };
    }

    const subjectName = String(data.subjectName || "").trim();
    if (!subjectName) {
      return { error: "Le nom de la matière est requis." };
    }

    const inputCode = data.subjectCode ? String(data.subjectCode).trim() : null;
    const category = data.category ? String(data.category).trim() : null;

    try {
      // 1. Find or create the subject by subjectCode first, then by subjectName
      let existingSubject = null;

      if (inputCode) {
        existingSubject = await db.query.schoolSubjects.findFirst({
          where: and(
            eq(schoolSubjects.schoolId, schoolId),
            eq(schoolSubjects.subjectCode, inputCode)
          )
        });
      }

      if (!existingSubject && subjectName) {
        existingSubject = await db.query.schoolSubjects.findFirst({
          where: and(
            eq(schoolSubjects.schoolId, schoolId),
            eq(schoolSubjects.subjectName, subjectName)
          )
        });
      }

      let subjectId: number;
      let action: "insert" | "update" = "insert";

      if (existingSubject) {
        action = "update";
        subjectId = existingSubject.id;

        const updateData: any = {
          subjectName: subjectName || existingSubject.subjectName,
        };
        if (category !== null) {
          updateData.category = category;
        }

        // Only update subjectCode if provided and not owned by another subject
        if (inputCode && inputCode !== existingSubject.subjectCode) {
          const conflicting = await db.query.schoolSubjects.findFirst({
            where: and(
              eq(schoolSubjects.schoolId, schoolId),
              eq(schoolSubjects.subjectCode, inputCode)
            )
          });
          if (!conflicting || conflicting.id === existingSubject.id) {
            updateData.subjectCode = inputCode;
          }
        }

        await db.update(schoolSubjects)
          .set(updateData)
          .where(and(eq(schoolSubjects.id, existingSubject.id), eq(schoolSubjects.schoolId, schoolId)));

      } else {
        // Create new subject
        let finalCode = inputCode;
        if (inputCode) {
          const conflicting = await db.query.schoolSubjects.findFirst({
            where: and(
              eq(schoolSubjects.schoolId, schoolId),
              eq(schoolSubjects.subjectCode, inputCode)
            )
          });
          if (conflicting) {
            // Code already taken by another subject, omit code to avoid unique constraint crash
            finalCode = null;
          }
        }

        const [newSub] = await db.insert(schoolSubjects).values({
          schoolId,
          subjectName,
          subjectCode: finalCode,
          category,
        }).returning({ id: schoolSubjects.id });
        subjectId = newSub.id;
      }

      // 2. If sectionName is provided, find or create section and link subject
      const sectionName = data.sectionName ? String(data.sectionName).trim() : null;
      if (sectionName) {
        let section = await db.query.schoolSections.findFirst({
          where: and(
            eq(schoolSections.schoolId, schoolId),
            eq(schoolSections.sectionName, sectionName)
          )
        });

        if (!section) {
          const eduLevel = data.educationalLevel ? String(data.educationalLevel).trim() : "Lycée";
          const [newSec] = await db.insert(schoolSections).values({
            schoolId,
            sectionName,
            educationalLevel: eduLevel,
          }).returning();
          section = newSec;
        }

        const existingLink = await db.query.sectionSubjects.findFirst({
          where: and(
            eq(sectionSubjects.sectionId, section.id),
            eq(sectionSubjects.subjectId, subjectId)
          )
        });

        const coefVal = data.coefficient !== undefined ? Number(data.coefficient) : 1;
        const creditsVal = data.credits !== undefined ? Number(data.credits) : 0.0;
        const termVal = data.term ? String(data.term).trim() : null;

        const linkData = {
          sectionId: section.id,
          subjectId,
          defaultCoef: isNaN(coefVal) ? 1 : coefVal,
          credits: isNaN(creditsVal) ? 0.0 : creditsVal,
          term: termVal,
        };

        if (existingLink) {
          await db.update(sectionSubjects)
            .set(linkData)
            .where(eq(sectionSubjects.id, existingLink.id));
        } else {
          await db.insert(sectionSubjects).values(linkData);
        }
      }

      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard/academics");
      return { success: true, action, id: subjectId };

    } catch (error: any) {
      console.error("[importSubjectRow] Error:", error?.message || error);
      return { error: `Erreur lors de l'enregistrement de la matière '${subjectName}'. Vérifiez les données.` };
    }
  });
}


export async function importExamResultRow(data: any) {
  return protectedDbAction("Exams", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }
    const roleType = await getUserRoleType(user);

    // Auto-migrate: ensure school_id and recorded_at exist in exam_results
    try {
      await db.execute(sql`ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS school_id integer`);
      await db.execute(sql`ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS recorded_at timestamp DEFAULT now()`);
    } catch (e: any) {
      console.warn("Could not check/add columns to exam_results:", e.message);
    }

    const examName = String(data.examName || "").trim();
    const className = String(data.className || "").trim();
    const subjectName = String(data.subjectName || "").trim();
    const numAdmission = String(data.numAdmission || "").trim();
    const classWorkScore = parseOptionalNumber(data.classWorkScore);
    const examScoreInput = parseOptionalNumber(data.examScore);
    const marksObtainedInput = parseOptionalNumber(data.marksObtained);

    if (!examName || !className || !subjectName || !numAdmission) {
      return { error: "Colonnes obligatoires manquantes pour cette ligne." };
    }

    if (classWorkScore === null && examScoreInput === null && marksObtainedInput === null) {
      return { error: "Veuillez fournir MOY. CLASSE + NOTE COMPO ou une note finale." };
    }

    if ((classWorkScore !== null || examScoreInput !== null) && (classWorkScore === null || examScoreInput === null)) {
      return { error: "MOY. CLASSE et NOTE COMPO doivent être renseignées ensemble." };
    }

    const effectiveClassWorkScore = classWorkScore ?? marksObtainedInput ?? 0;
    const examScore = examScoreInput ?? marksObtainedInput ?? 0;
    const totalScore = effectiveClassWorkScore + examScore;
    const marksObtained = totalScore / 2;

    if ([classWorkScore ?? 0, examScore, marksObtained].some((score) => score < 0 || score > 20)) {
      return { error: "Les notes doivent être comprises entre 0 et 20." };
    }

    // 1. Find Class
    const cls = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        eq(schoolClasses.className, className)
      )
    });
    if (!cls) {
      return { error: `La classe '${className}' n'existe pas dans le système.` };
    }

    // 2. Find or Create Subject
    let subject = await db.query.schoolSubjects.findFirst({
      where: and(
        eq(schoolSubjects.schoolId, schoolId),
        eq(schoolSubjects.subjectName, subjectName)
      )
    });
    if (!subject) {
      const [newSub] = await db.insert(schoolSubjects).values({
        schoolId,
        subjectName,
      }).returning();
      subject = newSub;
    }

    // 3. Find Student
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.schoolId, schoolId),
        eq(students.numAdmission, numAdmission)
      )
    });
    if (!student) {
      return { error: `L'élève avec le matricule '${numAdmission}' n'a pas été trouvé.` };
    }

    // 4. Find Period if provided
    let periodId: number | null = null;
    let sessionId: number | null = null;
    const periodName = data.periodName ? String(data.periodName).trim() : null;
    if (periodName) {
      const period = await db.query.academicPeriods.findFirst({
        where: and(
          eq(academicPeriods.schoolId, schoolId),
          eq(academicPeriods.name, periodName)
        )
      });
      if (period) {
        periodId = period.id;
        sessionId = period.sessionId ?? null;
      }
    }

    const sessionName = data.sessionName ? String(data.sessionName).trim() : null;
    if (!sessionId && sessionName) {
      const session = await db.query.schoolSessions.findFirst({
        where: and(
          eq(schoolSessions.schoolId, schoolId),
          eq(schoolSessions.sessionName, sessionName)
        )
      });
      sessionId = session?.id ?? null;
    }

    if (!sessionId) {
      const activeSession = await db.query.schoolSessions.findFirst({
        where: and(
          eq(schoolSessions.schoolId, schoolId),
          eq(schoolSessions.isActive, true)
        )
      });
      sessionId = activeSession?.id ?? null;
    }

    // 5. Find or Create Exam
    let exam = await db.query.exams.findFirst({
      where: and(
        eq(exams.schoolId, schoolId),
        eq(exams.examName, examName),
        eq(exams.classId, cls.id),
        eq(exams.subjectId, subject.id),
        periodId ? eq(exams.periodId, periodId) : undefined
      )
    });

    const maxMarksVal = data.maxMarks !== undefined ? Number(data.maxMarks) : 20;

    if (!exam) {
      const examDateObj = data.examDate ? new Date(formatDate(data.examDate) || new Date()) : null;
      const [newExam] = await db.insert(exams).values({
        schoolId,
        examName,
        classId: cls.id,
        subjectId: subject.id,
        periodId,
        maxMarks: isNaN(maxMarksVal) ? 20 : maxMarksVal,
        examDate: examDateObj,
      }).returning();
      exam = newExam;
    }

    // 6. Save or Update Result
    const existingResult = await db.query.examResults.findFirst({
      where: and(
        eq(examResults.schoolId, schoolId),
        eq(examResults.examId, exam.id),
        eq(examResults.studentId, student.id)
      )
    });

    const resultData = {
      schoolId,
      examId: exam.id,
      studentId: student.id,
      marksObtained,
      remarks: data.remarks ? String(data.remarks).trim() : null,
    };

    if (existingResult) {
      await db.update(examResults)
        .set(resultData)
        .where(and(eq(examResults.id, existingResult.id), eq(examResults.schoolId, schoolId)));
      revalidatePath(`/dashboard/academics/exams/${exam.id}/results`);
      if (sessionId && periodName) {
        const classSubject = await db.query.classSubjects.findFirst({
          where: and(
            eq(classSubjects.schoolId, schoolId),
            eq(classSubjects.classId, cls.id),
            eq(classSubjects.subjectId, subject.id)
          )
        });
        const coefficient = Number(classSubject?.coefficient || 1);
        const weightedScore = marksObtained * coefficient;
        const detailedResult = {
          studentId: student.id,
          subjectId: subject.id,
          classId: cls.id,
          sessionId,
          term: periodName,
          classWorkScore: effectiveClassWorkScore,
          examScore,
          totalScore,
          coefficient,
          weightedScore,
          absences: 0,
          observation: data.remarks ? String(data.remarks).trim() : null,
          appreciation: getAppreciationFromAverage(marksObtained),
          rank: null,
        };
        const existingDetailed = await db.query.studentResults.findFirst({
          where: and(
            eq(studentResults.studentId, student.id),
            eq(studentResults.subjectId, subject.id),
            eq(studentResults.classId, cls.id),
            eq(studentResults.sessionId, sessionId),
            eq(studentResults.term, periodName)
          )
        });
        if (existingDetailed) {
          await db.update(studentResults).set(detailedResult).where(eq(studentResults.id, existingDetailed.id));
        } else {
          await db.insert(studentResults).values(detailedResult);
        }
        revalidatePath("/dashboard/academics/grades");
      }
      return { success: true, action: "update", id: existingResult.id };
    } else {
      const [newRes] = await db.insert(examResults).values(resultData).returning({ id: examResults.id });
      revalidatePath(`/dashboard/academics/exams/${exam.id}/results`);
      if (sessionId && periodName) {
        const classSubject = await db.query.classSubjects.findFirst({
          where: and(
            eq(classSubjects.schoolId, schoolId),
            eq(classSubjects.classId, cls.id),
            eq(classSubjects.subjectId, subject.id)
          )
        });
        const coefficient = Number(classSubject?.coefficient || 1);
        const weightedScore = marksObtained * coefficient;
        const detailedResult = {
          studentId: student.id,
          subjectId: subject.id,
          classId: cls.id,
          sessionId,
          term: periodName,
          classWorkScore: effectiveClassWorkScore,
          examScore,
          totalScore,
          coefficient,
          weightedScore,
          absences: 0,
          observation: data.remarks ? String(data.remarks).trim() : null,
          appreciation: getAppreciationFromAverage(marksObtained),
          rank: null,
        };
        const existingDetailed = await db.query.studentResults.findFirst({
          where: and(
            eq(studentResults.studentId, student.id),
            eq(studentResults.subjectId, subject.id),
            eq(studentResults.classId, cls.id),
            eq(studentResults.sessionId, sessionId),
            eq(studentResults.term, periodName)
          )
        });
        if (existingDetailed) {
          await db.update(studentResults).set(detailedResult).where(eq(studentResults.id, existingDetailed.id));
        } else {
          await db.insert(studentResults).values(detailedResult);
        }
        revalidatePath("/dashboard/academics/grades");
      }
      return { success: true, action: "insert", id: newRes.id };
    }
  });
}

export async function importClassLevelRow(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }

    const className = String(data.className || "").trim();
    const sectionName = String(data.sectionName || "").trim();
    const educationalLevel = String(data.educationalLevel || "").trim();

    if (!className || !sectionName || !educationalLevel) {
      return { error: "Le nom de la classe, de la section et du niveau éducatif sont requis." };
    }

    // 1. Find or create Educational Level
    let level = await db.query.educationalLevels.findFirst({
      where: and(
        eq(educationalLevels.schoolId, schoolId),
        eq(educationalLevels.levelName, educationalLevel)
      )
    });
    if (!level) {
      const [newLevel] = await db.insert(educationalLevels).values({
        schoolId,
        levelName: educationalLevel
      }).returning();
      level = newLevel;
    }

    // 2. Find or create Section
    let section = await db.query.schoolSections.findFirst({
      where: and(
        eq(schoolSections.schoolId, schoolId),
        eq(schoolSections.sectionName, sectionName)
      )
    });
    if (!section) {
      const [newSection] = await db.insert(schoolSections).values({
        schoolId,
        sectionName,
        educationalLevel
      }).returning();
      section = newSection;
    }

    // 3. Find or create Class
    let cls = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        eq(schoolClasses.className, className)
      )
    });

    const classData = {
      className,
      sectionId: section.id,
      roomName: data.roomName ? String(data.roomName).trim() : null,
      scolariteMensuelle: parseOptionalNumber(data.scolariteMensuelle) || 0,
      droitsInscription: parseOptionalNumber(data.droitsInscription) || 0,
      cogesCarteId: parseOptionalNumber(data.cogesCarteId) || 0,
      transportInternat: parseOptionalNumber(data.transportInternat) || 0,
      ancienSolde: parseOptionalNumber(data.ancienSolde) || 0,
      statutInitial: data.statutInitial ? String(data.statutInitial).trim() : "Actif",
      schoolId
    };

    if (cls) {
      await db.update(schoolClasses).set(classData).where(eq(schoolClasses.id, cls.id));
      revalidatePath("/dashboard/academics");
      revalidatePath("/dashboard/settings");
      return { success: true, action: "update", id: cls.id };
    } else {
      const [newCls] = await db.insert(schoolClasses).values(classData).returning();
      revalidatePath("/dashboard/academics");
      revalidatePath("/dashboard/settings");
      return { success: true, action: "insert", id: newCls.id };
    }
  });
}

export async function importSectionSubjectRow(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }

    const sectionName = String(data.sectionName || "").trim();
    const subjectName = String(data.subjectName || "").trim();
    const defaultCoef = parseOptionalNumber(data.coefficient) ?? 1;
    const term = data.term ? String(data.term).trim() : "Tous";
    const isEliminatory = data.isEliminatory === true || String(data.isEliminatory).trim().toLowerCase() === "oui" || String(data.isEliminatory).trim().toLowerCase() === "true" || data.isEliminatory === 1;

    if (!sectionName || !subjectName) {
      return { error: "Le nom de la section et le nom de la matière sont requis." };
    }

    // 1. Find Section
    const section = await db.query.schoolSections.findFirst({
      where: and(
        eq(schoolSections.schoolId, schoolId),
        eq(schoolSections.sectionName, sectionName)
      )
    });
    if (!section) {
      return { error: `La section '${sectionName}' n'existe pas dans le système.` };
    }

    // 2. Find or Create Subject
    let subject = await db.query.schoolSubjects.findFirst({
      where: and(
        eq(schoolSubjects.schoolId, schoolId),
        eq(schoolSubjects.subjectName, subjectName)
      )
    });
    if (!subject) {
      const [newSub] = await db.insert(schoolSubjects).values({
        schoolId,
        subjectName,
      }).returning();
      subject = newSub;
    }

    // 3. Find or Create/Update Link in sectionSubjects
    const existingLink = await db.query.sectionSubjects.findFirst({
      where: and(
        eq(sectionSubjects.sectionId, section.id),
        eq(sectionSubjects.subjectId, subject.id),
        eq(sectionSubjects.term, term)
      )
    });

    const linkData = {
      sectionId: section.id,
      subjectId: subject.id,
      term,
      defaultCoef,
      isEliminatory
    };

    if (existingLink) {
      await db.update(sectionSubjects).set(linkData).where(eq(sectionSubjects.id, existingLink.id));
      revalidatePath("/dashboard/settings");
      return { success: true, action: "update", id: existingLink.id };
    } else {
      const [newLink] = await db.insert(sectionSubjects).values(linkData).returning();
      revalidatePath("/dashboard/settings");
      return { success: true, action: "insert", id: newLink.id };
    }
  });
}

export async function importClassSubjectRow(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return missingSchoolContextError();
    }

    const className = String(data.className || "").trim();
    const subjectName = String(data.subjectName || "").trim();
    const coefficient = parseOptionalNumber(data.coefficient) ?? 1;
    const semester = data.semester ? String(data.semester).trim() : null;
    const teacherName = data.teacherName ? String(data.teacherName).trim() : null;

    if (!className || !subjectName) {
      return { error: "Le nom de la classe et le nom de la matière sont requis." };
    }

    // 1. Find Class
    const cls = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        eq(schoolClasses.className, className)
      )
    });
    if (!cls) {
      return { error: `La classe '${className}' n'existe pas dans le système.` };
    }

    // 2. Find or Create Subject
    let subject = await db.query.schoolSubjects.findFirst({
      where: and(
        eq(schoolSubjects.schoolId, schoolId),
        eq(schoolSubjects.subjectName, subjectName)
      )
    });
    if (!subject) {
      const [newSub] = await db.insert(schoolSubjects).values({
        schoolId,
        subjectName,
      }).returning();
      subject = newSub;
    }

    // 3. Find Teacher if provided
    let employeeId: number | null = null;
    if (teacherName) {
      const teacher = await db.query.employees.findFirst({
        where: and(
          eq(employees.schoolId, schoolId),
          eq(employees.nom, teacherName)
        )
      });
      if (teacher) {
        employeeId = teacher.id;
      }
    }

    // 4. Find or Create/Update Link in classSubjects
    const existingLink = await db.query.classSubjects.findFirst({
      where: and(
        eq(classSubjects.schoolId, schoolId),
        eq(classSubjects.classId, cls.id),
        eq(classSubjects.subjectId, subject.id)
      )
    });

    const linkData = {
      schoolId,
      classId: cls.id,
      subjectId: subject.id,
      coefficient,
      semester,
      employeeId
    };

    if (existingLink) {
      await db.update(classSubjects).set(linkData).where(eq(classSubjects.id, existingLink.id));
      revalidatePath("/dashboard/settings");
      return { success: true, action: "update", id: existingLink.id };
    } else {
      const [newLink] = await db.insert(classSubjects).values(linkData).returning();
      revalidatePath("/dashboard/settings");
      return { success: true, action: "insert", id: newLink.id };
    }
  });
}
