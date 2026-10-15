import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  console.log("🔌 Connecting directly to Supabase:", connectionString.split("@")[1]);
  
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("\n=== CHECKING USER 'macoll@gmail.com' ===");
    const users = await sql`
      SELECT id, utilisateur, admin, super_admin, school_id, role_id, employee_id, educational_level
      FROM users 
      WHERE utilisateur = 'macoll@gmail.com' OR id = 24
    `;
    console.log("Users:", users);

    let employeeId = null;
    if (users.length > 0) {
      employeeId = users[0].employee_id;
      console.log(`User linked Employee ID: ${employeeId}`);
    } else {
      console.log("No user found with email/username 'macoll@gmail.com'. Let's search all users with role containing 'Enseignant' or 'teacher':");
      const teachers = await sql`
        SELECT u.id, u.utilisateur, u.employee_id, u.educational_level, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE r.role_name ILIKE '%enseignant%' OR r.role_name ILIKE '%teacher%' OR u.utilisateur ILIKE '%macoll%'
      `;
      console.log("Enseignant Users:", teachers);
      if (teachers.length > 0) {
        employeeId = teachers[0].employee_id;
      }
    }

    if (!employeeId) {
      employeeId = 707; // Fallback to 707 from screenshot
      console.log(`Using fallback Employee ID: ${employeeId}`);
    }

    console.log(`\n=== CHECKING EMPLOYEE ID ${employeeId} ===`);
    const emp = await sql`
      SELECT id, nom, email, poste, school_id, educational_level
      FROM employees 
      WHERE id = ${employeeId}
    `;
    console.log("Employee Record:", emp);

    console.log(`\n=== CHECKING CLASS_SUBJECTS ASSIGNMENTS FOR EMPLOYEE ID ${employeeId} ===`);
    const assignments = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, c.class_name, s.subject_name, c.section_id, sec.educational_level as section_level
      FROM class_subjects cs
      LEFT JOIN school_classes c ON cs.class_id = c.id
      LEFT JOIN school_subjects s ON cs.subject_id = s.id
      LEFT JOIN school_sections sec ON c.section_id = sec.id
      WHERE cs.employee_id = ${employeeId}
    `;
    console.log("Assignments:", assignments);

    console.log("\n=== ALL SCHOOL CLASSES AND SECTIONS ===");
    const schoolId = users[0]?.school_id || emp[0]?.school_id || 2;
    const classes = await sql`
      SELECT c.id, c.class_name, c.section_id, sec.section_name, sec.educational_level
      FROM school_classes c
      LEFT JOIN school_sections sec ON c.section_id = sec.id
      WHERE c.school_id = ${schoolId}
    `;
    console.log("All Classes:", classes);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
