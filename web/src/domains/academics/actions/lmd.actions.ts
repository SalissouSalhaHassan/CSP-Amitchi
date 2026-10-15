"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  universityFaculties,
  universityDepartments,
  universityPrograms,
  lmdUnitesEnseignement,
  lmdElementsConstitutifs,
  studentLmdUeResults,
  studentLmdSemesters,
  schoolClasses,
  schoolSections,
  educationalLevels,
  schoolSessions,
  academicPeriods,
  schoolSubjects,
  classSubjects,
  studentResults,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, desc, asc, or, ilike, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deliberateSemester, UeInput, EcuInput } from "../utils/lmd-engine";

// ─── 0. SYNCHRONISATION AUTOMATIQUE AVEC LES PARAMÈTRES ACADÉMIQUES ───────────
/**
 * Scanne les paramètres académiques réels (settings?tab=academic):
 * - Sections & Filières (school_sections)
 * - Classes & Promotions (school_classes)
 * - Sessions académiques (school_sessions)
 * - Périodes & Semestres (academic_periods)
 * et initialise ou synchronise la cartographie LMD sans doublons.
 */
export async function syncAcademicSettingsToLmd(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    // 1. Récupérer les données réelles configurées
    const [realSections, realClasses, realSessions, realSubjects, existingFaculties, existingPrograms] = await Promise.all([
      readDb.query.schoolSections.findMany({
        where: or(eq(schoolSections.schoolId, schoolId), isNull(schoolSections.schoolId)),
        orderBy: [asc(schoolSections.sectionName)],
      }),
      readDb.query.schoolClasses.findMany({
        where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
        orderBy: [asc(schoolClasses.className)],
      }),
      readDb.query.schoolSessions.findMany({
        where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
        orderBy: [desc(schoolSessions.startDate)],
      }),
      readDb.query.schoolSubjects.findMany({
        where: or(eq(schoolSubjects.schoolId, schoolId), isNull(schoolSubjects.schoolId)),
        orderBy: [asc(schoolSubjects.subjectName)],
      }),
      readDb.query.universityFaculties.findMany({
        where: eq(universityFaculties.schoolId, schoolId),
        with: { departments: true },
      }),
      readDb.query.universityPrograms.findMany({
        where: eq(universityPrograms.schoolId, schoolId),
      }),
    ]);

    // 2. Créer une Faculté Principale si aucune n'existe
    let defaultFacultyId: number;
    let defaultDeptId: number;

    if (existingFaculties.length === 0) {
      const [newFac] = await db.insert(universityFaculties).values({
        schoolId,
        name: "Faculté des Sciences, Technologies & Gestion",
        code: "FSTG",
        description: "Faculté principale synchronisée depuis les paramètres académiques",
      }).returning({ id: universityFaculties.id });

      defaultFacultyId = newFac.id;

      const [newDept] = await db.insert(universityDepartments).values({
        facultyId: defaultFacultyId,
        name: "Département des Cursus Universitaires & Professionnels",
        code: "DCUP",
        description: "Département fédérant les filières LMD",
      }).returning({ id: universityDepartments.id });

      defaultDeptId = newDept.id;
    } else {
      defaultFacultyId = existingFaculties[0].id;
      if (existingFaculties[0].departments.length > 0) {
        defaultDeptId = existingFaculties[0].departments[0].id;
      } else {
        const [newDept] = await db.insert(universityDepartments).values({
          facultyId: defaultFacultyId,
          name: "Département Académique",
          code: "DEPT-1",
        }).returning({ id: universityDepartments.id });
        defaultDeptId = newDept.id;
      }
    }

    // 3. Mapper chaque section réelle vers un programme/filière LMD
    const programSectionMap = new Map<number, number>();
    for (const prog of existingPrograms) {
      if (prog.sectionId) {
        programSectionMap.set(prog.sectionId, prog.id);
      }
    }

    let createdProgramsCount = 0;
    for (const sec of realSections) {
      if (!programSectionMap.has(sec.id)) {
        const isMaster = (sec.sectionName || "").toLowerCase().includes("master") || (sec.educationalLevel || "").toLowerCase().includes("master");
        const degreeLevel = isMaster ? "Master" : "Licence";
        const totalCredits = isMaster ? 120 : 180;
        const durationSemesters = isMaster ? 4 : 6;

        const [createdProg] = await db.insert(universityPrograms).values({
          schoolId,
          departmentId: defaultDeptId,
          sectionId: sec.id,
          name: sec.sectionName,
          code: sec.series || `FIL-${sec.id}`,
          degreeLevel,
          totalCredits,
          durationSemesters,
          description: sec.description || `Filière LMD issue de la section ${sec.sectionName}`,
          isActive: true,
        }).returning({ id: universityPrograms.id });

        programSectionMap.set(sec.id, createdProg.id);
        createdProgramsCount++;

        // 4. Générer des UE standard (S1 & S2) pour la nouvelle filière si des matières existent
        if (realSubjects.length > 0) {
          const subjectsChunk1 = realSubjects.slice(0, Math.min(4, realSubjects.length));
          const subjectsChunk2 = realSubjects.slice(4, Math.min(8, realSubjects.length));

          // UE Fondamentale S1
          const [ue1] = await db.insert(lmdUnitesEnseignement).values({
            programId: createdProg.id,
            semester: "S1",
            codeUe: `UE11-${sec.id}`,
            nameUe: "UE Fondamentale & Méthodologique 1",
            typeUe: "Fondamentale",
            creditsEcts: 18.0,
            totalHours: 180.0,
            minPassingGrade: 10.0,
          }).returning({ id: lmdUnitesEnseignement.id });

          for (const sb of subjectsChunk1) {
            await db.insert(lmdElementsConstitutifs).values({
              ueId: ue1.id,
              subjectId: sb.id,
              codeEcu: sb.subjectCode || `ECU-${sb.id}`,
              nameEcu: sb.subjectName,
              creditsEcts: 4.5,
              coefficient: 2,
              hoursCm: 30,
              hoursTd: 15,
              hoursTp: 0,
              hoursTpe: 30,
              eliminatoryGrade: 7.0,
            });
          }

          // UE Transversale S1
          const [ue2] = await db.insert(lmdUnitesEnseignement).values({
            programId: createdProg.id,
            semester: "S1",
            codeUe: `UE12-${sec.id}`,
            nameUe: "UE Transversale & Langues 1",
            typeUe: "Transversale",
            creditsEcts: 12.0,
            totalHours: 120.0,
            minPassingGrade: 10.0,
          }).returning({ id: lmdUnitesEnseignement.id });

          for (const sb of (subjectsChunk2.length > 0 ? subjectsChunk2 : subjectsChunk1.slice(0, 2))) {
            await db.insert(lmdElementsConstitutifs).values({
              ueId: ue2.id,
              subjectId: sb.id,
              codeEcu: sb.subjectCode || `ECU-TR-${sb.id}`,
              nameEcu: sb.subjectName,
              creditsEcts: 6.0,
              coefficient: 1,
              hoursCm: 20,
              hoursTd: 10,
              hoursTp: 0,
              hoursTpe: 20,
              eliminatoryGrade: 7.0,
            });
          }
        }
      }
    }

    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");

    return {
      success: true,
      message: `Synchronisation réussie : ${createdProgramsCount} filière(s) initialisée(s) à partir de vos paramètres réels.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 1. FACULTÉS / ÉCOLES / UFR ──────────────────────────────────────────────
export async function getFaculties(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    let list = await readDb.query.universityFaculties.findMany({
      where: eq(universityFaculties.schoolId, schoolId),
      with: {
        dean: true,
        departments: {
          with: {
            head: true,
            programs: true,
          }
        }
      },
      orderBy: [asc(universityFaculties.name)],
    });

    // Si aucune faculté n'existe, synchroniser automatiquement
    if (list.length === 0) {
      await syncAcademicSettingsToLmd(schoolId);
      list = await readDb.query.universityFaculties.findMany({
        where: eq(universityFaculties.schoolId, schoolId),
        with: {
          dean: true,
          departments: {
            with: {
              head: true,
              programs: true,
            }
          }
        },
        orderBy: [asc(universityFaculties.name)],
      });
    }

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveFaculty(data: {
  id?: number;
  schoolId: number;
  name: string;
  code?: string;
  deanEmployeeId?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityFaculties).set({
        name: data.name,
        code: data.code,
        deanEmployeeId: data.deanEmployeeId,
        description: data.description,
      }).where(eq(universityFaculties.id, data.id));
    } else {
      await db.insert(universityFaculties).values({
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        deanEmployeeId: data.deanEmployeeId,
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFaculty(id: number) {
  try {
    await db.delete(universityFaculties).where(eq(universityFaculties.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 2. DÉPARTEMENTS ACADÉMIQUES ─────────────────────────────────────────────
export async function saveDepartment(data: {
  id?: number;
  facultyId: number;
  name: string;
  code?: string;
  headEmployeeId?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityDepartments).set({
        name: data.name,
        code: data.code,
        headEmployeeId: data.headEmployeeId,
        description: data.description,
      }).where(eq(universityDepartments.id, data.id));
    } else {
      await db.insert(universityDepartments).values({
        facultyId: data.facultyId,
        name: data.name,
        code: data.code,
        headEmployeeId: data.headEmployeeId,
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDepartment(id: number) {
  try {
    await db.delete(universityDepartments).where(eq(universityDepartments.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 3. FILIÈRES ET PARCOURS LMD ─────────────────────────────────────────────
export async function getUniversityPrograms(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    let list = await readDb.query.universityPrograms.findMany({
      where: eq(universityPrograms.schoolId, schoolId),
      with: {
        department: {
          with: {
            faculty: true,
          }
        },
        section: true,
        unitesEnseignement: {
          with: {
            elementsConstitutifs: {
              with: {
                teacher: true,
                subject: true,
              }
            }
          }
        }
      },
      orderBy: [asc(universityPrograms.name)],
    });

    // Si aucune filière n'est configurée, synchroniser avec les sections réelles
    if (list.length === 0) {
      await syncAcademicSettingsToLmd(schoolId);
      list = await readDb.query.universityPrograms.findMany({
        where: eq(universityPrograms.schoolId, schoolId),
        with: {
          department: {
            with: {
              faculty: true,
            }
          },
          section: true,
          unitesEnseignement: {
            with: {
              elementsConstitutifs: {
                with: {
                  teacher: true,
                  subject: true,
                }
              }
            }
          }
        },
        orderBy: [asc(universityPrograms.name)],
      });
    }

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveUniversityProgram(data: {
  id?: number;
  schoolId: number;
  departmentId: number;
  sectionId?: number;
  name: string;
  code?: string;
  degreeLevel: string;
  totalCredits?: number;
  durationSemesters?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityPrograms).set({
        departmentId: data.departmentId,
        sectionId: data.sectionId || null,
        name: data.name,
        code: data.code,
        degreeLevel: data.degreeLevel,
        totalCredits: data.totalCredits || (data.degreeLevel === "Master" ? 120 : 180),
        durationSemesters: data.durationSemesters || (data.degreeLevel === "Master" ? 4 : 6),
        description: data.description,
      }).where(eq(universityPrograms.id, data.id));
    } else {
      await db.insert(universityPrograms).values({
        schoolId: data.schoolId,
        departmentId: data.departmentId,
        sectionId: data.sectionId || null,
        name: data.name,
        code: data.code,
        degreeLevel: data.degreeLevel,
        totalCredits: data.totalCredits || (data.degreeLevel === "Master" ? 120 : 180),
        durationSemesters: data.durationSemesters || (data.degreeLevel === "Master" ? 4 : 6),
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniversityProgram(id: number) {
  try {
    await db.delete(universityPrograms).where(eq(universityPrograms.id, id));
    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 4. MAQUETTE PÉDAGOGIQUE (UE & ECU) ───────────────────────────────────────
export async function getMaquettePedagogique(programId: number, semester: string) {
  try {
    const ues = await readDb.query.lmdUnitesEnseignement.findMany({
      where: and(
        eq(lmdUnitesEnseignement.programId, programId),
        eq(lmdUnitesEnseignement.semester, semester)
      ),
      with: {
        elementsConstitutifs: {
          with: {
            teacher: true,
            subject: true,
          }
        }
      },
      orderBy: [asc(lmdUnitesEnseignement.codeUe)],
    });

    const totalCredits = ues.reduce((acc, ue) => acc + (Number(ue.creditsEcts) || 0), 0);
    const totalHours = ues.reduce((acc, ue) => acc + (Number(ue.totalHours) || 0), 0);

    return {
      success: true,
      data: {
        ues,
        totalCredits,
        totalHours,
        isCompliant30Credits: totalCredits === 30.0,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveUniteEnseignement(data: {
  id?: number;
  programId: number;
  semester: string;
  codeUe: string;
  nameUe: string;
  typeUe: string;
  creditsEcts: number;
  totalHours?: number;
  minPassingGrade?: number;
  isEliminatory?: boolean;
}) {
  try {
    if (data.id) {
      await db.update(lmdUnitesEnseignement).set({
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe,
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      }).where(eq(lmdUnitesEnseignement.id, data.id));
    } else {
      await db.insert(lmdUnitesEnseignement).values({
        programId: data.programId,
        semester: data.semester,
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe,
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours || 60,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      });
    }
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniteEnseignement(id: number) {
  try {
    await db.delete(lmdUnitesEnseignement).where(eq(lmdUnitesEnseignement.id, id));
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveElementConstitutif(data: {
  id?: number;
  ueId: number;
  subjectId?: number;
  codeEcu?: string;
  nameEcu: string;
  creditsEcts?: number;
  coefficient?: number;
  hoursCm?: number;
  hoursTd?: number;
  hoursTp?: number;
  hoursTpe?: number;
  teacherEmployeeId?: number;
  eliminatoryGrade?: number;
}) {
  try {
    if (data.id) {
      await db.update(lmdElementsConstitutifs).set({
        subjectId: data.subjectId,
        codeEcu: data.codeEcu,
        nameEcu: data.nameEcu,
        creditsEcts: data.creditsEcts,
        coefficient: data.coefficient,
        hoursCm: data.hoursCm,
        hoursTd: data.hoursTd,
        hoursTp: data.hoursTp,
        hoursTpe: data.hoursTpe,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade,
      }).where(eq(lmdElementsConstitutifs.id, data.id));
    } else {
      await db.insert(lmdElementsConstitutifs).values({
        ueId: data.ueId,
        subjectId: data.subjectId,
        codeEcu: data.codeEcu,
        nameEcu: data.nameEcu,
        creditsEcts: data.creditsEcts || 3.0,
        coefficient: data.coefficient || 1,
        hoursCm: data.hoursCm || 24,
        hoursTd: data.hoursTd || 12,
        hoursTp: data.hoursTp || 0,
        hoursTpe: data.hoursTpe || 24,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade || 7.0,
      });
    }
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteElementConstitutif(id: number) {
  try {
    await db.delete(lmdElementsConstitutifs).where(eq(lmdElementsConstitutifs.id, id));
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 5. SALLE DE DÉLIBÉRATION DU JURY LMD ────────────────────────────────────
export async function getLmdDeliberationCohort(
  programId: number,
  classId: number,
  semester: string,
  sessionId: number,
  sessionType: "Normale" | "Rattrapage" = "Normale"
) {
  try {
    const semNumMatch = semester.match(/\d+/);
    const semNum = semNumMatch ? semNumMatch[0] : "1";
    const sCode = `S${semNum}`;

    // 0. Résoudre programId si 0 ou manquant à partir de la classe
    let resolvedProgramId = programId;
    if (!resolvedProgramId || resolvedProgramId === 0) {
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
      });
      if (cls?.sectionId) {
        const prog = await readDb.query.universityPrograms.findFirst({
          where: eq(universityPrograms.sectionId, cls.sectionId),
        });
        if (prog) {
          resolvedProgramId = prog.id;
        }
      }
    }

    // 1. Récupérer les UEs et ECUs configurés pour ce programme et semestre (support S1, 1er Semestre, etc.)
    let ues: any[] = [];
    if (resolvedProgramId && resolvedProgramId > 0) {
      ues = await readDb.query.lmdUnitesEnseignement.findMany({
        where: and(
          eq(lmdUnitesEnseignement.programId, resolvedProgramId),
          or(
            eq(lmdUnitesEnseignement.semester, semester),
            eq(lmdUnitesEnseignement.semester, sCode),
            eq(lmdUnitesEnseignement.semester, `Semestre ${semNum}`),
            ilike(lmdUnitesEnseignement.semester, `%${sCode}%`)
          )
        ),
        with: {
          elementsConstitutifs: true,
        }
      });
    }

    // Fallback dynamique si aucune UE n'est encore configurée pour ce semestre précis :
    // On mappe directement les matières affectées à la classe (class_subjects)
    if (ues.length === 0) {
      const clsSubjects = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.classId, classId),
        with: {
          subject: true,
        }
      });

      if (clsSubjects.length > 0) {
        const autoEcus: any[] = clsSubjects.map((cs, idx) => ({
          id: cs.id,
          subjectId: cs.subjectId,
          codeEcu: cs.subject?.subjectCode || `ECU-${idx + 1}`,
          nameEcu: cs.subject?.subjectName || `Matière ${idx + 1}`,
          coefficient: cs.coefficient || 1,
          creditsEcts: cs.credits && Number(cs.credits) > 0 ? Number(cs.credits) : Number((30.0 / Math.max(1, clsSubjects.length)).toFixed(1)),
          eliminatoryGrade: 7.0,
        }));

        ues = [
          {
            id: 999991,
            programId: resolvedProgramId || 0,
            semester: sCode,
            codeUe: `UE-AUTO-${sCode}`,
            nameUe: `UE Unifiée du Semestre (${semester})`,
            typeUe: "Fondamentale",
            creditsEcts: 30.0,
            totalHours: 300.0,
            minPassingGrade: 10.0,
            isEliminatory: false,
            elementsConstitutifs: autoEcus,
          } as any
        ];
      }
    }

    // 2. Récupérer les Étudiants inscrits dans cette classe OU ayant des résultats dans cette classe
    const resultsForClass = await readDb.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId)
      ),
      columns: { studentId: true },
    });
    const extraStudentIds: number[] = Array.from(
      new Set(resultsForClass.map((r) => r.studentId).filter((id): id is number => typeof id === "number"))
    );

    const studentWhere = extraStudentIds.length > 0
      ? or(eq(students.classId, classId), inArray(students.id, extraStudentIds))
      : eq(students.classId, classId);

    const enrolledStudents = await readDb.query.students.findMany({
      where: studentWhere,
      orderBy: [asc(students.nomEtudiant)],
    });

    // 3. Récupérer les notes réelles enregistrées (student_results - Session Normale)
    const semNumSuffix = semNum === "1" ? "er" : "ème";
    const studentIds = enrolledStudents.map((s) => s.id);
    
    const results = await readDb.query.studentResults.findMany({
      where: and(
        studentIds.length > 0
          ? or(eq(studentResults.classId, classId), inArray(studentResults.studentId, studentIds))
          : eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId),
        or(
          eq(studentResults.term, semester),
          eq(studentResults.term, `Semestre ${semNum}`),
          eq(studentResults.term, `${semNum}er Semestre`),
          eq(studentResults.term, `${semNum}ème Semestre`),
          eq(studentResults.term, `${semNum}ère Semestre`),
          eq(studentResults.term, `${semNum}${semNumSuffix} Semestre`),
          eq(studentResults.term, `${semNum}${semNumSuffix} Semestre (S${semNum})`),
          eq(studentResults.term, `S${semNum}`),
          ilike(studentResults.term, `%S${semNum}%`),
          ilike(studentResults.term, `%Semestre ${semNum}%`),
          ilike(studentResults.term, `%${semNum}er Semestre%`),
          ilike(studentResults.term, `%${semNum}ème Semestre%`),
          ilike(studentResults.term, `%${semNum}ère Semestre%`)
        )
      ),
      with: {
        subject: true,
      }
    });

    // 3.1 Récupérer les notes de Rattrapage si existantes
    const rattrapageResults = await readDb.query.studentResults.findMany({
      where: and(
        studentIds.length > 0
          ? or(eq(studentResults.classId, classId), inArray(studentResults.studentId, studentIds))
          : eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId),
        or(
          ilike(studentResults.term, `%Rattrapage%`),
          ilike(studentResults.term, `%Session 2%`),
          ilike(studentResults.term, `%${sCode}%Rat%`),
          ilike(studentResults.term, `%Semestre ${semNum}%Rat%`)
        )
      ),
      with: {
        subject: true,
      }
    });

    const normalizeKey = (str?: string | null) => (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    const resultMap = new Map<string, any>();
    for (const r of results) {
      if (r.subjectId) {
        resultMap.set(`${r.studentId}_${r.subjectId}`, r);
      }
      if (r.subject?.subjectName) {
        resultMap.set(`${r.studentId}_name_${normalizeKey(r.subject.subjectName)}`, r);
      }
    }

    const rattrapageResultMap = new Map<string, any>();
    for (const r of rattrapageResults) {
      if (r.subjectId) {
        rattrapageResultMap.set(`${r.studentId}_${r.subjectId}`, r);
      }
      if (r.subject?.subjectName) {
        rattrapageResultMap.set(`${r.studentId}_name_${normalizeKey(r.subject.subjectName)}`, r);
      }
    }

    // 3.5 Découverte et intégration intelligente des matières réelles évaluées
    const distinctEvaluatedSubjects = new Map<number, { id: number; name: string; code?: string; coef: number }>();
    for (const r of results) {
      if (r.subjectId && !distinctEvaluatedSubjects.has(r.subjectId)) {
        distinctEvaluatedSubjects.set(r.subjectId, {
          id: r.subjectId,
          name: r.subject?.subjectName || `Matière ${r.subjectId}`,
          code: r.subject?.subjectCode || `ECU-${r.subjectId}`,
          coef: r.coefficient ? Number(r.coefficient) : 1,
        });
      }
    }

    const existingUeSubjectIds = new Set<number>();
    const existingUeSubjectNames = new Set<string>();
    for (const u of ues) {
      for (const e of u.elementsConstitutifs || []) {
        if (e.subjectId) existingUeSubjectIds.add(e.subjectId);
        if (e.nameEcu) existingUeSubjectNames.add(normalizeKey(e.nameEcu));
      }
    }

    const missingEvaluatedSubjects = Array.from(distinctEvaluatedSubjects.values()).filter(
      (s) => !existingUeSubjectIds.has(s.id) && !existingUeSubjectNames.has(normalizeKey(s.name))
    );

    let effectiveUes = [...ues];

    if (effectiveUes.length === 0 && distinctEvaluatedSubjects.size > 0) {
      const allEvaluatedList = Array.from(distinctEvaluatedSubjects.values());
      const ectsPerSubject = Number((30.0 / Math.max(1, allEvaluatedList.length)).toFixed(1));
      effectiveUes = [
        {
          id: 999991,
          programId: resolvedProgramId || 0,
          semester: sCode,
          codeUe: `UE-FOND-${sCode}`,
          nameUe: `UE Fondamentale du Semestre (${semester})`,
          typeUe: "Fondamentale",
          creditsEcts: 30.0,
          totalHours: 300.0,
          minPassingGrade: 10.0,
          isEliminatory: false,
          elementsConstitutifs: allEvaluatedList.map((s, idx) => ({
            id: s.id,
            subjectId: s.id,
            codeEcu: s.code || `ECU-${idx + 1}`,
            nameEcu: s.name,
            coefficient: s.coef || 1,
            creditsEcts: ectsPerSubject,
            eliminatoryGrade: 7.0,
          })),
        } as any
      ];
    } else if (missingEvaluatedSubjects.length > 0) {
      const ectsPerMissing = Number((12.0 / Math.max(1, missingEvaluatedSubjects.length)).toFixed(1));
      effectiveUes.push({
        id: 999992,
        programId: resolvedProgramId || 0,
        semester: sCode,
        codeUe: `UE-SPEC-${sCode}`,
        nameUe: `UE Spécialité & Modules Complémentaires (${sCode})`,
        typeUe: "Fondamentale",
        creditsEcts: 12.0,
        totalHours: 120.0,
        minPassingGrade: 10.0,
        isEliminatory: false,
        elementsConstitutifs: missingEvaluatedSubjects.map((s, idx) => ({
          id: s.id,
          subjectId: s.id,
          codeEcu: s.code || `ECU-SPEC-${idx + 1}`,
          nameEcu: s.name,
          coefficient: s.coef || 1,
          creditsEcts: ectsPerMissing,
          eliminatoryGrade: 7.0,
        })),
      } as any);
    }

    // 4. Calculer la délibération LMD pour chaque étudiant
    const cohortDeliberation = enrolledStudents.map((st) => {
      const studentUeInputs: UeInput[] = effectiveUes.map((ue) => {
        const ecus: EcuInput[] = (ue.elementsConstitutifs || []).map((ecu: any) => {
          const normEcuName = normalizeKey(ecu.nameEcu);
          const res = (ecu.subjectId ? resultMap.get(`${st.id}_${ecu.subjectId}`) : null)
            || resultMap.get(`${st.id}_name_${normEcuName}`)
            || null;

          const ratRes = (ecu.subjectId ? rattrapageResultMap.get(`${st.id}_${ecu.subjectId}`) : null)
            || rattrapageResultMap.get(`${st.id}_name_${normEcuName}`)
            || null;

          return {
            id: ecu.id,
            codeEcu: ecu.codeEcu || undefined,
            nameEcu: ecu.nameEcu,
            coefficient: ecu.coefficient || 1,
            creditsEcts: Number(ecu.creditsEcts) || 3.0,
            eliminatoryGrade: Number(ecu.eliminatoryGrade) || 7.0,
            classWorkScore: res?.classWorkScore !== null && res?.classWorkScore !== undefined ? Number(res.classWorkScore) : null,
            examScore: res?.examScore !== null && res?.examScore !== undefined ? Number(res.examScore) : null,
            totalScore: res?.totalScore !== null && res?.totalScore !== undefined ? Number(res.totalScore) : null,
            rattrapageScore: ratRes?.totalScore !== null && ratRes?.totalScore !== undefined ? Number(ratRes.totalScore) : (ratRes?.examScore !== null && ratRes?.examScore !== undefined ? Number(ratRes.examScore) : null),
            sessionType: sessionType,
          };
        });

        return {
          id: ue.id,
          codeUe: ue.codeUe,
          nameUe: ue.nameUe,
          typeUe: (ue.typeUe as any) || "Fondamentale",
          creditsEcts: Number(ue.creditsEcts) || 6.0,
          minPassingGrade: Number(ue.minPassingGrade) || 10.0,
          isEliminatory: ue.isEliminatory || false,
          ecus,
        };
      });

      const deliberation = deliberateSemester(studentUeInputs, semester);

      return {
        student: {
          id: st.id,
          matricule: st.numAdmission,
          nom: st.nomEtudiant,
          sexe: st.sexe,
          photoUrl: st.photoPath,
        },
        deliberation,
      };
    });

    // 5. Classement de la cohorte selon la moyenne semestrielle
    cohortDeliberation.sort((a, b) => b.deliberation.semesterAverage - a.deliberation.semesterAverage);

    const cohortWithRank = cohortDeliberation.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    const passedCount = cohortWithRank.filter((c) => c.deliberation.isSemesterValidated).length;
    const totalStudents = cohortWithRank.length;
    const successRate = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;

    return {
      success: true,
      data: {
        ues: effectiveUes,
        cohort: cohortWithRank,
        totalStudents,
        passedCount,
        successRate: Number(successRate.toFixed(2)),
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 6. CLÔTURE ET ENREGISTREMENT DE LA DÉLIBÉRATION OFFICIELLE ──────────────
export async function saveLmdDeliberation(data: {
  programId: number;
  classId: number;
  semester: string;
  sessionId: number;
  cohort: any[];
}) {
  try {
    for (const item of data.cohort) {
      const studentId = item.student.id;
      const delib = item.deliberation;

      // 1. Sauvegarder les résultats par UE
      for (const ue of delib.ueResults) {
        if (ue.ueId && ue.ueId < 900000) {
          const existing = await readDb.query.studentLmdUeResults.findFirst({
            where: and(
              eq(studentLmdUeResults.studentId, studentId),
              eq(studentLmdUeResults.ueId, ue.ueId),
              eq(studentLmdUeResults.sessionId, data.sessionId),
              eq(studentLmdUeResults.semester, data.semester)
            )
          });

          if (existing) {
            await db.update(studentLmdUeResults).set({
              rawAverage: ue.average,
              validatedStatus: ue.status,
              creditsAcquired: ue.creditsAcquired,
              updatedAt: new Date(),
            }).where(eq(studentLmdUeResults.id, existing.id));
          } else {
            await db.insert(studentLmdUeResults).values({
              studentId,
              ueId: ue.ueId,
              sessionId: data.sessionId,
              semester: data.semester,
              rawAverage: ue.average,
              validatedStatus: ue.status,
              creditsAcquired: ue.creditsAcquired,
            });
          }
        }
      }

      // 2. Sauvegarder le bilan semestriel officiel
      const existingSem = await readDb.query.studentLmdSemesters.findFirst({
        where: and(
          eq(studentLmdSemesters.studentId, studentId),
          eq(studentLmdSemesters.semester, data.semester),
          eq(studentLmdSemesters.sessionId, data.sessionId)
        )
      });

      if (existingSem) {
        await db.update(studentLmdSemesters).set({
          programId: data.programId,
          classId: data.classId,
          semesterAverage: delib.semesterAverage,
          creditsAcquired: delib.creditsAcquired,
          decision: delib.decision,
          mention: delib.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(studentLmdSemesters.id, existingSem.id));
      } else {
        await db.insert(studentLmdSemesters).values({
          studentId,
          programId: data.programId,
          classId: data.classId,
          semester: data.semester,
          sessionId: data.sessionId,
          semesterAverage: delib.semesterAverage,
          creditsAcquired: delib.creditsAcquired,
          decision: delib.decision,
          mention: delib.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
        });
      }
    }

    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/deliberation");

    return {
      success: true,
      message: `Délibération du ${data.semester} enregistrée et clôturée avec succès pour ${data.cohort.length} étudiant(s).`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 7. SAISIE DES NOTES DE RATTRAPAGE (SESSION 2) ───────────────────────────
export async function saveLmdRattrapageGrade(data: {
  studentId: number;
  subjectId: number;
  classId: number;
  sessionId: number;
  semester: string;
  rattrapageScore: number;
}) {
  try {
    const semNumMatch = data.semester.match(/\d+/);
    const semNum = semNumMatch ? semNumMatch[0] : "1";
    const rattrapageTerm = `Semestre ${semNum} (Rattrapage)`;

    const existing = await readDb.query.studentResults.findFirst({
      where: and(
        eq(studentResults.studentId, data.studentId),
        eq(studentResults.subjectId, data.subjectId),
        eq(studentResults.classId, data.classId),
        eq(studentResults.sessionId, data.sessionId),
        or(
          eq(studentResults.term, rattrapageTerm),
          ilike(studentResults.term, `%Rattrapage%`)
        )
      )
    });

    if (existing) {
      await db.update(studentResults).set({
        examScore: data.rattrapageScore,
        totalScore: data.rattrapageScore,
      }).where(eq(studentResults.id, existing.id));
    } else {
      await db.insert(studentResults).values({
        studentId: data.studentId,
        subjectId: data.subjectId,
        classId: data.classId,
        sessionId: data.sessionId,
        term: rattrapageTerm,
        examScore: data.rattrapageScore,
        totalScore: data.rattrapageScore,
        coefficient: 1,
      });
    }

    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true, message: "Note de rattrapage enregistrée avec succès !" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 8. DÉLIBÉRATION ANNUELLE & BILAN DES 60 CRÉDITS ECTS ─────────────────────
export async function getLmdAnnualDeliberation(
  programId: number,
  classId: number,
  sessionId: number,
  sessionType: "Normale" | "Rattrapage" = "Normale"
) {
  try {
    // 1. Récupérer la classe pour déterminer les semestres correspondants (S1+S2, S3+S4, S5+S6)
    const cls = await readDb.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: {
        section: true,
      }
    });

    const normClassName = (cls?.className || "").toLowerCase();
    let sem1 = "1er Semestre (S1)";
    let sem2 = "2ème Semestre (S2)";
    let cycleLevel = "Licence 1 (L1)";

    if (normClassName.includes("l2") || normClassName.includes("licence 2") || normClassName.includes("2eme") || normClassName.includes("2ème") || normClassName.includes("2nd")) {
      sem1 = "3ème Semestre (S3)";
      sem2 = "4ème Semestre (S4)";
      cycleLevel = "Licence 2 (L2)";
    } else if (normClassName.includes("l3") || normClassName.includes("licence 3") || normClassName.includes("3eme") || normClassName.includes("3ème") || normClassName.includes("3rd")) {
      sem1 = "5ème Semestre (S5)";
      sem2 = "6ème Semestre (S6)";
      cycleLevel = "Licence 3 (L3)";
    } else if (normClassName.includes("m2") || normClassName.includes("master 2")) {
      sem1 = "3ème Semestre (S3)";
      sem2 = "4ème Semestre (S4)";
      cycleLevel = "Master 2 (M2)";
    } else if (normClassName.includes("m1") || normClassName.includes("master 1") || normClassName.includes("master")) {
      sem1 = "1er Semestre (S1)";
      sem2 = "2ème Semestre (S2)";
      cycleLevel = "Master 1 (M1)";
    }

    // 2. Récupérer les délibérations des 2 semestres avec gestion des erreurs
    const [resSem1, resSem2] = await Promise.all([
      getLmdDeliberationCohort(programId, classId, sem1, sessionId, sessionType).catch((err) => {
        console.error(`[getLmdAnnualDeliberation] Error fetching sem1 (${sem1}):`, err);
        return { success: false, data: null, error: err?.message };
      }),
      getLmdDeliberationCohort(programId, classId, sem2, sessionId, sessionType).catch((err) => {
        console.error(`[getLmdAnnualDeliberation] Error fetching sem2 (${sem2}):`, err);
        return { success: false, data: null, error: err?.message };
      }),
    ]);

    const cohort1 = (resSem1.success && resSem1.data ? resSem1.data.cohort : []) as any[];
    const cohort2 = (resSem2.success && resSem2.data ? resSem2.data.cohort : []) as any[];

    // 3. Fusionner les résultats des deux semestres par étudiant
    const allStudentsMap = new Map<number, any>();
    for (const c of cohort1) {
      if (c && c.student && c.student.id) {
        allStudentsMap.set(c.student.id, { student: c.student, sem1: c.deliberation, sem2: null });
      }
    }
    for (const c of cohort2) {
      if (c && c.student && c.student.id) {
        if (allStudentsMap.has(c.student.id)) {
          const entry = allStudentsMap.get(c.student.id);
          entry.sem2 = c.deliberation;
        } else {
          allStudentsMap.set(c.student.id, { student: c.student, sem1: null, sem2: c.deliberation });
        }
      }
    }

    // Si aucun résultat semestriel n'est encore saisi, récupérer au moins les étudiants inscrits dans la classe
    if (allStudentsMap.size === 0) {
      const classStudents = await readDb.query.students.findMany({
        where: eq(students.classId, classId),
        orderBy: [asc(students.nomEtudiant)],
      });
      for (const st of classStudents) {
        allStudentsMap.set(st.id, {
          student: {
            id: st.id,
            matricule: st.numAdmission,
            nom: st.nomEtudiant,
            sexe: st.sexe,
            photoUrl: st.photoPath,
          },
          sem1: null,
          sem2: null,
        });
      }
    }

    const annualCohort = Array.from(allStudentsMap.values()).map(({ student, sem1: d1, sem2: d2 }) => {
      const s1Avg = d1 && typeof d1.semesterAverage === "number" && !isNaN(d1.semesterAverage) ? d1.semesterAverage : 0;
      const s1Credits = d1 && typeof d1.creditsAcquired === "number" && !isNaN(d1.creditsAcquired) ? d1.creditsAcquired : 0;
      const s1Valid = d1 ? !!d1.isSemesterValidated : false;

      const s2Avg = d2 && typeof d2.semesterAverage === "number" && !isNaN(d2.semesterAverage) ? d2.semesterAverage : 0;
      const s2Credits = d2 && typeof d2.creditsAcquired === "number" && !isNaN(d2.creditsAcquired) ? d2.creditsAcquired : 0;
      const s2Valid = d2 ? !!d2.isSemesterValidated : false;

      // Calcul de la Moyenne Générale Annuelle (MGA)
      const countEvaluated = (d1 ? 1 : 0) + (d2 ? 1 : 0);
      const annualAverage = countEvaluated > 0 ? Number(((s1Avg + s2Avg) / countEvaluated).toFixed(2)) : 0;
      const totalCreditsAcquired = Number((s1Credits + s2Credits).toFixed(1)); // sur 60 ECTS

      // Règle de décision annuelle selon le référentiel LMD / REESAO / CAMES:
      // 1. Admis : 60 crédits validés OU Moyenne annuelle >= 10.00 et pas d'éliminatoire
      // 2. Admis par Enjambement (Dettes) : >= 45 ECTS (75% des crédits acquis)
      // 3. Ajourné : < 45 ECTS
      let decision = "Ajourné (Redoublement)";
      let isAnnualValidated = false;
      let isEnjambement = false;

      if (totalCreditsAcquired >= 60 || (s1Valid && s2Valid) || (annualAverage >= 10.00 && totalCreditsAcquired >= 54)) {
        decision = "Admis en Année Supérieure";
        isAnnualValidated = true;
      } else if (totalCreditsAcquired >= 45.0) {
        decision = "Admis par Enjambement (Avec Dettes)";
        isEnjambement = true;
      } else {
        decision = "Ajourné (Redoublement)";
      }

      let mention = "Ajourné";
      if (annualAverage >= 16.0) mention = "Très Bien";
      else if (annualAverage >= 14.0) mention = "Bien";
      else if (annualAverage >= 12.0) mention = "Assez Bien";
      else if (annualAverage >= 10.0) mention = "Passable";

      return {
        student,
        sem1: {
          name: sem1,
          average: s1Avg,
          creditsAcquired: s1Credits,
          isValidated: s1Valid,
          decision: d1?.decision || "Non évalué",
          ueResults: d1?.ueResults || [],
        },
        sem2: {
          name: sem2,
          average: s2Avg,
          creditsAcquired: s2Credits,
          isValidated: s2Valid,
          decision: d2?.decision || "Non évalué",
          ueResults: d2?.ueResults || [],
        },
        annual: {
          annualAverage,
          totalCreditsAcquired,
          totalCreditsTarget: 60.0,
          decision,
          mention,
          isAnnualValidated,
          isEnjambement,
          cycleLevel,
        },
      };
    });

    // 4. Classement selon la moyenne générale annuelle
    annualCohort.sort((a, b) => (b.annual?.annualAverage || 0) - (a.annual?.annualAverage || 0));

    const rankedCohort = annualCohort.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    const totalStudents = rankedCohort.length;
    const passedCount = rankedCohort.filter((c) => c.annual.isAnnualValidated).length;
    const enjambementCount = rankedCohort.filter((c) => c.annual.isEnjambement).length;
    const ajournesCount = totalStudents - passedCount - enjambementCount;
    const successRate = totalStudents > 0 ? Number((((passedCount + enjambementCount) / totalStudents) * 100).toFixed(1)) : 0;

    return {
      success: true,
      data: {
        sem1Name: sem1,
        sem2Name: sem2,
        cycleLevel,
        uesSem1: resSem1.data?.ues || [],
        uesSem2: resSem2.data?.ues || [],
        cohort: rankedCohort,
        totalStudents,
        passedCount,
        enjambementCount,
        ajournesCount,
        successRate,
      },
    };
  } catch (error: any) {
    console.error("[getLmdAnnualDeliberation] Critical Error:", error);
    return { success: false, error: error.message || "Erreur interne lors du calcul du bilan annuel" };
  }
}

// ─── 9. VALIDATION ET CLÔTURE DE LA DÉLIBÉRATION ANNUELLE ─────────────────────
export async function saveLmdAnnualDeliberation(data: {
  programId: number;
  classId: number;
  sessionId: number;
  cycleLevel: string;
  cohort: any[];
}) {
  try {
    for (const item of data.cohort) {
      const studentId = item.student.id;
      const annual = item.annual;

      const existingSem = await readDb.query.studentLmdSemesters.findFirst({
        where: and(
          eq(studentLmdSemesters.studentId, studentId),
          eq(studentLmdSemesters.semester, `Annuel-${data.cycleLevel}`),
          eq(studentLmdSemesters.sessionId, data.sessionId)
        )
      });

      if (existingSem) {
        await db.update(studentLmdSemesters).set({
          programId: data.programId,
          classId: data.classId,
          semesterAverage: annual.annualAverage,
          creditsAcquired: annual.totalCreditsAcquired,
          totalCreditsAccumulated: annual.totalCreditsAcquired,
          decision: annual.decision,
          mention: annual.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(studentLmdSemesters.id, existingSem.id));
      } else {
        await db.insert(studentLmdSemesters).values({
          studentId,
          programId: data.programId,
          classId: data.classId,
          semester: `Annuel-${data.cycleLevel}`,
          sessionId: data.sessionId,
          semesterAverage: annual.annualAverage,
          creditsAcquired: annual.totalCreditsAcquired,
          totalCreditsAccumulated: annual.totalCreditsAcquired,
          decision: annual.decision,
          mention: annual.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
        });
      }
    }

    revalidatePath("/dashboard/academics/lmd/deliberation");
    return {
      success: true,
      message: `Délibération annuelle (${data.cycleLevel} - Bilan 60 ECTS) validée et clôturée avec succès pour ${data.cohort.length} étudiant(s).`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


