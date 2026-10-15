import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;

  try {
    // 1. Fetch all classes for the school
    const classesRows = await readDb.execute(sql`
      SELECT id, class_name, 
             COALESCE(scolarite_mensuelle, 0) as scolarite_mensuelle, 
             COALESCE(droits_inscription, 0) as droits_inscription
      FROM school_classes
      WHERE school_id = ${schoolId} OR school_id IS NULL
      ORDER BY class_name ASC
    `);
    const dbClasses = ((classesRows as any).rows || classesRows) as any[];

    // 2. Fetch all active students for this school
    const studentsRows = await readDb.execute(sql`
      SELECT id, nom_etudiant, classe, class_id, 
             COALESCE(frais_mensuels, 0) as frais_mensuels,
             COALESCE(ancien_solde, 0) as ancien_solde,
             COALESCE(frais_inscription, 0) as frais_inscription
      FROM students
      WHERE school_id = ${schoolId} OR school_id IS NULL
    `);
    const dbStudents = ((studentsRows as any).rows || studentsRows) as any[];

    // 3. Fetch all student fees records for this school joined with live fee_payments
    const feesRows = await readDb.execute(sql`
      SELECT sf.id, sf.student_id, 
             COALESCE(sf.total_expected, 0) as total_expected,
             COALESCE(SUM(fp.amount), sf.total_paid, 0) as total_paid,
             COALESCE(sf.balance, 0) as balance,
             sf.status
      FROM student_fees sf
      LEFT JOIN fee_payments fp ON fp.fee_id = sf.id
      WHERE sf.school_id = ${schoolId} OR sf.school_id IS NULL
      GROUP BY sf.id, sf.student_id, sf.total_expected, sf.total_paid, sf.balance, sf.status
    `);
    const dbFees = ((feesRows as any).rows || feesRows) as any[];
    const feesMap = new Map<number, any>();
    for (const f of dbFees) {
      if (f.student_id) feesMap.set(Number(f.student_id), f);
    }

    // 4. Map students to classes
    const classMap = new Map<string, {
      classId: number;
      className: string;
      scolariteMensuelle: number;
      droitsInscription: number;
      students: any[];
    }>();

    for (const c of dbClasses) {
      const cName = String(c.class_name || "").trim();
      if (!cName) continue;
      classMap.set(cName.toLowerCase(), {
        classId: Number(c.id),
        className: cName,
        scolariteMensuelle: Number(c.scolarite_mensuelle) || 0,
        droitsInscription: Number(c.droits_inscription) || 0,
        students: [],
      });
    }

    for (const s of dbStudents) {
      const sClassName = String(s.classe || "").trim();
      if (!sClassName) continue;
      const key = sClassName.toLowerCase();
      if (!classMap.has(key)) {
        classMap.set(key, {
          classId: Number(s.class_id) || (classMap.size + 1),
          className: sClassName,
          scolariteMensuelle: Number(s.frais_mensuels) || 0,
          droitsInscription: Number(s.frais_inscription) || 0,
          students: [],
        });
      }
      classMap.get(key)!.students.push(s);
    }

    // 5. Aggregate financial data per class
    let totalExpected = 0;
    let totalCollected = 0;
    let totalBalance = 0;

    const classBreakdown: any[] = [];

    for (const [, cObj] of classMap.entries()) {
      let classExp = 0;
      let classPaid = 0;
      let classBal = 0;

      for (const s of cObj.students) {
        const f = feesMap.get(Number(s.id));
        let sExp = 0;
        let sPaid = 0;
        let sBal = 0;

        if (f && Number(f.total_expected) > 0) {
          sExp = Number(f.total_expected) || 0;
          sPaid = Number(f.total_paid) || 0;
          sBal = Math.max(0, sExp - sPaid);
        } else {
          const monthly = Number(s.frais_mensuels) > 0 
            ? Number(s.frais_mensuels) 
            : (cObj.scolariteMensuelle > 0 ? cObj.scolariteMensuelle : 0);
          const reg = Number(s.frais_inscription) > 0 
            ? Number(s.frais_inscription) 
            : (cObj.droitsInscription > 0 ? cObj.droitsInscription : 0);
          const debt = Number(s.ancien_solde) || 0;

          sExp = (monthly * 9) + reg;
          sPaid = 0;
          sBal = sExp + debt;
        }

        classExp += sExp;
        classPaid += sPaid;
        classBal += sBal;
      }

      const count = cObj.students.length;
      const rate = classExp > 0 ? (classPaid / classExp) * 100 : 0;

      let status = "N/A";
      if (classExp > 0) {
        if (rate >= 80) status = "Excellent";
        else if (rate >= 50) status = "Bon";
        else if (rate >= 25) status = "Moyen";
        else if (rate > 0) status = "En cours";
        else status = "Non recouvré";
      }

      classBreakdown.push({
        classId: cObj.classId,
        className: cObj.className,
        expected: classExp,
        paid: classPaid,
        balance: classBal,
        studentCount: count,
        collectionRate: Number(rate.toFixed(1)),
        status,
      });

      totalExpected += classExp;
      totalCollected += classPaid;
      totalBalance += classBal;
    }

    // Sort classes alphabetically
    classBreakdown.sort((a, b) => a.className.localeCompare(b.className, "fr", { numeric: true }));

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    // 6. Monthly cashflow timeline (Realized vs Forecasted)
    const months = [
      { month: "Sept", name: "Septembre", targetWeight: 0.15 },
      { month: "Oct", name: "Octobre", targetWeight: 0.15 },
      { month: "Nov", name: "Novembre", targetWeight: 0.12 },
      { month: "Déc", name: "Décembre", targetWeight: 0.10 },
      { month: "Jan", name: "Janvier", targetWeight: 0.12 },
      { month: "Fév", name: "Février", targetWeight: 0.10 },
      { month: "Mar", name: "Mars", targetWeight: 0.10 },
      { month: "Avr", name: "Avril", targetWeight: 0.08 },
      { month: "Mai", name: "Mai", targetWeight: 0.08 },
    ];

    const currentMonthIndex = new Date().getMonth(); // 0 is Jan, 8 is Sept
    const schoolMonthIdx = currentMonthIndex >= 8 ? currentMonthIndex - 8 : currentMonthIndex + 4;

    const monthlyData = months.map((m, idx) => {
      const isPast = idx <= schoolMonthIdx;
      const expectedAmount = Math.round(totalExpected * m.targetWeight);
      const realizedAmount = isPast
        ? Math.round(totalCollected * (m.targetWeight / 0.6))
        : 0;
      const forecastedAmount = !isPast
        ? Math.round((totalBalance / Math.max(1, months.length - schoolMonthIdx)) * 0.95)
        : realizedAmount;

      return {
        month: m.month,
        fullName: m.name,
        isPast,
        expected: expectedAmount,
        realized: Math.min(realizedAmount, Math.round(expectedAmount * 1.1)),
        forecast: forecastedAmount,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalExpected,
          totalCollected,
          totalBalance,
          collectionRate: Number(collectionRate.toFixed(1)),
          recoveryHealth: collectionRate >= 75 ? "Solide" : collectionRate >= 50 ? "Normal" : collectionRate >= 25 ? "À surveiller" : "À risque",
        },
        monthlyTimeline: monthlyData,
        classes: classBreakdown,
      },
    });
  } catch (error: any) {
    console.error("[Cashflow Forecast Error]:", error);
    return mobileJsonError(error?.message || "Erreur de calcul prévisionnel", 500);
  }
}
