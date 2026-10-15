import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SIMULATING RLS ON REMOTE DATABASE ===");
    
    const result = await sql.begin(async (tx) => {
      // Set the role to authenticated (as Supabase does)
      await tx`SET LOCAL ROLE authenticated`;
      
      // Mock the request.jwt.claims config parameter (Supabase uses this for auth.uid() and auth.jwt())
      await tx`
        SELECT set_config(
          'request.jwt.claims', 
          '{"sub": "cfe2d1f6-0a28-4db3-a655-52b3303d124d", "email": "salissousalha@gmail.com", "role": "authenticated"}', 
          true
        );
      `;

      console.log("Testing auth.uid():");
      const authUid = await tx`SELECT auth.uid() as uid;`;
      console.log("auth.uid() =", authUid[0].uid);

      console.log("Testing auth.jwt():");
      const authJwt = await tx`SELECT auth.jwt() ->> 'email' as email;`;
      console.log("auth.jwt() email =", authJwt[0].email);

      console.log("Querying users table under RLS:");
      const usersRows = await tx`SELECT id, utilisateur, supabase_id FROM users;`;
      console.log("Users found under RLS:", usersRows);

      console.log("Querying employees table under RLS:");
      const employeesRows = await tx`SELECT id, nom, email FROM employees;`;
      console.log("Employees found under RLS:", employeesRows);

      return { authUid, authJwt, usersRows, employeesRows };
    });

  } catch (err: any) {
    console.error("Error simulating RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
