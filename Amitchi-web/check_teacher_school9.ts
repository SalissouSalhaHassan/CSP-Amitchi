import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  console.log("🔌 Connecting to Supabase for User macoll@gmail.com (ID 42, Employee 1, School 9)...");
  
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    const employeeId = 1;
    const schoolId = 9;

    console.log(`\n=== EMPLOYEE INFO FOR ID ${employeeId} ===`);
    const emp = await sql`
      SELECT id, nom, email, poste, school_id, educational_level
      FROM employees 
      WHERE id = ${employeeId}
    `;
    console.log("Employee Record:", emp);

    console.log(`\n=== CLASS_SUBJECTS ASSIGNMENTS FOR EMPLOYEE ID ${employeeId} ===`);
    const assignments = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, c.class_name, s.subject_name, c.section_id, sec.educational_level as section_level
      FROM class_subjects cs
      LEFT JOIN school_classes c ON cs.class_id = c.id
      LEFT JOIN school_subjects s ON cs.subject_id = s.id
      LEFT JOIN school_sections sec ON c.section_id = sec.id
      WHERE cs.employee_id = ${employeeId}
    `;
    console.log("Assignments:", assignments);

    console.log(`\n=== ALL CLASSES FOR SCHOOL ID ${schoolId} ===`);
    const classes = await sql`
      SELECT c.id, c.class_name, c.section_id, sec.section_name, sec.educational_level
      FROM school_classes c
      LEFT JOIN school_sections sec ON c.section_id = sec.id
      WHERE c.school_id = ${schoolId}
    `;
    console.log("All Classes (School 9):", classes);

    console.log("\n=== ALL SECTIONS FOR SCHOOL ID 9 ===");
    const sections = await sql`
      SELECT id, section_name, educational_level
      FROM school_sections
      WHERE school_id = ${schoolId}
    `;
    console.log("Sections (School 9):", sections);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
