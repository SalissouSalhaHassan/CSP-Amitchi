import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { employees, employeeAttendance, payrollRules, salaryRecords } from "@/infrastructure/database/schema/hr";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "dashboard";
  const employeeIdParam = searchParams.get("employeeId");
  const monthYearParam = searchParams.get("monthYear");
  const dateParam = searchParams.get("date");

  try {
    if (action === "dashboard" || action === "overview") {
      // 1. Fetch Employees
      const empList = await readDb
        .select({
          id: employees.id,
          school_id: employees.schoolId,
          emp_id: employees.empId,
          nom: employees.nom,
          poste: employees.poste,
          departement: employees.departement,
          mobile: employees.mobile,
          email: employees.email,
          date_embauche: employees.dateEmbauche,
          salaire_base: employees.salaireBase,
          sexe: employees.sexe,
          date_naissance: employees.dateNaissance,
          cnic: employees.cnic,
          adresse: employees.adresse,
          banque_nom: employees.banqueNom,
          banque_compte: employees.banqueCompte,
          statut: employees.statut,
          photo_path: employees.photoPath,
          educational_level: employees.educationalLevel,
          created_at: employees.createdAt,
        })
        .from(employees)
        .where(sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`)
        .orderBy(desc(employees.createdAt));

      // 2. Fetch Salary Records (with employee data)
      const rawSalaryRows = await readDb
        .select({
          id: salaryRecords.id,
          employee_id: salaryRecords.employeeId,
          month_year: salaryRecords.monthYear,
          absent_days: salaryRecords.absentDays,
          leave_taken: salaryRecords.leaveTaken,
          late_days: salaryRecords.lateDays,
          half_days: salaryRecords.halfDays,
          basic_salary: salaryRecords.basicSalary,
          calculated_basic: salaryRecords.calculatedBasic,
          total_allowance: salaryRecords.totalAllowance,
          total_deduction: salaryRecords.totalDeduction,
          net_salary: salaryRecords.netSalary,
          status: salaryRecords.status,
          payment_date: salaryRecords.paymentDate,
          payment_mode: salaryRecords.paymentMode,
          remark: salaryRecords.remark,
          created_at: salaryRecords.createdAt,
          emp_nom: employees.nom,
          emp_poste: employees.poste,
          emp_code: employees.empId,
        })
        .from(salaryRecords)
        .leftJoin(employees, eq(employees.id, salaryRecords.employeeId))
        .where(sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`)
        .orderBy(desc(salaryRecords.createdAt))
        .limit(50);

      const salaryList = rawSalaryRows.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        month_year: r.month_year,
        absent_days: r.absent_days,
        leave_taken: r.leave_taken,
        late_days: r.late_days,
        half_days: r.half_days,
        basic_salary: r.basic_salary,
        calculated_basic: r.calculated_basic,
        total_allowance: r.total_allowance,
        total_deduction: r.total_deduction,
        net_salary: r.net_salary,
        status: r.status,
        payment_date: r.payment_date,
        payment_mode: r.payment_mode,
        remark: r.remark,
        created_at: r.created_at,
        employees: {
          id: r.employee_id,
          nom: r.emp_nom,
          poste: r.emp_poste,
          emp_id: r.emp_code,
        },
      }));

      // 3. Fetch Today's Attendance
      const todayDateStr = dateParam || new Date().toISOString().split("T")[0];
      const attendanceRows = await readDb
        .select({
          id: employeeAttendance.id,
          employee_id: employeeAttendance.employeeId,
          date: employeeAttendance.date,
          period_number: employeeAttendance.periodNumber,
          status: employeeAttendance.status,
          heure_entree: employeeAttendance.heureEntree,
          heure_sortie: employeeAttendance.heureSortie,
          remarques: employeeAttendance.remarques,
        })
        .from(employeeAttendance)
        .where(sql`DATE(${employeeAttendance.date}) = ${todayDateStr}`);

      // 4. Compute Stats
      const activeEmployees = empList.filter(
        (e) => (e.statut || "").toLowerCase().includes("actif")
      ).length;

      const presentToday = attendanceRows.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return s.includes("présent") || s.includes("present") || s.includes("en cours");
      }).length;

      const paidAmount = salaryList
        .filter((r) => (r.status || "").toLowerCase() === "paid" || (r.status || "").toLowerCase() === "payé")
        .reduce((acc, cur) => acc + (Number(cur.net_salary) || 0), 0);

      const unpaidAmount = salaryList
        .filter((r) => (r.status || "").toLowerCase() !== "paid" && (r.status || "").toLowerCase() !== "payé")
        .reduce((acc, cur) => acc + (Number(cur.net_salary) || 0), 0);

      return NextResponse.json({
        success: true,
        data: {
          employees: empList,
          salaryRecords: salaryList,
          attendance: attendanceRows,
          stats: {
            activeEmployees: activeEmployees || empList.length,
            presentToday: presentToday || empList.length,
            paidAmount,
            unpaidAmount,
          },
        },
      });
    }

    if (action === "employees") {
      const empList = await readDb
        .select({
          id: employees.id,
          school_id: employees.schoolId,
          emp_id: employees.empId,
          nom: employees.nom,
          poste: employees.poste,
          departement: employees.departement,
          mobile: employees.mobile,
          email: employees.email,
          date_embauche: employees.dateEmbauche,
          salaire_base: employees.salaireBase,
          sexe: employees.sexe,
          date_naissance: employees.dateNaissance,
          cnic: employees.cnic,
          adresse: employees.adresse,
          banque_nom: employees.banqueNom,
          banque_compte: employees.banqueCompte,
          statut: employees.statut,
          photo_path: employees.photoPath,
          educational_level: employees.educationalLevel,
          created_at: employees.createdAt,
        })
        .from(employees)
        .where(sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`)
        .orderBy(desc(employees.createdAt));

      return NextResponse.json({ success: true, data: empList });
    }

    if (action === "salary_records") {
      let query = readDb
        .select({
          id: salaryRecords.id,
          employee_id: salaryRecords.employeeId,
          month_year: salaryRecords.monthYear,
          absent_days: salaryRecords.absentDays,
          leave_taken: salaryRecords.leaveTaken,
          late_days: salaryRecords.lateDays,
          half_days: salaryRecords.halfDays,
          basic_salary: salaryRecords.basicSalary,
          calculated_basic: salaryRecords.calculatedBasic,
          total_allowance: salaryRecords.totalAllowance,
          total_deduction: salaryRecords.totalDeduction,
          net_salary: salaryRecords.netSalary,
          status: salaryRecords.status,
          payment_date: salaryRecords.paymentDate,
          payment_mode: salaryRecords.paymentMode,
          remark: salaryRecords.remark,
          created_at: salaryRecords.createdAt,
          emp_nom: employees.nom,
          emp_poste: employees.poste,
          emp_code: employees.empId,
        })
        .from(salaryRecords)
        .leftJoin(employees, eq(employees.id, salaryRecords.employeeId));

      const conditions: any[] = [sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`];
      if (employeeIdParam) {
        conditions.push(eq(salaryRecords.employeeId, Number(employeeIdParam)));
      }
      if (monthYearParam) {
        conditions.push(eq(salaryRecords.monthYear, monthYearParam));
      }

      const rows = await query.where(and(...conditions)).orderBy(desc(salaryRecords.createdAt)).limit(50);

      const result = rows.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        month_year: r.month_year,
        absent_days: r.absent_days,
        leave_taken: r.leave_taken,
        late_days: r.late_days,
        half_days: r.half_days,
        basic_salary: r.basic_salary,
        calculated_basic: r.calculated_basic,
        total_allowance: r.total_allowance,
        total_deduction: r.total_deduction,
        net_salary: r.net_salary,
        status: r.status,
        payment_date: r.payment_date,
        payment_mode: r.payment_mode,
        remark: r.remark,
        created_at: r.created_at,
        employees: {
          id: r.employee_id,
          nom: r.emp_nom,
          poste: r.emp_poste,
          emp_id: r.emp_code,
        },
      }));

      return NextResponse.json({ success: true, data: result });
    }

    if (action === "payroll_rules") {
      const rules = await readDb.select().from(payrollRules).limit(1);
      return NextResponse.json({
        success: true,
        data: rules[0] || {
          leave_allow_per_month: 1,
          late_penalty: 0.5,
          half_day_penalty: 0.5,
        },
      });
    }

    return mobileJsonError("Action non reconnue", 400);
  } catch (error: any) {
    console.error("[HR GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur HR", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;

  try {
    const body = await request.json();
    const { action } = body;

    // 1. Save Salary Record (Insert / Update)
    if (action === "save_salary_record" || action === "salary_record") {
      const {
        recordId,
        employee_id,
        month_year,
        absent_days,
        leave_taken,
        late_days,
        half_days,
        basic_salary,
        calculated_basic,
        total_allowance,
        total_deduction,
        net_salary,
        status,
        payment_date,
        payment_mode,
        remark,
      } = body;

      if (!employee_id || !month_year) {
        return mobileJsonError("Employé et mois requis", 400);
      }

      const values = {
        employeeId: Number(employee_id),
        monthYear: String(month_year),
        absentDays: Number(absent_days) || 0,
        leaveTaken: Number(leave_taken) || 0,
        lateDays: Number(late_days) || 0,
        halfDays: Number(half_days) || 0,
        basicSalary: Number(basic_salary) || 0,
        calculatedBasic: Number(calculated_basic) || Number(basic_salary) || 0,
        totalAllowance: Number(total_allowance) || 0,
        totalDeduction: Number(total_deduction) || 0,
        netSalary: Number(net_salary) || 0,
        status: status === "Paid" || status === "Payé" ? "Paid" : "Unpaid",
        paymentDate: payment_date ? new Date(payment_date) : null,
        paymentMode: payment_mode || "Espèces",
        remark: remark || null,
      };

      if (recordId) {
        const updated = await db
          .update(salaryRecords)
          .set(values)
          .where(eq(salaryRecords.id, Number(recordId)))
          .returning();
        return NextResponse.json({ success: true, data: updated[0] });
      } else {
        const inserted = await db
          .insert(salaryRecords)
          .values(values)
          .returning();
        return NextResponse.json({ success: true, data: inserted[0] });
      }
    }

    // 2. Mark Salary as Paid
    if (action === "mark_paid") {
      const { recordId } = body;
      if (!recordId) return mobileJsonError("ID requis", 400);

      await db
        .update(salaryRecords)
        .set({
          status: "Paid",
          paymentDate: new Date(),
        })
        .where(eq(salaryRecords.id, Number(recordId)));

      return NextResponse.json({ success: true, message: "Marqué comme payé" });
    }

    // 3. Save Employee (Insert / Update)
    if (action === "save_employee" || action === "employee") {
      const { employeeId, payload } = body;
      const data = payload || body;

      const values = {
        schoolId,
        empId: data.emp_id || `EMP-${Date.now().toString().slice(-6)}`,
        nom: data.nom || "Nouvel Employé",
        poste: data.poste || null,
        departement: data.departement || null,
        mobile: data.mobile || null,
        email: data.email || null,
        dateEmbauche: data.date_embauche || null,
        salaireBase: Number(data.salaire_base) || 0,
        sexe: data.sexe || null,
        dateNaissance: data.date_naissance || null,
        cnic: data.cnic || null,
        adresse: data.adresse || null,
        banqueNom: data.banque_nom || null,
        banqueCompte: data.banque_compte || null,
        statut: data.statut || "Actif",
      };

      if (employeeId) {
        const updated = await db
          .update(employees)
          .set(values)
          .where(and(eq(employees.id, Number(employeeId)), sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`))
          .returning();
        return NextResponse.json({ success: true, data: updated[0] });
      } else {
        const inserted = await db
          .insert(employees)
          .values(values)
          .returning();
        return NextResponse.json({ success: true, data: inserted[0] });
      }
    }

    // 4. Delete Employee
    if (action === "delete_employee") {
      const { employeeId } = body;
      if (!employeeId) return mobileJsonError("ID employé requis", 400);

      await db
        .update(employees)
        .set({ statut: "Inactif" })
        .where(and(eq(employees.id, Number(employeeId)), sql`(${employees.schoolId} = ${schoolId} OR ${employees.schoolId} IS NULL)`));

      return NextResponse.json({ success: true, message: "Employé désactivé" });
    }

    // 5. Save Employee Attendance
    if (action === "save_attendance") {
      const { dateStr, records } = body;
      if (!records || !Array.isArray(records)) {
        return mobileJsonError("Liste de pointage requise", 400);
      }

      const dateObj = dateStr ? new Date(dateStr) : new Date();

      for (const rec of records) {
        if (!rec.employee_id) continue;
        const status = rec.status || "Présent";

        // Check if attendance already exists for this date and employee
        const existing = await readDb
          .select({ id: employeeAttendance.id })
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.employeeId, Number(rec.employee_id)),
              sql`DATE(${employeeAttendance.date}) = DATE(${dateObj.toISOString()})`
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(employeeAttendance)
            .set({
              status,
              remarques: rec.remarques || null,
            })
            .where(eq(employeeAttendance.id, existing[0].id));
        } else {
          await db.insert(employeeAttendance).values({
            employeeId: Number(rec.employee_id),
            date: dateObj,
            periodNumber: Number(rec.period_number) || 1,
            status,
            heureEntree: "08:00",
            remarques: rec.remarques || null,
          });
        }
      }

      return NextResponse.json({ success: true, message: "Pointage enregistré avec succès" });
    }

    // 6. Save Payroll Rules
    if (action === "save_payroll_rules") {
      const { leave_allow_per_month, late_penalty, half_day_penalty } = body;
      const values = {
        leaveAllowPerMonth: Number(leave_allow_per_month) || 1,
        latePenalty: Number(late_penalty) || 0.5,
        halfDayPenalty: Number(half_day_penalty) || 0.5,
      };

      const existing = await readDb.select({ id: payrollRules.id }).from(payrollRules).limit(1);
      if (existing.length > 0) {
        await db.update(payrollRules).set(values).where(eq(payrollRules.id, existing[0].id));
      } else {
        await db.insert(payrollRules).values(values);
      }

      return NextResponse.json({ success: true, message: "Règles enregistrées" });
    }

    return mobileJsonError("Action POST non reconnue", 400);
  } catch (error: any) {
    console.error("[HR POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de l'enregistrement", 500);
  }
}
