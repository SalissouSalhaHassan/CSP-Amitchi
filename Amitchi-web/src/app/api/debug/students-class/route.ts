import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, and, ilike, or, sql } from "drizzle-orm";

// GET /api/debug/students-class?classId=36&schoolId=1
// Shows all distinct values in students table fields to diagnose matching issues
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = parseInt(searchParams.get("classId") || "0");
    const schoolId = parseInt(searchParams.get("schoolId") || "1");

    if (!classId) {
      return NextResponse.json({ 
        error: "classId requis.",
        example: "/api/debug/students-class?classId=36&schoolId=1",
        tip: "Cherchez le classId dans l'URL quand vous sélectionnez une classe dans les filtres."
      });
    }

    // 1. Get the class and section info
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });

    // 2. All distinct classe/section/educationalLevel values in the school
    const distinctValues = await db
      .select({
        classe: students.classe,
        section: students.section,
        educationalLevel: students.educationalLevel,
        count: sql<number>`count(*)::int`,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .groupBy(students.classe, students.section, students.educationalLevel)
      .orderBy(students.educationalLevel, students.section, students.classe);

    if (!cls) {
      return NextResponse.json({
        error: `Classe ${classId} introuvable`,
        schoolId,
        distinctValuesInStudentTable: distinctValues,
      });
    }

    const className = cls.className.trim();
    const sectionName = cls.section?.sectionName?.trim();
    const edLevel = cls.section?.educationalLevel?.trim();

    // 3. Try all possible match methods individually
    const [
      matchExact,
      matchIlike,
      matchIlikeWild,
      matchBySection,
      matchByEdLevel,
      matchBySectionOrEdLevel,
      allStudentsInSchool,
    ] = await Promise.all([
      // Exact match
      db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
        .from(students).where(and(eq(students.schoolId, schoolId), eq(students.classe, className))).limit(20),
      
      // ilike exact
      db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
        .from(students).where(and(eq(students.schoolId, schoolId), ilike(students.classe, className))).limit(20),
      
      // ilike wildcard
      db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
        .from(students).where(and(eq(students.schoolId, schoolId), ilike(students.classe, `%${className}%`))).limit(20),

      // By section name
      sectionName
        ? db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
            .from(students).where(and(eq(students.schoolId, schoolId), ilike(students.section, `%${sectionName}%`))).limit(20)
        : Promise.resolve([]),
      
      // By educational level
      edLevel
        ? db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
            .from(students).where(and(eq(students.schoolId, schoolId), ilike(students.educationalLevel, `%${edLevel}%`))).limit(20)
        : Promise.resolve([]),

      // By section OR educationalLevel
      (sectionName || edLevel)
        ? db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
            .from(students).where(and(
              eq(students.schoolId, schoolId),
              or(
                sectionName ? ilike(students.section, `%${sectionName}%`) : undefined,
                edLevel ? ilike(students.educationalLevel, `%${edLevel}%`) : undefined,
              )
            )).limit(30)
        : Promise.resolve([]),

      // Total count
      db.select({ id: students.id, name: students.nomEtudiant, classe: students.classe, section: students.section, educationalLevel: students.educationalLevel })
        .from(students).where(eq(students.schoolId, schoolId)).limit(10),
    ]);

    return NextResponse.json({
      classInfo: {
        id: cls.id,
        className,
        sectionId: cls.sectionId,
        sectionName,
        educationalLevel: edLevel,
      },
      matchResults: {
        exactClassName: { count: matchExact.length, samples: matchExact },
        ilikeClassName: { count: matchIlike.length, samples: matchIlike },
        ilikeWildcard: { count: matchIlikeWild.length, samples: matchIlikeWild },
        bySection: { count: matchBySection.length, samples: matchBySection },
        byEducationalLevel: { count: matchByEdLevel.length, samples: matchByEdLevel },
        bySectionOrEdLevel: { count: matchBySectionOrEdLevel.length, samples: matchBySectionOrEdLevel },
      },
      allDistinctCombinations: distinctValues,
      schoolStudentsSample: allStudentsInSchool,
      totalDistinctGroups: distinctValues.length,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
