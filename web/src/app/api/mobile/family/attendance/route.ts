import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { users } from "@/infrastructure/database/schema/auth";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  let studentId = Number(searchParams.get("studentId"));

  // 1. Check direct user.studentId
  if (!studentId && (user.studentId || (user as any).student_id)) {
    studentId = Number(user.studentId || (user as any).student_id);
  }

  // 2. Resolve by username / matricule / email
  if (!studentId && user.utilisateur) {
    const cleanUser = user.utilisateur.trim();
    const login = cleanUser.includes("@") ? cleanUser.split("@")[0] : cleanUser;

    const student = await readDb.query.students.findFirst({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        sql`(${students.numAdmission} ILIKE ${cleanUser} OR ${students.numAdmission} ILIKE ${login} OR ${students.nomEtudiant} ILIKE ${cleanUser})`
      ),
      columns: { id: true },
    });

    if (student) {
      studentId = student.id;
      if (!user.studentId && user.id) {
        try {
          await db.update(users).set({ studentId: student.id }).where(eq(users.id, user.id));
        } catch (_) {}
      }
    }
  }

  if (!studentId) {
    return mobileJsonError("Profil élève introuvable pour ce compte.", 404);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const rowsRes = await readDb.execute(sql`
      SELECT a.id, a.student_id, a.class_id, a.subject_id, a.employee_id, a.date, a.status, a.remark, a.recorded_by,
             s.subject_name, e.nom as teacher_name
      FROM student_attendance a
      LEFT JOIN school_subjects s ON a.subject_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.student_id = ${studentId}
      ORDER BY a.date DESC
    `);

    const rawRows = ((rowsRes as any).rows || rowsRes) as any[];

    let data = rawRows.map((r) => {
      const subjectName = r.subject_name || "Séance générale";
      const teacherName = r.teacher_name || "Enseignant";
      const dateStr = r.date ? (typeof r.date === "string" ? r.date : new Date(r.date).toISOString()) : null;

      return {
        id: r.id,
        student_id: r.student_id,
        class_id: r.class_id,
        subject_id: r.subject_id,
        date: dateStr,
        status: r.status || "Présent",
        remark: r.remark || "—",
        subject_name: subjectName,
        teacher_name: teacherName,
        school_subjects: { subject_name: subjectName },
        employees: { nom: teacherName },
      };
    });

    // If studentAttendance is empty, inspect studentResults for bulletin-recorded absences
    if (data.length === 0) {
      const resultsWithAbsences = await readDb.query.studentResults.findMany({
        where: eq(studentResults.studentId, studentId),
        with: {
          subject: true,
        },
      }).catch(() => []);

      for (const res of resultsWithAbsences) {
        const count = res.absences || 0;
        if (count > 0) {
          const subName = res.subject?.subjectName || "Matière";
          for (let i = 0; i < Math.min(count, 5); i++) {
            data.push({
              id: 900000 + res.id * 10 + i,
              student_id: studentId,
              class_id: res.classId || 0,
              subject_id: res.subjectId,
              date: new Date().toISOString(),
              status: "Absent",
              remark: `Absence relevée (${res.term || "Trimestre"})`,
              subject_name: subName,
              teacher_name: "Enseignant",
              school_subjects: { subject_name: subName },
              employees: { nom: "Enseignant" },
            });
          }
        }
      }
    }

    let presents = 0;
    let absents = 0;
    let late = 0;
    let justified = 0;

    data.forEach((d) => {
      const s = (d.status || "").toLowerCase();
      const r = (d.remark || "").toLowerCase();
      if (s.includes("retard") || s.includes("late")) {
        late++;
      } else if (s.includes("excus") || s.includes("justif") || r.includes("just")) {
        justified++;
      } else if (s.includes("abs")) {
        absents++;
      } else if (s.includes("présent") || s.includes("present")) {
        presents++;
      }
    });

    const totalSessions = data.length;
    const rate = totalSessions > 0
      ? Number((((presents + justified) / totalSessions) * 100).toFixed(1))
      : 100.0;

    return NextResponse.json({
      success: true,
      data,
      stats: {
        total_incidents: totalSessions,
        presents,
        absents,
        unjustified: absents,
        justified,
        late,
        attendance_rate: rate,
      },
    });
  } catch (err: any) {
    console.error("API mobile family attendance error:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const studentId = Number(body.studentId || user.studentId);
    const reason = body.reason || "Raison médicale";
    const notes = body.notes || "";
    const targetDate = body.date ? new Date(body.date) : new Date();

    if (!studentId) {
      return mobileJsonError("studentId requis", 400);
    }

    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }

    await db.insert(studentAttendance).values({
      studentId: studentId,
      date: targetDate,
      status: "Excusé",
      remark: `[Justifié: ${reason}] ${notes ? `${notes} ` : ""}(Transmis par l'élève/parent le ${new Date().toLocaleDateString("fr-FR")})`,
      recordedBy: user.utilisateur || (user as any).email || "Espace Parent/Élève",
    });

    return NextResponse.json({
      success: true,
      message: "Demande de justification enregistrée avec succès.",
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
