import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { questions, subject_id, topic, difficulty } = await request.json();

    if (!questions || !Array.isArray(questions) || !subject_id) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    // Insert questions into the database
    for (const q of questions) {
      const optionsJson = q.options && q.options.length > 0 
        ? JSON.stringify(q.options) 
        : null;

      await db.execute(sql`
        INSERT INTO ai_question_bank (subject_id, topic, difficulty, question_text, options, correct_answer, created_at)
        VALUES (${subject_id}, ${topic || ""}, ${difficulty || ""}, ${q.question}, ${optionsJson}, ${q.correct_answer}, NOW())
      `);
    }

    return NextResponse.json({ 
      status: "success", 
      message: `${questions.length} questions sauvegardées dans la banque.` 
    });
  } catch (error: any) {
    console.error("Error saving questions to bank:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}
