import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    const schoolId = 9;

    console.log(`\n=== CHECKING TIMETABLE ENTRIES IN SCHOOL ${schoolId} ===`);
    const timetable = await sql`
      SELECT t.id, t.class_id, t.subject_id, t.employee_id, t.day_name, t.period_number, c.class_name, s.subject_name, e.nom as teacher_name
      FROM timetable_entries t
      LEFT JOIN school_classes c ON t.class_id = c.id
      LEFT JOIN school_subjects s ON t.subject_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE c.school_id = ${schoolId}
    `;
    console.log("Timetable Entries:", timetable);

    console.log(`\n=== TIMETABLE ENTRIES FOR EMPLOYEE ID 1 ===`);
    const empTimetable = timetable.filter((t: any) => t.employee_id === 1);
    console.log("Employee 1 Timetable:", empTimetable);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
