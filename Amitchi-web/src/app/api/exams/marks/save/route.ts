import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { marks } = await request.json();

    if (!marks || !Array.isArray(marks)) {
      return NextResponse.json({ error: "Liste de notes invalide ou manquante." }, { status: 400 });
    }

    for (const item of marks) {
      const recordId = parseInt(item.record_id);
      const markValue = item.marks_obtained !== null && item.marks_obtained !== undefined ? parseFloat(item.marks_obtained) : null;

      if (!isNaN(recordId)) {
        await db.execute(sql`
          UPDATE exam_attendance_marks 
          SET marks_obtained = ${markValue} 
          WHERE id = ${recordId}
        `);
      }
    }

    return NextResponse.json({ status: "success", message: "Toutes les notes ont été enregistrées avec succès !" });
  } catch (error: any) {
    console.error("Error saving exam marks:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
