import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== ALL USERS IN REMOTE DATABASE ===");
    const users = await sql`
      SELECT u.id, u.utilisateur, u.nom_prenom, u.school_id, u.admin, u.super_admin, u.educational_level, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id DESC
    `;
    console.log(users);
  } catch (err: any) {
    console.error("❌ Failed to query users:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
