const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

async function run() {
  const url = process.env.DATABASE_URL;
  console.log("Database URL present:", !!url);
  const sql = postgres(url, { ssl: { rejectUnauthorized: false }, connect_timeout: 10 });
  try {
    const schools = await sql`SELECT id, name, slug FROM schools LIMIT 10`;
    console.log("SCHOOLS:", JSON.stringify(schools, null, 2));

    const students = await sql`SELECT id, school_id, nom_etudiant, num_admission, activation_pin, mobile, whatsapp FROM students LIMIT 5`;
    console.log("STUDENTS:", JSON.stringify(students, null, 2));

    const employees = await sql`SELECT id, school_id, nom, emp_id, email, mobile, activation_pin FROM employees LIMIT 5`;
    console.log("EMPLOYEES:", JSON.stringify(employees, null, 2));

    const users = await sql`SELECT id, school_id, utilisateur, student_id, employee_id FROM users LIMIT 5`;
    console.log("USERS:", JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    await sql.end();
  }
}

run();
