import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== FIXING DUPLICATE FOREIGN KEYS IN DATABASE ===");
    
    // 1. Drop duplicate FK on student_results (subject_id)
    console.log("Dropping student_results duplicate foreign key...");
    await sql`
      ALTER TABLE public.student_results 
      DROP CONSTRAINT IF EXISTS student_results_subject_id_school_subjects_id_fk
    `;
    console.log("✅ Done dropping student_results duplicate constraint!");

    // 2. Drop duplicate FK on transport_subscriptions (route_id) if it exists
    console.log("Dropping transport_subscriptions duplicate foreign key if exists...");
    await sql`
      ALTER TABLE public.transport_subscriptions 
      DROP CONSTRAINT IF EXISTS transport_subscriptions_route_id_transport_routes_id_fk
    `;
    console.log("✅ Done dropping transport_subscriptions duplicate constraint!");

  } catch (err: any) {
    console.error("Error fixing duplicate FKs:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
