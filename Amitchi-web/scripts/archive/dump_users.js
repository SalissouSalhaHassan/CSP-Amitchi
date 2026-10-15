const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");

const sql = postgres(connectionString, {
  prepare: false,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const users = await sql`
      SELECT u.id, u.utilisateur, u.admin, u.super_admin, u.role_id, r.role_name, u.school_id, u.supabase_id 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id;
    `;
    console.log("=== USERS IN DATABASE ===");
    console.table(users);

    const roles = await sql`
      SELECT id, role_name, description FROM roles;
    `;
    console.log("=== ROLES IN DATABASE ===");
    console.table(roles);

    const employees = await sql`
      SELECT id, nom, email, school_id FROM employees;
    `;
    console.log("=== EMPLOYEES IN DATABASE ===");
    console.table(employees);

    const classSubjects = await sql`
      SELECT cs.id, cs.class_id, c.class_name, cs.subject_id, s.subject_name, cs.employee_id, e.nom as employee_name
      FROM class_subjects cs
      LEFT JOIN school_classes c ON cs.class_id = c.id
      LEFT JOIN school_subjects s ON cs.subject_id = s.id
      LEFT JOIN employees e ON cs.employee_id = e.id;
    `;
    console.log("=== CLASS SUBJECTS / TEACHER ASSIGNMENTS ===");
    console.table(classSubjects);

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
