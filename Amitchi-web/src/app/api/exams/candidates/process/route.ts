import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getElapsedMonths(sessionStr: string): number {
  try {
    const clean = (sessionStr || "").replace(/\//g, "-").trim();
    const parts = clean.split("-");
    const startYear = parseInt(parts[0]);
    if (isNaN(startYear)) return 1;
    
    const now = new Date();
    const diffYears = now.getFullYear() - startYear;
    const diffMonths = now.getMonth() - 9; // October is index 9 (0-indexed)
    
    let elapsed = diffYears * 12 + diffMonths + 1;
    if (elapsed < 1) return 1;
    if (elapsed > 9) return 9;
    return elapsed;
  } catch (e) {
    return 1;
  }
}

async function getSessionPayments(studentId: number, sessionStr: string): Promise<number> {
  try {
    const clean = (sessionStr || "").replace(/\//g, "-").trim();
    const parts = clean.split("-");
    const startYear = parseInt(parts[0]);
    
    if (isNaN(startYear)) {
      const res = await db.execute(sql`
        SELECT COALESCE(SUM(montant_paye), 0) as total 
        FROM payments 
        WHERE student_id = ${studentId}
      `);
      const rows = (Array.isArray(res) ? res : (res as any).rows || []) as any[];
      return parseFloat(rows[0]?.total || "0");
    }
    
    const startDate = `${startYear}-10-01 00:00:00`;
    const endDate = `${startYear + 1}-09-30 23:59:59`;

    const res = await db.execute(sql`
      SELECT COALESCE(SUM(montant_paye), 0) as total 
      FROM payments 
      WHERE student_id = ${studentId} 
        AND date_paiement >= ${startDate}::timestamp 
        AND date_paiement <= ${endDate}::timestamp
    `);
    const rows = (Array.isArray(res) ? res : (res as any).rows || []) as any[];
    return parseFloat(rows[0]?.total || "0");
  } catch (e) {
    console.error("Failed to fetch payments for student ID:", studentId, e);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, class_id } = await request.json();

    if (!campaign_id || !class_id) {
      return NextResponse.json({ error: "campaign_id et class_id requis." }, { status: 400 });
    }

    const campaignId = parseInt(campaign_id);
    const classId = parseInt(class_id);

    // 1. Get class name
    const classRes = await db.execute(sql`
      SELECT class_name FROM school_classes WHERE id = ${classId} LIMIT 1
    `);
    const classRows = (Array.isArray(classRes) ? classRes : (classRes as any).rows || []) as any[];
    if (classRows.length === 0) {
      return NextResponse.json({ error: "Classe introuvable." }, { status: 400 });
    }
    const className = classRows[0].class_name;

    // 2. Fetch active students of this class
    const studentsRes = await db.execute(sql`
      SELECT id, session, COALESCE(frais_mensuels, 0) as monthly, COALESCE(frais_inscription, 0) as inscr, COALESCE(ancien_solde, 0) as old_bal 
      FROM students 
      WHERE classe = ${className} AND statut = 'Actif'
    `);
    const students = (Array.isArray(studentsRes) ? studentsRes : (studentsRes as any).rows || []) as any[];

    // 3. Fetch exam timetables
    const ttRes = await db.execute(sql`
      SELECT id, subject_id FROM exam_timetables 
      WHERE campaign_id = ${campaignId} AND class_id = ${classId}
    `);
    const timetables = (Array.isArray(ttRes) ? ttRes : (ttRes as any).rows || []) as any[];

    if (timetables.length === 0) {
      return NextResponse.json({ 
        error: "⚠️ Aucun examen n'est programmé pour cette classe dans cette campagne." 
      }, { status: 400 });
    }

    // 4. Process candidates
    for (const student of students) {
      const elapsed = getElapsedMonths(student.session);
      const expected = parseFloat(student.inscr) + parseFloat(student.old_bal) + (parseFloat(student.monthly) * elapsed);
      const paid = await getSessionPayments(student.id, student.session);
      const isCleared = (expected - paid) <= 0;

      // Check if candidate already exists
      const candCheck = await db.execute(sql`
        SELECT id, is_manually_authorized FROM exam_candidates 
        WHERE campaign_id = ${campaignId} AND student_id = ${student.id} LIMIT 1
      `);
      const candRows = (Array.isArray(candCheck) ? candCheck : (candCheck as any).rows || []) as any[];
      
      let candidateId: number;
      let finalCleared = isCleared;

      if (candRows.length === 0) {
        const currentYear = new Date().getFullYear();
        const rollNo = `EX-${currentYear}-${String(student.id).padStart(4, '0')}`;
        
        const insertRes = await db.execute(sql`
          INSERT INTO exam_candidates (campaign_id, student_id, class_id, roll_number, is_financially_cleared, is_manually_authorized)
          VALUES (${campaignId}, ${student.id}, ${classId}, ${rollNo}, ${isCleared}, false)
          RETURNING id
        `);
        const insertRows = (Array.isArray(insertRes) ? insertRes : (insertRes as any).rows || []) as any[];
        candidateId = insertRows[0]?.id;
      } else {
        candidateId = candRows[0].id;
        if (candRows[0].is_manually_authorized) {
          finalCleared = true;
        }
        
        await db.execute(sql`
          UPDATE exam_candidates 
          SET class_id = ${classId}, is_financially_cleared = ${finalCleared}
          WHERE id = ${candidateId}
        `);
      }

      // Generate anonymity codes for marks/attendance
      for (const tt of timetables) {
        const markCheck = await db.execute(sql`
          SELECT id FROM exam_attendance_marks 
          WHERE candidate_id = ${candidateId} AND timetable_id = ${tt.id} LIMIT 1
        `);
        const markRows = (Array.isArray(markCheck) ? markCheck : (markCheck as any).rows || []) as any[];

        if (markRows.length === 0) {
          const randChars = Array.from({ length: 4 }, () => 
            Math.random().toString(36).charAt(2).toUpperCase()
          ).join('');
          const anonCode = `C${campaignId}-S${student.id}-${tt.subject_id}-${randChars}`;

          await db.execute(sql`
            INSERT INTO exam_attendance_marks (candidate_id, timetable_id, anonymity_code)
            VALUES (${candidateId}, ${tt.id}, ${anonCode})
          `);
        }
      }
    }

    return NextResponse.json({ 
      status: "success", 
      message: "Traitement des candidats et Anonymat terminés avec succès." 
    });
  } catch (error: any) {
    console.error("Error processing candidates:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
