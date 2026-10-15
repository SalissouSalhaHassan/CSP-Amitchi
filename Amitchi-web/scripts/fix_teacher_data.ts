import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== FIXING REMOTE DATABASE TEACHER DATA ===");

    // 1. Update users supabase_id
    console.log("Updating users supabase_id...");
    
    const u1 = await sql`
      UPDATE users 
      SET supabase_id = 'cfe2d1f6-0a28-4db3-a655-52b3303d124d' 
      WHERE utilisateur = 'salissousalha@gmail.com'
      RETURNING id, utilisateur, supabase_id;
    `;
    console.log("Updated salissousalha@gmail.com:", u1);

    const u2 = await sql`
      UPDATE users 
      SET supabase_id = '28b17e71-631b-4567-bddd-2274f8d8341f' 
      WHERE utilisateur = 'salha@gmail.com'
      RETURNING id, utilisateur, supabase_id;
    `;
    console.log("Updated salha@gmail.com:", u2);

    const u3 = await sql`
      UPDATE users 
      SET supabase_id = 'ac77bf33-a4ce-4490-ac02-e059bf689cec' 
      WHERE utilisateur = 'superadmin@gmail.com'
      RETURNING id, utilisateur, supabase_id;
    `;
    console.log("Updated superadmin@gmail.com:", u3);

    const u4 = await sql`
      UPDATE users 
      SET supabase_id = '8a9acc08-1c3c-4a7e-b829-5649caca0930' 
      WHERE utilisateur = 'salissousalhahassan@gmail.com'
      RETURNING id, utilisateur, supabase_id;
    `;
    console.log("Updated salissousalhahassan@gmail.com:", u4);

    const u5 = await sql`
      UPDATE users 
      SET supabase_id = '7edca916-bf44-4843-b808-de4fbaa4e2ab' 
      WHERE utilisateur = 'sanisalha36@gmail.com'
      RETURNING id, utilisateur, supabase_id;
    `;
    console.log("Updated sanisalha36@gmail.com:", u5);

    // 2. Update employee email for SALISSOU SALHA (id = 5)
    console.log("\nUpdating employees email for SALISSOU SALHA (id = 5)...");
    const empUpdate = await sql`
      UPDATE employees 
      SET email = 'salissousalha@gmail.com' 
      WHERE id = 5
      RETURNING id, nom, email;
    `;
    console.log("Updated employee:", empUpdate);

  } catch (err: any) {
    console.error("Error executing updates:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
