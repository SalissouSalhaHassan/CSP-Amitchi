import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { record_id, status } = await request.json();

    if (!record_id || !status) {
      return NextResponse.json({ error: "record_id et status requis." }, { status: 400 });
    }

    const recordId = parseInt(record_id);

    // Verify if record exists
    const check = await db.execute(sql`
      SELECT id FROM exam_attendance_marks WHERE id = ${recordId} LIMIT 1
    `);
    const checkRows = (Array.isArray(check) ? check : (check as any).rows || []) as any[];

    if (checkRows.length === 0) {
      return NextResponse.json({ error: "Enregistrement introuvable." }, { status: 400 });
    }

    await db.execute(sql`
      UPDATE exam_attendance_marks 
      SET attendance_status = ${status} 
      WHERE id = ${recordId}
    `);

    return NextResponse.json({ status: "success", message: "Statut de présence mis à jour." });
  } catch (error: any) {
    console.error("Error updating manual attendance status:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
