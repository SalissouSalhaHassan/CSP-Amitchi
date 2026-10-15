import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SETTING UP RLS POLICIES FOR HOSTEL TABLES ===");
    
    // Ensure RLS is enabled
    await sql`ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY`;

    // Drop existing policies if any
    console.log("Dropping existing policies...");
    await sql`DROP POLICY IF EXISTS hostel_rooms_select ON public.hostel_rooms`;
    await sql`DROP POLICY IF EXISTS hostel_allocations_select ON public.hostel_allocations`;

    // Create select policy for hostel_rooms
    console.log("Creating select policy for hostel_rooms...");
    await sql`
      CREATE POLICY hostel_rooms_select ON public.hostel_rooms
      FOR SELECT TO authenticated
      USING (true)
    `;
    console.log("✅ Done hostel_rooms select policy!");

    // Create select policy for hostel_allocations
    console.log("Creating select policy for hostel_allocations...");
    await sql`
      CREATE POLICY hostel_allocations_select ON public.hostel_allocations
      FOR SELECT TO authenticated
      USING (
        student_id = public.get_my_student_id()
      )
    `;
    console.log("✅ Done hostel_allocations select policy!");

  } catch (err: any) {
    console.error("Error setting up hostel RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
