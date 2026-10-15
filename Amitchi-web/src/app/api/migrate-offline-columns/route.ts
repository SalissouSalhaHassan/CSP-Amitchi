import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Check if column deleted_at exists in students
    const checkCol = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'deleted_at'
    `);

    const colExists = (checkCol as any).length > 0;

    let alterResult = "Column deleted_at already exists";
    if (!colExists) {
      await db.execute(sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);
      alterResult = "Column deleted_at added successfully to students table!";
    }

    // 2. Also ensure deleted_at exists in other tables mentioned in Offline-First plan
    await db.execute(sql`ALTER TABLE "student_attendance" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);
    await db.execute(sql`ALTER TABLE "student_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);
    await db.execute(sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);

    const countRes = await db.execute(sql`SELECT count(*)::int as count FROM students`);
    const totalStudents = Number((countRes as any)[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      message: alterResult,
      totalStudentsInDb: totalStudents
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
