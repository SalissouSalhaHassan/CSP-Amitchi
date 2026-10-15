import { NextResponse } from "next/server";
import { readDb } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get all sessions
    const sessions = await readDb.execute(sql`
      SELECT id, session_name, is_active, status, school_id FROM school_sessions
    `);

    // 2. Count grades for student 59 by session_id
    const gradesBySession = await readDb.execute(sql`
      SELECT session_id, COUNT(*) as count 
      FROM student_results 
      WHERE student_id = 59 
      GROUP BY session_id
    `);

    // 3. Inspect policy details including permissive flag
    const policies = await readDb.execute(sql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('students', 'school_classes', 'student_results', 'timetable_entries', 'homework')
    `);

    return NextResponse.json({
      success: true,
      sessions: sessions,
      grades_by_session: gradesBySession,
      policies: policies
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
