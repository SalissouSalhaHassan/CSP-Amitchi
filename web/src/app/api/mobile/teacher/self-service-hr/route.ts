import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { employees, salaryRecords, teacherExtraHours, teacherHrRequests } from "@/infrastructure/database/schema/hr";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const userEmployee = (user as any).employee;

  try {
    // 1. Resolve Employee Profile
    let empProfile: any = userEmployee || null;
    let actualEmployeeId = userEmployee?.id || user.employeeId || null;

    if (!empProfile && actualEmployeeId) {
      const rows = await readDb
        .select()
        .from(employees)
        .where(eq(employees.id, actualEmployeeId))
        .limit(1);
      empProfile = rows[0] || null;
    }

    if (!empProfile) {
      // Find employee by email or mobile or name in school
      const userAny = user as any;
      const searchTerms = [user.utilisateur, user.nomPrenom, userAny.email, userAny.nom, userAny.mobile].filter(Boolean) as string[];
      for (const term of searchTerms) {
        const rows = await readDb
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.schoolId, schoolId),
              or(
                eq(employees.email, term),
                eq(employees.mobile, term),
                ilike(employees.nom, `%${term}%`)
              )
            )
          )
          .limit(1);
        if (rows.length > 0) {
          empProfile = rows[0];
          actualEmployeeId = empProfile.id;
          break;
        }
      }
    }

    if (!empProfile) {
      const anyEmp = await readDb
        .select()
        .from(employees)
        .where(eq(employees.schoolId, schoolId))
        .limit(1);
      if (anyEmp.length > 0) {
        empProfile = anyEmp[0];
        actualEmployeeId = empProfile.id;
      }
    }

    const teacherName =
      empProfile?.nom ||
      user.nomPrenom ||
      (user as any).name ||
      (user.utilisateur && !user.utilisateur.includes("@") ? user.utilisateur : user.utilisateur?.split("@")[0]) ||
      "Enseignant";

    const teacherPoste = empProfile?.poste || empProfile?.fonction || "Enseignant";
    const teacherMatricule = empProfile?.empId || `ENS-${actualEmployeeId || user.id}`;
    const baseSalary = Number(empProfile?.salaireBase) || 90000;
    const allowance = Math.round(baseSalary * 0.15); // standard primes ~ 15%
    const deduction = Math.round(baseSalary * 0.045); // standard cotisations ~ 4.5%
    const computedNet = baseSalary + allowance - deduction;

    // 2. Payslips / Salary Records from real database
    let payslips: any[] = [];
    if (actualEmployeeId) {
      payslips = await readDb
        .select({
          id: salaryRecords.id,
          monthYear: salaryRecords.monthYear,
          basicSalary: salaryRecords.basicSalary,
          totalAllowance: salaryRecords.totalAllowance,
          totalDeduction: salaryRecords.totalDeduction,
          netSalary: salaryRecords.netSalary,
          status: salaryRecords.status,
          paymentDate: salaryRecords.paymentDate,
          paymentMode: salaryRecords.paymentMode,
        })
        .from(salaryRecords)
        .where(eq(salaryRecords.employeeId, actualEmployeeId))
        .orderBy(desc(salaryRecords.id))
        .limit(12);
    }

    // 3. Extra Hours / Substitutions from real database
    let extraHours: any[] = [];
    if (actualEmployeeId) {
      extraHours = await readDb
        .select()
        .from(teacherExtraHours)
        .where(
          and(
            eq(teacherExtraHours.schoolId, schoolId),
            eq(teacherExtraHours.employeeId, actualEmployeeId)
          )
        )
        .orderBy(desc(teacherExtraHours.id))
        .limit(30);
    }

    const totalApprovedExtraSum = extraHours
      .filter((h) => h.status === "Approuvé" || h.status === "Payé")
      .reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

    const totalPendingExtraSum = extraHours
      .filter((h) => h.status === "En attente")
      .reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

    const totalExtraHoursSum = extraHours.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

    // 4. Leave & Advance Requests from real database
    let hrRequests: any[] = [];
    if (actualEmployeeId) {
      hrRequests = await readDb
        .select()
        .from(teacherHrRequests)
        .where(
          and(
            eq(teacherHrRequests.schoolId, schoolId),
            eq(teacherHrRequests.employeeId, actualEmployeeId)
          )
        )
        .orderBy(desc(teacherHrRequests.id))
        .limit(30);
    }

    // 5. School Classes & Subjects for Interactive Dropdowns
    const classRows = await readDb
      .select({ id: schoolClasses.id, name: schoolClasses.className })
      .from(schoolClasses)
      .where(eq(schoolClasses.schoolId, schoolId))
      .limit(50)
      .catch(() => []);

    const subjectRows = await readDb
      .select({ id: schoolSubjects.id, name: schoolSubjects.subjectName })
      .from(schoolSubjects)
      .where(eq(schoolSubjects.schoolId, schoolId))
      .limit(50)
      .catch(() => []);

    const defaultClasses = [
      "6ème A", "6ème B", "5ème A", "5ème B",
      "4ème A", "4ème B", "3ème A", "3ème B",
      "2nde C", "2nde A", "1ère D", "1ère A",
      "Terminale D", "Terminale A", "Terminale C"
    ];

    const defaultSubjects = [
      "Mathématiques", "Physique-Chimie", "Français", "SVT",
      "Anglais", "Histoire-Géographie", "Philosophie",
      "Éducation Physique & Sportive (EPS)", "Informatique", "Arabe"
    ];

    const availableClasses = classRows.length > 0
      ? Array.from(new Set(classRows.map((c: any) => c.name).filter(Boolean)))
      : defaultClasses;

    const availableSubjects = subjectRows.length > 0
      ? Array.from(new Set(subjectRows.map((s: any) => s.name).filter(Boolean)))
      : defaultSubjects;

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: actualEmployeeId || 1,
          name: teacherName,
          poste: teacherPoste,
          matricule: teacherMatricule,
          salaireBase: baseSalary,
          departement: empProfile?.departement || "Corps Enseignant",
          grade: empProfile?.codeGrade || empProfile?.echelon || "Échelon 1",
          banqueNom: empProfile?.banqueNom || "Banque Principale",
          banqueCompte: empProfile?.banqueCompte || "N/A",
        },
        smartInsights: {
          projectedNetSalary: computedNet + totalApprovedExtraSum,
          approvedExtraHoursAmount: totalApprovedExtraSum,
          pendingExtraHoursAmount: totalPendingExtraSum,
          approvedExtraHoursCount: extraHours.filter((h) => h.status === "Approuvé").length,
          pendingRequestsCount: hrRequests.filter((r) => r.status === "En attente").length,
        },
        payslips,
        extraHours: {
          totalEarned: totalExtraHoursSum,
          totalApproved: totalApprovedExtraSum,
          totalPending: totalPendingExtraSum,
          list: extraHours,
        },
        requests: hrRequests,
        classes: availableClasses,
        subjects: availableSubjects,
      },
    });
  } catch (error: any) {
    console.error("[Teacher Self-Service HR GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement du portail RH", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const userEmployee = (user as any).employee;
  let employeeId = userEmployee?.id || user.employeeId;

  if (!employeeId) {
    const anyEmp = await readDb
      .select()
      .from(employees)
      .where(eq(employees.schoolId, schoolId))
      .limit(1);
    employeeId = anyEmp[0]?.id || 1;
  }

  try {
    const body = await request.json();
    const {
      action,
      requestType,
      date,
      startDate,
      endDate,
      daysCount,
      advanceAmount,
      reason,
      documentUrl,
      typeHour,
      className,
      subjectName,
      hoursCount,
      hourlyRate,
      notes,
    } = body;

    if (action === "extra_hours") {
      const hCount = Number(hoursCount) || 1;
      const hRate = Number(hourlyRate) || 3000;
      const total = hCount * hRate;
      const sessionDate = date || new Date().toLocaleDateString("fr-FR");

      const [newRecord] = await db.insert(teacherExtraHours).values({
        schoolId,
        employeeId,
        date: sessionDate,
        typeHour: typeHour || "Heure supplémentaire",
        className: className || "Classe",
        subjectName: subjectName || "Discipline",
        hoursCount: hCount,
        hourlyRate: hRate,
        totalAmount: total,
        status: "En attente",
        notes: notes || "Déclaré depuis Edut Pro Mobile",
      }).returning();

      // Create Admin Notification
      await db.insert(notifications).values({
        title: "Nouvelle séance d'heures supplémentaires",
        content: `L'enseignant a déclaré ${hCount}h de ${typeHour} en ${className} (${subjectName}).`,
        type: "info",
        category: "RH",
        isRead: false,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: newRecord,
        message: "Séance d'heures supplémentaires déclarée avec succès ! En attente de validation par la direction.",
      });
    }

    // HR Request (Leave / Salary advance / Work certificate)
    if (!reason || !requestType) {
      return mobileJsonError("Type de demande et motif requis.", 400);
    }

    const [newRequest] = await db.insert(teacherHrRequests).values({
      schoolId,
      employeeId,
      requestType,
      startDate: startDate || new Date().toLocaleDateString("fr-FR"),
      endDate: endDate || new Date().toLocaleDateString("fr-FR"),
      daysCount: Number(daysCount) || 1,
      advanceAmount: advanceAmount ? Number(advanceAmount) : null,
      reason,
      documentUrl,
      status: "En attente",
    }).returning();

    // Create Admin Notification
    await db.insert(notifications).values({
      title: `Nouvelle demande RH : ${requestType}`,
      content: `Demande de ${requestType} soumise. Motif : ${reason}`,
      type: "info",
      category: "RH",
      isRead: false,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: newRequest,
      message: `Votre demande (${requestType}) a été transmise à la direction avec succès !`,
    });
  } catch (error: any) {
    console.error("[Teacher Self-Service HR POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la soumission de la demande", 500);
  }
}
