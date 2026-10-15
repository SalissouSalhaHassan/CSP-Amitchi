import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { studentFees, feePayments } from "@/infrastructure/database/schema/finance";
import { count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalStudents = await db.select({ value: count() }).from(students);
    const activeStudents = await db.select({ value: count() }).from(students).where(eq(students.statut, "Actif"));
    const totalFees = await db.select({ value: count() }).from(studentFees);
    const totalPayments = await db.select({ value: count() }).from(feePayments);

    const allSt = await db.query.students.findMany({
      columns: { id: true, nomEtudiant: true, numAdmission: true }
    });

    const uniqueNames = new Set(allSt.map(s => s.nomEtudiant));
    const uniqueAdmissions = new Set(allSt.map(s => s.numAdmission));

    // Also get duplicate studentFees details
    const feeRecords = await db.query.studentFees.findMany({
      with: { student: true }
    });

    const studentFeeCounts: Record<number, number> = {};
    feeRecords.forEach(f => {
      if (f.studentId) {
        studentFeeCounts[f.studentId] = (studentFeeCounts[f.studentId] || 0) + 1;
      }
    });

    const duplicateFeeStudents = Object.entries(studentFeeCounts)
      .filter(([_, c]) => c > 1)
      .map(([sid, c]) => ({
        studentId: Number(sid),
        count: c,
        name: allSt.find(s => s.id === Number(sid))?.nomEtudiant
      }));

    return NextResponse.json({
      success: true,
      counts: {
        totalStudents: totalStudents[0].value,
        activeStudents: activeStudents[0].value,
        totalFees: totalFees[0].value,
        totalPayments: totalPayments[0].value,
        uniqueNames: uniqueNames.size,
        uniqueAdmissions: uniqueAdmissions.size
      },
      duplicateFees: duplicateFeeStudents.slice(0, 10),
      totalDuplicateFeeStudents: duplicateFeeStudents.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
