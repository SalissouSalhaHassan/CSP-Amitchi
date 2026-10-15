import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getStudents } from "@/domains/students/actions/students.actions";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const activeSchoolId = await getActiveSchoolId();

    // 1. Total students count in table
    const totalCountRes = await db.execute(sql`SELECT count(*)::int as count FROM students`);
    const totalStudentsInDb = Number((totalCountRes as any)[0]?.count ?? 0);

    // 2. Distinct schoolIds found on students table
    const schoolIdsOnStudents = await db.execute(sql`
      SELECT school_id, count(*)::int as count 
      FROM students 
      GROUP BY school_id
    `);

    // 3. All schools in db
    const allSchools = await db.select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug
    }).from(schools);

    // 4. Test what getStudents() actually returns
    const studentsActionResult = await getStudents();

    return NextResponse.json({
      success: true,
      diagnostics: {
        currentUser: currentUser ? {
          id: currentUser.id,
          nomPrenom: currentUser.nomPrenom,
          utilisateur: currentUser.utilisateur,
          admin: currentUser.admin,
          superAdmin: currentUser.superAdmin,
          schoolId: currentUser.schoolId,
          roleName: currentUser.role?.roleName,
          educationalLevel: currentUser.educationalLevel
        } : null,
        activeSchoolId,
        totalStudentsInDb,
        studentsPerSchoolId: schoolIdsOnStudents,
        allSchools,
        getStudentsReturnedCount: Array.isArray(studentsActionResult?.data) 
          ? studentsActionResult.data.length 
          : ((studentsActionResult?.data as any)?.data?.length ?? 0),
        getStudentsError: studentsActionResult?.error || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
