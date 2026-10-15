import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const localUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/edut";
const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function inspectDb(name: string, url: string) {
  console.log(`\n=== INSPECTING ${name} ===`);
  const isRemote = url.includes("supabase.co") || url.includes("supabase.com");
  const sql = postgres(url, {
    prepare: false,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });

  try {
    const userTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    console.log("Users table exists:", userTableExists[0].exists);

    if (userTableExists[0].exists) {
      const users = await sql`
        SELECT u.id, u.utilisateur, u.admin, u.super_admin, u.role_id, r.role_name, u.school_id, u.supabase_id, u.nom_prenom
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id;
      `;
      console.log("Users count:", users.length);
      if (users.length > 0) {
        console.table(users);
      }

      const roles = await sql`SELECT id, role_name, description FROM roles;`;
      console.log("Roles:");
      console.table(roles);

      const employees = await sql`SELECT id, nom, email, poste, school_id FROM employees;`;
      console.log("Employees count:", employees.length);
      if (employees.length > 0) {
        console.table(employees);
      }

      const schoolClasses = await sql`SELECT id, class_name, school_id FROM school_classes;`;
      console.log("Classes count:", schoolClasses.length);
      if (schoolClasses.length > 0) {
        console.table(schoolClasses);
      }

      const schoolSubjects = await sql`SELECT id, subject_name, school_id FROM school_subjects;`;
      console.log("Subjects count:", schoolSubjects.length);
      if (schoolSubjects.length > 0) {
        console.table(schoolSubjects);
      }

      const classSubjects = await sql`
        SELECT cs.id, cs.class_id, c.class_name, cs.subject_id, s.subject_name, cs.employee_id, e.nom as employee_name
        FROM class_subjects cs
        LEFT JOIN school_classes c ON cs.class_id = c.id
        LEFT JOIN school_subjects s ON cs.subject_id = s.id
        LEFT JOIN employees e ON cs.employee_id = e.id;
      `;
      console.log("Class Subjects count:", classSubjects.length);
      if (classSubjects.length > 0) {
        console.table(classSubjects);
      }
    }
  } catch (err: any) {
    console.error(`Error inspecting ${name}:`, err.message);
  } finally {
    await sql.end();
  }
}

async function run() {
  await inspectDb("LOCAL POSTGRES", localUrl);
  await inspectDb("REMOTE SUPABASE POSTGRES", remoteUrl);
}

run().then(() => process.exit(0));
