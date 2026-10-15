import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== REMOTE AUTH USERS ===");
    const users = await sql`
      SELECT id, email, created_at, last_sign_in_at 
      FROM auth.users;
    `;
    console.log(JSON.stringify(users, null, 2));

  } catch (err: any) {
    console.error("Error querying auth.users:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
