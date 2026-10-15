import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectIdStr = searchParams.get("subject_id");

    let query = sql`
      SELECT 
        q.id,
        s.subject_name as subject,
        q.topic,
        q.difficulty,
        q.question_text as question,
        q.options,
        q.correct_answer as answer
      FROM ai_question_bank q
      LEFT JOIN school_subjects s ON q.subject_id = s.id
    `;

    if (subjectIdStr) {
      const subjectId = parseInt(subjectIdStr);
      if (!isNaN(subjectId)) {
        query = sql`
          SELECT 
            q.id,
            s.subject_name as subject,
            q.topic,
            q.difficulty,
            q.question_text as question,
            q.options,
            q.correct_answer as answer
          FROM ai_question_bank q
          LEFT JOIN school_subjects s ON q.subject_id = s.id
          WHERE q.subject_id = ${subjectId}
        `;
      }
    }

    // Order by id descending (most recent first)
    const finalQuery = sql`${query} ORDER BY q.id DESC`;
    
    const result = await db.execute(finalQuery);
    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formattedQuestions = rows.map((row: any) => {
      let parsedOptions = [];
      try {
        if (row.options) {
          parsedOptions = typeof row.options === "string" 
            ? JSON.parse(row.options) 
            : row.options;
        }
      } catch (e) {
        console.error("Failed to parse options for question ID:", row.id, e);
      }

      return {
        id: row.id,
        subject: row.subject || "N/A",
        topic: row.topic || "",
        difficulty: row.difficulty || "",
        type: parsedOptions && parsedOptions.length > 0 ? "QCM" : "Directe",
        question: row.question,
        options: parsedOptions || [],
        answer: row.answer || ""
      };
    });

    return NextResponse.json(formattedQuestions);
  } catch (error: any) {
    console.error("Error fetching question bank:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
