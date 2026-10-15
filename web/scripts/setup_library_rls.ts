import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SETTING UP RLS POLICIES FOR LIBRARY TABLES ===");
    
    // 1. Drop existing policies if any
    console.log("Dropping existing policies...");
    await sql`DROP POLICY IF EXISTS library_books_select ON public.library_books`;
    await sql`DROP POLICY IF EXISTS library_issues_select ON public.library_issues`;
    await sql`DROP POLICY IF EXISTS library_issues_insert ON public.library_issues`;

    // 2. Create select policy for library_books
    console.log("Creating select policy for library_books...");
    await sql`
      CREATE POLICY library_books_select ON public.library_books
      FOR SELECT TO authenticated
      USING (true)
    `;
    console.log("✅ Done library_books select policy!");

    // 3. Create select policy for library_issues (for own student issues)
    console.log("Creating select policy for library_issues...");
    await sql`
      CREATE POLICY library_issues_select ON public.library_issues
      FOR SELECT TO authenticated
      USING (
        student_id = public.get_my_student_id()
      )
    `;
    console.log("✅ Done library_issues select policy!");

    // 4. Create insert policy for library_issues (for reserving books)
    console.log("Creating insert policy for library_issues...");
    await sql`
      CREATE POLICY library_issues_insert ON public.library_issues
      FOR INSERT TO authenticated
      WITH CHECK (
        student_id = public.get_my_student_id()
      )
    `;
    console.log("✅ Done library_issues insert policy!");

  } catch (err: any) {
    console.error("Error setting up library RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
