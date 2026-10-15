import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SEARCHING FOR ADMIN USERS/ROLES ===");
    
    const matchedUsers = await sql`
      SELECT u.id, u.utilisateur, u.nom_prenom, u.school_id, u.admin, u.super_admin, u.educational_level, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.nom_prenom ILIKE '%Admin%' OR u.utilisateur ILIKE '%admin%' OR r.role_name ILIKE '%Admin%'
    `;
    console.log("Matched Users in DB:", matchedUsers);

    // Also look at current active sessions in Supabase auth users if possible?
    // We can't query auth.users directly unless we have admin bypass or query it via sql
    const authUsers = await sql`
      SELECT id, email, raw_user_meta_data FROM auth.users
    `;
    console.log("Supabase Auth Users:", authUsers.map(u => ({
      id: u.id,
      email: u.email,
      meta: u.raw_user_meta_data
    })));

  } catch (err: any) {
    console.error("❌ Failed to search admin remote:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
