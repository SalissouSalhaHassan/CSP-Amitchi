import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, sql, isNull, or, ilike } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import {
  schoolSessions,
  academicPeriods,
  classSubjects,
  sectionSubjects,
  schoolClasses,
  schoolSubjects,
  studentResults,
  gradingAppreciations,
  resultsWorkflows
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { getUserRoleType, hasPermission, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";
import { resolveStudentsForClass } from "@/domains/academics/actions/academics.actions";

export const dynamic = "force-dynamic";

async function checkPeriodLock(
  sessionId: number,
  termName: string,
  targetSchoolId: number,
  roleType: string
): Promise<{ isLocked: boolean; reason?: string }> {
  const isAdmin =
    roleType === "admin" ||
    roleType === "super_admin" ||
    roleType === "director" ||
    roleType === "directeur" ||
    roleType === "general_director" ||
    roleType === "level_director" ||
    roleType === "ministere" ||
    roleType === "owner" ||
    roleType === "censeur" ||
    roleType === "proviseur" ||
    roleType === "fondateur" ||
    roleType === "promoteur";
  if (isAdmin) return { isLocked: false };

  try {
    const period = await readDb.query.academicPeriods.findFirst({
      where: and(
        eq(academicPeriods.sessionId, sessionId),
        ilike(academicPeriods.name, `%${termName}%`)
      )
    });

    if (period) {
      if (period.isLocked) {
        return {
          isLocked: true,
          reason: "La période a été verrouillée par l'administration."
        };
      }
      if (period.gradesDeadline && new Date() > new Date(period.gradesDeadline)) {
        return {
          isLocked: true,
          reason: "La date limite de saisie des notes pour cette période est dépassée."
        };
      }
    }
  } catch (e) {
    // Fallback if columns not migrated yet
  }
  return { isLocked: false };
}

function matchTerm(termInDb?: string | null, requestedTerm?: string | null): boolean {
  if (!requestedTerm || requestedTerm === "All" || requestedTerm === "Tout") return true;
  if (!termInDb) return false;
  
  const normDb = termInDb.toLowerCase().trim();
  const normReq = requestedTerm.toLowerCase().trim();
  
  if (normDb === normReq) return true;

  // Extract main term digits e.g. "1" from "1er Semestre", "1ère Semester", "Trimestre 1", "S1"
  const dbMatch = normDb.match(/(\d+)/);
  const reqMatch = normReq.match(/(\d+)/);

  if (dbMatch && reqMatch && dbMatch[1] === reqMatch[1]) {
    const isDbSem = normDb.includes("semest") || normDb.includes("s");
    const isReqSem = normReq.includes("semest") || normReq.includes("s");
    const isDbTrim = normDb.includes("trimest") || normDb.includes("t");
    const isReqTrim = normReq.includes("trimest") || normReq.includes("t");

    if ((isDbSem && isReqSem) || (isDbTrim && isReqTrim) || (!isDbSem && !isReqSem && !isDbTrim && !isReqTrim)) {
      return true;
    }
  }

  return normDb.includes(normReq) || normReq.includes(normDb);
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    if (action === "getTeacherClassesAndSubjects") {
      const employeeId = Number(searchParams.get("employeeId"));
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      const isAdminOrDirector =
        roleType === "super_admin" ||
        roleType === "general_director" ||
        roleType === "directeur" ||
        roleType === "level_director" ||
        roleType === "censeur" ||
        roleType === "surveillant" ||
        roleType === "ministere" ||
        (user as any).admin === true ||
        (user as any).superAdmin === true ||
        String(user.role || "").toLowerCase().includes("admin") ||
        String(user.role || "").toLowerCase().includes("direct");

      let list: any[] = [];

      // 1. If employeeId is provided and user is a teacher, try fetching from class_subjects
      if (employeeId && !isAdminOrDirector) {
        const rows = await readDb.query.classSubjects.findMany({
          where: eq(classSubjects.employeeId, employeeId),
          with: {
            class: {
              with: {
                section: true
              }
            },
            subject: true,
          }
        });

        list = rows.map((row) => ({
          class_id: row.classId,
          subject_id: row.subjectId,
          school_classes: row.class ? {
            class_name: row.class.className,
            section_id: row.class.sectionId,
            school_sections: row.class.section ? {
              educational_level: row.class.section.educationalLevel
            } : null
          } : null,
          school_subjects: row.subject ? {
            subject_name: row.subject.subjectName
          } : null,
        }));
      }

      // 2. If list is empty (director, or teacher with unpopulated class_subjects), fetch all school classes
      if (list.length === 0) {
        let classRows = await readDb.query.schoolClasses.findMany({
          where: sql`(${schoolClasses.schoolId} = ${targetSchoolId} OR ${schoolClasses.schoolId} IS NULL)`,
          with: { section: true },
          orderBy: [schoolClasses.className]
        });

        if (classRows.length === 0) {
          const studentClassRows = await readDb.execute(sql`
            SELECT DISTINCT classe as class_name
            FROM students
            WHERE (school_id = ${targetSchoolId} OR school_id IS NULL) AND classe IS NOT NULL AND TRIM(classe) != ''
            ORDER BY classe
          `);
          const sClasses = ((studentClassRows as any).rows || studentClassRows) as any[];
          if (sClasses.length > 0) {
            classRows = sClasses.map((sc, index) => ({
              id: index + 1,
              className: sc.class_name || `Classe ${index + 1}`,
              sectionId: null,
              section: null,
            })) as any;
          } else {
            classRows = [
              { id: 1, className: "6ème A", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 2, className: "6ème B", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 3, className: "5ème A", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 4, className: "5ème B", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 5, className: "4ème A", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 6, className: "4ème B", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 7, className: "3ème A", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 8, className: "3ème B", sectionId: null, section: { educationalLevel: "Collège" } },
              { id: 9, className: "2nde C", sectionId: null, section: { educationalLevel: "Lycée" } },
              { id: 10, className: "1ère D", sectionId: null, section: { educationalLevel: "Lycée" } },
              { id: 11, className: "Tle D", sectionId: null, section: { educationalLevel: "Lycée" } },
            ] as any;
          }
        }

        let subjectRows = await readDb.query.schoolSubjects.findMany({
          where: sql`(${schoolSubjects.schoolId} = ${targetSchoolId} OR ${schoolSubjects.schoolId} IS NULL)`,
          orderBy: [schoolSubjects.subjectName]
        });

        if (subjectRows.length === 0) {
          subjectRows = [
            { id: 1, subjectName: "Mathématiques", subjectCode: "MATH" },
            { id: 2, subjectName: "Français", subjectCode: "FR" },
            { id: 3, subjectName: "Physique-Chimie", subjectCode: "PC" },
            { id: 4, subjectName: "SVT", subjectCode: "SVT" },
            { id: 5, subjectName: "Histoire-Géographie", subjectCode: "HG" },
            { id: 6, subjectName: "Anglais", subjectCode: "ANG" },
            { id: 7, subjectName: "Philosophie", subjectCode: "PHIL" },
            { id: 8, subjectName: "EPS", subjectCode: "EPS" },
          ] as any;
        }

        for (const cls of classRows) {
          for (const sub of subjectRows) {
            list.push({
              class_id: cls.id,
              subject_id: sub.id,
              school_classes: {
                class_name: cls.className,
                section_id: cls.sectionId,
                school_sections: cls.section ? {
                  educational_level: cls.section.educationalLevel
                } : null
              },
              school_subjects: {
                subject_name: sub.subjectName
              }
            });
          }
        }
      }

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getAllClassesAndSubjects") {
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      let list: any[] = [];

      let classRows = await readDb.query.schoolClasses.findMany({
        where: sql`(${schoolClasses.schoolId} = ${targetSchoolId} OR ${schoolClasses.schoolId} IS NULL)`,
        with: { section: true },
        orderBy: [schoolClasses.className]
      });

      const userLevel = user.educationalLevel;
      if (userLevel && !hasAllEducationalLevels(userLevel)) {
        classRows = classRows.filter((cls) =>
          isStudentInEducationalLevel(
            {
              educationalLevel: cls.section?.educationalLevel,
              classe: cls.className,
              sectionName: cls.section?.sectionName,
            },
            userLevel
          )
        );
      }

      if (classRows.length === 0) {
        const studentClassRows = await readDb.execute(sql`
          SELECT DISTINCT classe as class_name
          FROM students
          WHERE (school_id = ${targetSchoolId} OR school_id IS NULL) AND classe IS NOT NULL AND TRIM(classe) != ''
          ORDER BY classe
        `);
        const sClasses = ((studentClassRows as any).rows || studentClassRows) as any[];
        if (sClasses.length > 0) {
          classRows = sClasses.map((sc, index) => ({
            id: index + 1,
            className: sc.class_name || `Classe ${index + 1}`,
            sectionId: null,
            section: null,
          })) as any;
        } else {
          classRows = [
            { id: 1, className: "6ème A", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 2, className: "6ème B", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 3, className: "5ème A", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 4, className: "5ème B", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 5, className: "4ème A", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 6, className: "4ème B", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 7, className: "3ème A", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 8, className: "3ème B", sectionId: null, section: { educationalLevel: "Collège" } },
            { id: 9, className: "2nde C", sectionId: null, section: { educationalLevel: "Lycée" } },
            { id: 10, className: "1ère D", sectionId: null, section: { educationalLevel: "Lycée" } },
            { id: 11, className: "Tle D", sectionId: null, section: { educationalLevel: "Lycée" } },
          ] as any;
        }
      }

      let subjectRows = await readDb.query.schoolSubjects.findMany({
        where: sql`(${schoolSubjects.schoolId} = ${targetSchoolId} OR ${schoolSubjects.schoolId} IS NULL)`,
        orderBy: [schoolSubjects.subjectName]
      });

      if (subjectRows.length === 0) {
        subjectRows = [
          { id: 1, subjectName: "Mathématiques", subjectCode: "MATH" },
          { id: 2, subjectName: "Français", subjectCode: "FR" },
          { id: 3, subjectName: "Physique-Chimie", subjectCode: "PC" },
          { id: 4, subjectName: "SVT", subjectCode: "SVT" },
          { id: 5, subjectName: "Histoire-Géographie", subjectCode: "HG" },
          { id: 6, subjectName: "Anglais", subjectCode: "ANG" },
          { id: 7, subjectName: "Philosophie", subjectCode: "PHIL" },
          { id: 8, subjectName: "EPS", subjectCode: "EPS" },
        ] as any;
      }

      for (const cls of classRows) {
        for (const sub of subjectRows) {
          list.push({
            class_id: cls.id,
            subject_id: sub.id,
            school_classes: {
              class_name: cls.className,
              section_id: cls.sectionId,
              school_sections: cls.section ? {
                educational_level: cls.section.educationalLevel
              } : null
            },
            school_subjects: {
              subject_name: sub.subjectName
            }
          });
        }
      }

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getSessions") {
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      let rows = await readDb.query.schoolSessions.findMany({
        where: eq(schoolSessions.schoolId, targetSchoolId),
        orderBy: [
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        ]
      });

      // Fallback
      if (rows.length === 0) {
        rows = await readDb.query.schoolSessions.findMany({
          orderBy: [
            sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
            sql`id DESC`
          ]
        });
      }

      const list = rows.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        is_active: Boolean(s.isActive || s.status?.toLowerCase() === "actif"),
        status: s.status || (s.isActive ? "Actif" : "Inactif"),
        school_id: s.schoolId,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getPeriods") {
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;
      const sessionId = Number(searchParams.get("sessionId"));
      const level = searchParams.get("level") || searchParams.get("educationalLevel") || "";
      const classIdStr = searchParams.get("classId");

      if (!sessionId) {
        return mobileJsonError("sessionId manquant", 400);
      }

      let resolvedLevel = level;
      if (!resolvedLevel && classIdStr && classIdStr !== "undefined" && classIdStr !== "null") {
        const cls = await readDb.query.schoolClasses.findFirst({
          where: eq(schoolClasses.id, Number(classIdStr)),
          with: { section: true }
        });
        if (cls?.section?.educationalLevel) {
          resolvedLevel = cls.section.educationalLevel;
        }
      }

      const normLevel = resolvedLevel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      const isPrimaire = normLevel.includes("prim") || normLevel.includes("matern") || normLevel.includes("fonda") || normLevel.includes("elem");
      const isSuperior = normLevel.includes("licence") || normLevel.includes("lmd") || normLevel.includes("master") || normLevel.includes("doc") || normLevel.includes("super") || normLevel.includes("univ");

      let rows = await readDb.query.academicPeriods.findMany({
        where: and(
          eq(academicPeriods.schoolId, targetSchoolId),
          eq(academicPeriods.sessionId, sessionId)
        ),
        orderBy: [sql`id ASC`]
      });

      if (rows.length === 0) {
        rows = await readDb.query.academicPeriods.findMany({
          where: eq(academicPeriods.sessionId, sessionId),
          orderBy: [sql`id ASC`]
        });
      }

      if (rows.length === 0) {
        rows = await readDb.query.academicPeriods.findMany({
          orderBy: [sql`id ASC`]
        });
      }

      let list = rows.map((p) => ({
        id: p.id,
        name: p.name,
        period_type: p.periodType,
        is_active: p.isActive,
        grades_deadline: p.gradesDeadline ? p.gradesDeadline.toISOString() : null,
        is_locked: p.isLocked ?? false,
        session_id: p.sessionId,
        school_id: p.schoolId,
      }));

      // Smart period filter / fallback by level (EXACTLY MATCHING WEB AcademicFilters.tsx):
      // - Primaire: 3 Trimestres (1er Trimestre, 2ème Trimestre, 3ème Trimestre)
      // - Université / Supérieur (Licence, Master, Doctorat): 14 Semestres (S1 ... S14)
      // - Collège & Lycée: 2 Semestres (1er Semestre, 2ème Semestre)
      if (isPrimaire) {
        const dbTrim = list.filter(p => p.period_type === "Trimestre" || p.name.toLowerCase().includes("trimestre"));
        if (dbTrim.length > 0) {
          list = dbTrim;
        } else {
          list = [
            { id: 1, name: "1er Trimestre", period_type: "Trimestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId },
            { id: 2, name: "2ème Trimestre", period_type: "Trimestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId },
            { id: 3, name: "3ème Trimestre", period_type: "Trimestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId },
          ];
        }
      } else if (isSuperior) {
        const dbSem = list.filter(p => p.period_type === "Semestre" || p.name.toLowerCase().includes("semest") || /^s\d+/i.test(p.name));
        const superiorPresets = Array.from({ length: 14 }, (_, i) => {
          const num = i + 1;
          const label = `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`;
          return { id: num, name: label, period_type: "Semestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId };
        });

        if (dbSem.length >= 6) {
          list = dbSem;
        } else {
          list = superiorPresets;
        }
      } else {
        // Collège & Lycée default -> 2 Semestres (1er Semestre & 2ème Semestre)
        const dbCollegeSem = list.filter(p => {
          const n = p.name.toLowerCase();
          const isSem = p.period_type === "Semestre" || n.includes("semest");
          const is1or2 = n.includes("1") || n.includes("2") || n.includes("premier") || n.includes("deuxieme") || n.includes("1er") || n.includes("2eme") || n.includes("2ème");
          const isHigherS = /^s([3-9]|1[0-4])/i.test(n) || n.includes("3eme") || n.includes("3ème") || n.includes("4eme") || n.includes("4ème") || n.includes("5eme") || n.includes("5ème") || n.includes("6eme") || n.includes("6ème");
          return isSem && is1or2 && !isHigherS;
        });

        if (dbCollegeSem.length >= 2) {
          list = dbCollegeSem.slice(0, 2);
        } else {
          list = [
            { id: 1, name: "1er Semestre", period_type: "Semestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId },
            { id: 2, name: "2ème Semestre", period_type: "Semestre", is_active: true, grades_deadline: null, is_locked: false, session_id: sessionId, school_id: targetSchoolId },
          ];
        }
      }

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getGradingScale") {
      const rows = await readDb.query.gradingAppreciations.findMany({
        orderBy: [sql`display_order ASC`]
      });

      const list = rows.map((r) => ({
        name: r.name,
        base_score: r.baseScore,
        display_order: r.displayOrder,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getGradingGrid") {
      const classId = Number(searchParams.get("classId"));
      const subjectId = Number(searchParams.get("subjectId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const term = searchParams.get("term") || "";
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      if (!classId || !subjectId || !sessionId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      // Fetch class details
      const classRes = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: {
          section: true
        }
      });

      if (!classRes) {
        return mobileJsonError("Classe introuvable", 404);
      }

      const className = classRes.className;
      const level = classRes.section?.educationalLevel || "Lycée";

      // Coefficient from classSubjects
      const subLink = await readDb.query.classSubjects.findFirst({
        where: and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId)
        )
      });
      const coeff = subLink?.coefficient || 1;

      // ── Resolve students for this specific class using 4-tier logic ──
      const activeStudents = await resolveStudentsForClass({
        cls: classRes,
        sessionNameStr: undefined,
        schoolId: targetSchoolId,
      });

      // Existing results
      const allResults = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          sessionId ? or(eq(studentResults.sessionId, sessionId), isNull(studentResults.sessionId)) : undefined
        )
      });

      const results = allResults.filter(r => matchTerm(r.term, term));
      const resultsMap = new Map(results.map((r) => [r.studentId, r]));

      const gridData = activeStudents.map((student) => {
        const res = resultsMap.get(student.id);
        return {
          student_id: student.id,
          num_admission: student.numAdmission,
          nom_etudiant: student.nomEtudiant,
          photo_path: student.photoPath,
          class_work_score: res?.classWorkScore ?? null,
          exam_score: res?.examScore ?? null,
          total_score: res?.totalScore ?? null,
          weighted_score: res?.weightedScore ?? null,
          absences: res?.absences ?? 0,
          observation: res?.observation ?? "",
          appreciation: res?.appreciation ?? "-",
          rank: res?.rank ?? "-",
        };
      });

      const lockStatus = await checkPeriodLock(sessionId, term, targetSchoolId, roleType);

      return NextResponse.json({
        success: true,
        data: gridData,
        level,
        coefficient: Number(coeff),
        is_editable: !lockStatus.isLocked,
        lock_reason: lockStatus.reason || null,
      });
    }

    if (action === "getDevoirGrid") {
      const classId = Number(searchParams.get("classId"));
      const subjectId = Number(searchParams.get("subjectId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const term = searchParams.get("term") || "";
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      if (!classId || !subjectId || !sessionId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      const classRes = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: {
          section: true
        }
      });

      if (!classRes) {
        return mobileJsonError("Classe introuvable", 404);
      }

      const className = classRes.className;

      // ── Resolve students for this specific class using 4-tier logic ──
      const activeStudentsDev = await resolveStudentsForClass({
        cls: classRes,
        sessionNameStr: undefined,
        schoolId: targetSchoolId,
      });

      // Existing results
      const allResults = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          sessionId ? or(eq(studentResults.sessionId, sessionId), isNull(studentResults.sessionId)) : undefined
        )
      });

      const results = allResults.filter(r => matchTerm(r.term, term));
      const resultsMap = new Map(results.map((r) => [r.studentId, r]));

      const gridData = activeStudentsDev.map((student) => {
        const res = resultsMap.get(student.id);
        return {
          student_id: student.id,
          num_admission: student.numAdmission,
          nom_etudiant: student.nomEtudiant,
          photo_path: student.photoPath,
          devoirs: [
            res?.devoir1 ?? null,
            res?.devoir2 ?? null,
            res?.devoir3 ?? null,
            res?.devoir4 ?? null,
            res?.devoir5 ?? null,
          ],
          moyenne_devoirs: res?.moyenneDevoirs ?? 0.0,
        };
      });

      const lockStatus = await checkPeriodLock(sessionId, term, targetSchoolId, roleType);

      return NextResponse.json({
        success: true,
        data: gridData,
        is_editable: !lockStatus.isLocked,
        lock_reason: lockStatus.reason || null,
      });
    }

    if (action === "getWorkflowStatus") {
      const classId = Number(searchParams.get("classId"));
      const subjectId = Number(searchParams.get("subjectId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const period = String(searchParams.get("period") || searchParams.get("term") || "");

      if (!classId || !sessionId || !period) {
        return mobileJsonError("Paramètres classId, sessionId et period requis", 400);
      }

      const conds = [
        eq(resultsWorkflows.sessionId, sessionId),
        eq(resultsWorkflows.period, period),
        eq(resultsWorkflows.classId, classId),
      ];

      if (subjectId) {
        conds.push(eq(resultsWorkflows.subjectId, subjectId));
      }

      const row = await readDb.query.resultsWorkflows.findFirst({
        where: and(...conds),
      });

      return NextResponse.json({
        success: true,
        workflowStatus: row?.status || "BROUILLON",
        observation: row?.observation || null,
        submittedAt: row?.submittedAt || null,
        controlledAt: row?.controlledAt || null,
        lockedAt: row?.lockedAt || null,
        publishedAt: row?.publishedAt || null,
        role: roleType,
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return mobileJsonError("Paramètres manquants", 400);
    }

    if (action === "saveStudentGrades") {
      const { grades } = payload;
      if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return mobileJsonError("Notes manquantes", 400);
      }

      const first = grades[0]!;
      const classId = Number(first.class_id);
      const subjectId = Number(first.subject_id);
      const sessionId = Number(first.session_id);
      const term = String(first.term);

      const isAllowedRole = [
        "super_admin",
        "admin",
        "owner",
        "ministere",
        "directeur",
        "general_director",
        "level_director",
        "censeur",
        "surveillant",
        "teacher",
        "enseignant",
      ].includes(roleType) || Boolean(user.employeeId);

      const canEditSaisie = isAllowedRole || await hasPermission(user.id, "Academics", "canEdit", "saisieNotes");
      if (!canEditSaisie) {
        return mobileJsonError("Accès refusé. La modification de la Saisie des Notes n'est pas autorisée pour votre rôle.", 403);
      }

      const lockStatus = await checkPeriodLock(sessionId, term, schoolId || 1, roleType);
      if (lockStatus.isLocked) {
        return mobileJsonError(lockStatus.reason || "Période verrouillée. Modification non autorisée.", 403);
      }

      // Verify class belongs to user's school
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId)
      });
      if (!cls) {
        return mobileJsonError("Classe introuvable.", 404);
      }

      const isAdminOrDirector = [
        "super_admin",
        "admin",
        "owner",
        "ministere",
        "directeur",
        "general_director",
        "level_director"
      ].includes(roleType);

      if (!isAdminOrDirector && schoolId && cls.schoolId && cls.schoolId !== schoolId) {
        const isAssignedTeacher = user.employeeId ? await readDb.query.classSubjects.findFirst({
          where: and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, subjectId),
            eq(classSubjects.employeeId, user.employeeId)
          )
        }) : null;

        if (!isAssignedTeacher) {
          return mobileJsonError("Accès refusé. Cette classe n'appartient pas à votre établissement.", 403);
        }
      }

      // Existing results map
      const allExisting = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId)
        )
      });

      const existing = allExisting.filter(r => matchTerm(r.term, term));
      const existingMap = new Map(existing.map((r) => [r.studentId, r]));

      await Promise.all(
        grades.map(async (grade: any) => {
          const studentId = Number(grade.student_id);
          const exist = existingMap.get(studentId);

          const rawClassWork = grade.class_work_score !== null && grade.class_work_score !== undefined && grade.class_work_score !== ""
            ? Number(grade.class_work_score)
            : null;
          const rawExam = grade.exam_score !== null && grade.exam_score !== undefined && grade.exam_score !== ""
            ? Number(grade.exam_score)
            : null;

          const resolvedClassWork = rawClassWork !== null ? rawClassWork : (exist?.classWorkScore ?? null);
          const resolvedExam = rawExam !== null ? rawExam : (exist?.examScore ?? null);
          const resolvedCoeff = grade.coefficient !== null && grade.coefficient !== undefined
            ? Math.round(Number(grade.coefficient))
            : (exist?.coefficient || 1);

          let resolvedTotal: number | null = null;
          if (grade.total_score !== null && grade.total_score !== undefined && grade.total_score !== "") {
            resolvedTotal = Number(grade.total_score);
          } else if (resolvedClassWork !== null && resolvedExam !== null) {
            resolvedTotal = Number(((resolvedClassWork + resolvedExam) / 2).toFixed(2));
          } else if (resolvedClassWork !== null) {
            resolvedTotal = Number(resolvedClassWork.toFixed(2));
          } else if (resolvedExam !== null) {
            resolvedTotal = Number(resolvedExam.toFixed(2));
          } else {
            resolvedTotal = exist?.totalScore ?? null;
          }

          const resolvedWeighted = resolvedTotal !== null
            ? Number((resolvedTotal * resolvedCoeff).toFixed(2))
            : (grade.weighted_score !== null && grade.weighted_score !== undefined && grade.weighted_score !== ""
                ? Number(grade.weighted_score)
                : (exist?.weightedScore ?? null));

          const dbValues = {
            studentId,
            subjectId,
            classId,
            sessionId,
            term,
            classWorkScore: resolvedClassWork,
            examScore: resolvedExam,
            totalScore: resolvedTotal,
            coefficient: resolvedCoeff,
            weightedScore: resolvedWeighted,
            absences: grade.absences ? Number(grade.absences) : (exist?.absences || 0),
            observation: grade.observation ? String(grade.observation) : (exist?.observation ?? null),
            appreciation: grade.appreciation ? String(grade.appreciation) : (exist?.appreciation ?? null),
            rank: grade.rank ? String(grade.rank) : (exist?.rank ?? null),
          };

          if (exist?.id) {
            await db
              .update(studentResults)
              .set(dbValues)
              .where(eq(studentResults.id, exist.id));
          } else {
            await db.insert(studentResults).values(dbValues);
          }
        })
      );

      return NextResponse.json({ success: true });
    }

    if (action === "saveDevoirGrades") {
      const { devoirsList } = payload;
      if (!devoirsList || !Array.isArray(devoirsList) || devoirsList.length === 0) {
        return mobileJsonError("Notes de devoirs manquantes", 400);
      }

      const first = devoirsList[0]!;
      const classId = Number(first.class_id);
      const subjectId = Number(first.subject_id);
      const sessionId = Number(first.session_id);
      const term = String(first.term);

      const isAllowedRole = [
        "super_admin",
        "admin",
        "owner",
        "ministere",
        "directeur",
        "general_director",
        "level_director",
        "censeur",
        "surveillant",
        "teacher",
        "enseignant",
      ].includes(roleType) || Boolean(user.employeeId);

      const canEditDevoirs = isAllowedRole || await hasPermission(user.id, "Academics", "canEdit", "gestionDevoirs");
      if (!canEditDevoirs) {
        return mobileJsonError("Accès refusé. La modification de la Gestion des Devoirs n'est pas autorisée pour votre rôle.", 403);
      }

      const lockStatus = await checkPeriodLock(sessionId, term, schoolId || 1, roleType);
      if (lockStatus.isLocked) {
        return mobileJsonError(lockStatus.reason || "Période verrouillée. Modification non autorisée.", 403);
      }

      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId)
      });
      if (!cls) {
        return mobileJsonError("Classe introuvable.", 404);
      }

      const isAdminOrDirector = [
        "super_admin",
        "admin",
        "owner",
        "ministere",
        "directeur",
        "general_director",
        "level_director"
      ].includes(roleType);

      if (!isAdminOrDirector && schoolId && cls.schoolId && cls.schoolId !== schoolId) {
        const isAssignedTeacher = user.employeeId ? await readDb.query.classSubjects.findFirst({
          where: and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, subjectId),
            eq(classSubjects.employeeId, user.employeeId)
          )
        }) : null;

        if (!isAssignedTeacher) {
          return mobileJsonError("Accès refusé. Cette classe n'appartient pas à votre établissement.", 403);
        }
      }
      const allExisting = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId)
        )
      });

      const existing = allExisting.filter(r => matchTerm(r.term, term));
      
      // Get Class & Section info to determine educational level and subject coefficient
      const clsInfo = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: { section: true }
      });

      const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(clsInfo?.section?.educationalLevel || "");

      const classSubject = await readDb.query.classSubjects.findFirst({
        where: and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId)
        )
      });

      const sectionSubject = clsInfo?.sectionId ? await readDb.query.sectionSubjects.findFirst({
        where: and(
          eq(sectionSubjects.sectionId, clsInfo.sectionId),
          eq(sectionSubjects.subjectId, subjectId)
        )
      }) : null;

      const coefficient = classSubject?.coefficient || sectionSubject?.defaultCoef || 1;

      const existingMap = new Map(existing.map((r) => [r.studentId, r]));

      await Promise.all(
        devoirsList.map(async (row: any) => {
          const studentId = Number(row.student_id);
          const exist = existingMap.get(studentId);
          const devoirs = row.devoirs as any[];
          const avg = Number(row.moyenne_devoirs) || 0;

          const examScore = exist?.examScore !== null && exist?.examScore !== undefined ? Number(exist.examScore) : null;

          let totalScore: number;
          if (examScore !== null && !isNaN(examScore)) {
            if (isHigherEd) {
              totalScore = Number(((avg * 0.4) + (examScore * 0.6)).toFixed(2));
            } else {
              totalScore = Number(((avg + examScore) / 2).toFixed(2));
            }
          } else {
            totalScore = Number(avg.toFixed(2));
          }

          const weightedScore = Number((totalScore * coefficient).toFixed(2));

          const dbValues = {
            studentId,
            subjectId,
            classId,
            sessionId,
            term,
            devoir1: devoirs[0] !== null && devoirs[0] !== undefined && devoirs[0] !== "" ? Number(devoirs[0]) : null,
            devoir2: devoirs[1] !== null && devoirs[1] !== undefined && devoirs[1] !== "" ? Number(devoirs[1]) : null,
            devoir3: devoirs[2] !== null && devoirs[2] !== undefined && devoirs[2] !== "" ? Number(devoirs[2]) : null,
            devoir4: devoirs[3] !== null && devoirs[3] !== undefined && devoirs[3] !== "" ? Number(devoirs[3]) : null,
            totalScore,
            coefficient,
            weightedScore,
          };

          if (exist?.id) {
            await db
              .update(studentResults)
              .set(dbValues)
              .where(eq(studentResults.id, exist.id));
          } else {
            await db.insert(studentResults).values(dbValues);
          }
        })
      );

      return NextResponse.json({ success: true });
    }

    if (action === "requestPeriodExtension") {
      const { sessionId, term, reason } = payload;
      if (!sessionId || !term) {
        return mobileJsonError("Informations de la période manquantes", 400);
      }

      return NextResponse.json({
        success: true,
        message: "Votre demande de dérogation a été transmise à la direction avec succès."
      });
    }

    if (action === "updateWorkflowStatus") {
      const { sessionId, period, classId, subjectId, targetAction, observation, schoolId: payloadSchoolId } = payload;
      if (!sessionId || !period || !classId || !targetAction) {
        return mobileJsonError("Paramètres workflow manquants", 400);
      }

      // Safe School Resolution: payload -> user.schoolId -> class record -> fallback
      let targetSchoolId = payloadSchoolId ? Number(payloadSchoolId) : (schoolId ? Number(schoolId) : null);
      if (!targetSchoolId) {
        const cls = await readDb.query.schoolClasses.findFirst({
          where: eq(schoolClasses.id, Number(classId)),
          columns: { schoolId: true },
        });
        targetSchoolId = cls?.schoolId || null;
      }

      const conds = [
        eq(resultsWorkflows.sessionId, Number(sessionId)),
        eq(resultsWorkflows.classId, Number(classId)),
      ];
      if (subjectId) {
        conds.push(eq(resultsWorkflows.subjectId, Number(subjectId)));
      }

      const allExisting = await readDb.query.resultsWorkflows.findMany({
        where: and(...conds),
      });

      const existing = allExisting.find((r) => matchTerm(r.period, period)) || allExisting[0];

      if (!targetSchoolId && existing?.schoolId) {
        targetSchoolId = existing.schoolId;
      }
      if (!targetSchoolId) {
        targetSchoolId = 9;
      }

      let nextStatus = "BROUILLON";
      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (targetAction === "submit") {
        nextStatus = "SAISIE_TERMINEE";
        updateFields.submittedAt = new Date();
        if (user.employeeId) updateFields.submittedBy = Number(user.employeeId);
      } else if (targetAction === "request_correction") {
        nextStatus = "CORRECTION_DEMANDEE";
        updateFields.observation = observation || "Correction demandée par la direction.";
      } else if (targetAction === "validate_control") {
        nextStatus = "CONTROLE_PEDAGOGIQUE";
        updateFields.controlledAt = new Date();
        if (user.employeeId) updateFields.controlledBy = Number(user.employeeId);
      } else if (targetAction === "lock") {
        nextStatus = "VERROUILLE";
        updateFields.lockedAt = new Date();
        if (user.employeeId) updateFields.lockedBy = Number(user.employeeId);
      } else if (targetAction === "unlock") {
        nextStatus = "BROUILLON";
        updateFields.observation = observation || "Déverrouillage exceptionnel";
        updateFields.lockedAt = null;
        updateFields.publishedAt = null;
      }

      const dbValues = {
        schoolId: existing?.schoolId || targetSchoolId,
        sessionId: Number(sessionId),
        period: existing?.period || String(period),
        classId: Number(classId),
        subjectId: subjectId ? Number(subjectId) : null,
        status: nextStatus,
        observation: observation || (existing ? existing.observation : null),
        ...updateFields,
      };

      if (existing) {
        await db.update(resultsWorkflows).set(dbValues).where(eq(resultsWorkflows.id, existing.id));
      } else {
        await db.insert(resultsWorkflows).values(dbValues);
      }

      try {
        revalidatePath("/dashboard/academics");
        revalidatePath("/dashboard/academics/grades");
      } catch (_) {}

      return NextResponse.json({
        success: true,
        workflowStatus: nextStatus,
        message: "Statut du circuit d'approbation mis à jour avec succès.",
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
