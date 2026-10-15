import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined.");

  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== CHECKING SCHOOLS ===");
    const schools = await sql`SELECT id, name, slug FROM schools LIMIT 5`;
    console.log("Schools:", schools);

    console.log("\n=== CHECKING STUDENTS SAMPLE ===");
    const sampleStudents = await sql`
      SELECT id, school_id, nom_etudiant, num_admission, activation_pin, mobile, whatsapp, phone_fixe, classe 
      FROM students 
      LIMIT 5
    `;
    console.log("Sample students:", sampleStudents);

    console.log("\n=== CHECKING EMPLOYEES SAMPLE ===");
    const sampleEmployees = await sql`
      SELECT id, school_id, nom, emp_id, email, mobile, activation_pin 
      FROM employees 
      LIMIT 5
    `;
    console.log("Sample employees:", sampleEmployees);

    console.log("\n=== CHECKING USERS SAMPLE ===");
    const sampleUsers = await sql`
      SELECT id, school_id, utilisateur, student_id, employee_id, supabase_id 
      FROM users 
      LIMIT 5
    `;
    console.log("Sample users:", sampleUsers);

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
