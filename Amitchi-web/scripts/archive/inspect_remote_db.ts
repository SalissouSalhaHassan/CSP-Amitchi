import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING REMOTE DATABASE ===");
    
    const schools = await sql`SELECT id, name FROM schools`;
    console.log("Schools:", schools);

    const branches = await sql`SELECT id, "school_id", "branch_name", "inst_type" FROM school_branches`;
    console.log("Branches:", branches);

    const sessions = await sql`SELECT id, "school_id", "session_name", "status", "is_active" FROM school_sessions`;
    console.log("Sessions:", sessions);

    const usersList = await sql`SELECT id, "school_id", "utilisateur", "nom_prenom", "admin", "super_admin", "educational_level", "role_id" FROM users LIMIT 10`;
    console.log("Users:", usersList);

    const classes = await sql`SELECT id, "school_id", "class_name", "section_id" FROM school_classes`;
    console.log("Classes:", classes);

  } catch (err: any) {
    console.error("❌ Failed to inspect REMOTE database:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
