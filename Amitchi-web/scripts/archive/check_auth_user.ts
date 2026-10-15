import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== CHECKING AUTH.USERS IN DATABASE ===");
    
    const results = await sql`
      SELECT id, email, email_confirmed_at, confirmed_at, last_sign_in_at 
      FROM auth.users 
      WHERE email = 'abdallah@gmail.com'
    `;
    
    console.log("User details in auth.users:", results);

    if (results.length > 0) {
      const user = results[0];
      if (!user.email_confirmed_at) {
        console.log("Email is NOT confirmed! Confirming now...");
        await sql`
          UPDATE auth.users 
          SET email_confirmed_at = NOW(), 
              confirmed_at = NOW() 
          WHERE id = ${user.id}
        `;
        console.log("✅ User email has been successfully confirmed in database!");
      } else {
        console.log("Email is already confirmed.");
      }
    } else {
      console.log("User not found in auth.users.");
    }

  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
