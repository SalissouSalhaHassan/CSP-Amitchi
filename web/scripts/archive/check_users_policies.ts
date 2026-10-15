import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== POLICIES ON USERS ===");
    const usersPolicies = await sql`
      SELECT * FROM pg_policies WHERE tablename = 'users';
    `;
    console.log(JSON.stringify(usersPolicies, null, 2));

    console.log("=== POLICIES ON EMPLOYEES ===");
    const employeesPolicies = await sql`
      SELECT * FROM pg_policies WHERE tablename = 'employees';
    `;
    console.log(JSON.stringify(employeesPolicies, null, 2));

  } catch (err: any) {
    console.error("Error checking policies:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
