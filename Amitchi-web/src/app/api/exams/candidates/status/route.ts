import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignIdStr = searchParams.get("campaign_id");
    const classIdStr = searchParams.get("class_id");

    if (!campaignIdStr || !classIdStr) {
      return NextResponse.json({ error: "campaign_id et class_id requis." }, { status: 400 });
    }

    const campaignId = parseInt(campaignIdStr);
    const classId = parseInt(classIdStr);

    const result = await db.execute(sql`
      SELECT 
        ec.id, 
        ec.student_id, 
        ec.roll_number as roll_no, 
        ec.is_financially_cleared as cleared, 
        s.nom_etudiant as name
      FROM exam_candidates ec
      LEFT JOIN students s ON ec.student_id = s.id
      WHERE ec.campaign_id = ${campaignId} AND ec.class_id = ${classId}
      ORDER BY s.nom_etudiant ASC
    `);

    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formatted = rows.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      name: row.name || "N/A",
      roll_no: row.roll_no || "",
      financial_status: row.cleared ? "Autorisé (Payé)" : "Bloqué (Dettes)",
      cleared: !!row.cleared
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error listing candidates status:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
