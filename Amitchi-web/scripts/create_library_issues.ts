import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== CREATING library_issues TABLE IN DATABASE ===");
    
    await sql`
      CREATE TABLE IF NOT EXISTS public.library_issues (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        book_id INTEGER REFERENCES public.library_books(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES public.employees(id) ON DELETE CASCADE,
        issue_date TIMESTAMP DEFAULT NOW(),
        due_date TIMESTAMP NOT NULL,
        return_date TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'En cours',
        fine_amount DECIMAL(15, 2) DEFAULT 0.00
      )
    `;
    console.log("✅ Table library_issues created successfully!");

  } catch (err: any) {
    console.error("Error creating table:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
