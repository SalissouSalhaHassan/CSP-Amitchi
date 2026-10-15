import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== CREATING AUTO-CONFIRM TRIGGER FOR AUTH.USERS ===");
    
    // 1. Create function
    await sql`
      CREATE OR REPLACE FUNCTION public.auto_confirm_supabase_users()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.email_confirmed_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    console.log("✅ Function public.auto_confirm_supabase_users created.");

    // 2. Drop trigger if exists (to avoid duplicate errors) and create it
    await sql`
      DROP TRIGGER IF EXISTS tr_auto_confirm_supabase_users ON auth.users;
    `;
    await sql`
      CREATE TRIGGER tr_auto_confirm_supabase_users
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_supabase_users();
    `;
    console.log("✅ Trigger tr_auto_confirm_supabase_users created on auth.users successfully.");

    // 3. Confirm all existing unconfirmed users
    console.log("Confirming any existing unconfirmed users...");
    await sql`
      UPDATE auth.users 
      SET email_confirmed_at = NOW() 
      WHERE email_confirmed_at IS NULL
    `;
    console.log("✅ All existing users confirmed!");

  } catch (err: any) {
    console.error("Error creating trigger:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
