import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { lmsCertificates, lmsCourses } from "@/infrastructure/database/schema/lms";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    let studentId = user.studentId;
    if (studentIdParam) {
      studentId = Number(studentIdParam);
    }

    if (!studentId) {
      // If admin/teacher, return latest certificates
      const allCerts = await db.query.lmsCertificates.findMany({
        with: {
          course: true,
          student: true,
        },
        limit: 20,
        orderBy: [desc(lmsCertificates.issueDate)],
      });
      return NextResponse.json({
        success: true,
        data: allCerts.map((c) => ({
          ...c,
          courseTitle: c.course?.title || "Formation",
          studentName: c.student?.nomEtudiant || "Élève",
        })),
      });
    }

    const certs = await db.query.lmsCertificates.findMany({
      where: eq(lmsCertificates.studentId, studentId),
      with: {
        course: true,
      },
      orderBy: [desc(lmsCertificates.issueDate)],
    });

    const enriched = certs.map((c) => ({
      ...c,
      courseTitle: c.course?.title || "Formation",
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (e: any) {
    console.error("[LMS Certificates API Error]:", e);
    return mobileJsonError(e?.message || "Erreur serveur", 500);
  }
}
