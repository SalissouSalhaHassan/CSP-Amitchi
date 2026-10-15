import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== ADDING activation_pin COLUMNS TO DATABASE ===");
    
    console.log("Adding activation_pin to students...");
    await sql`
      ALTER TABLE public.students 
      ADD COLUMN IF NOT EXISTS activation_pin VARCHAR(50)
    `;
    console.log("✅ Done students!");

    console.log("Adding activation_pin to employees...");
    await sql`
      ALTER TABLE public.employees 
      ADD COLUMN IF NOT EXISTS activation_pin VARCHAR(50)
    `;
    console.log("✅ Done employees!");

    // Prepopulate a sample student or employee code if needed for testing, 
    // or let the user do it manually. We can prepopulate default code '123456' for ease of testing!
    console.log("Setting default activation_pin to '123456' for testing...");
    await sql`
      UPDATE public.students 
      SET activation_pin = '123456' 
      WHERE activation_pin IS NULL
    `;
    await sql`
      UPDATE public.employees 
      SET activation_pin = '123456' 
      WHERE activation_pin IS NULL
    `;
    console.log("✅ Done setting default pins!");

  } catch (err: any) {
    console.error("Error migrating tables:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
