import postgres from "postgres";

const localUrl = "postgres://postgres:postgres@localhost:5432/edut";

async function main() {
  const sql = postgres(localUrl, { prepare: false });

  try {
    console.log("=== INSPECTING LOCAL DATABASE ===");
    
    const schools = await sql`SELECT id, name FROM schools`;
    console.log("Local Schools:", schools);

    const usersList = await sql`
      SELECT u.id, u.utilisateur, u.nom_prenom, u.school_id, u.admin, u.super_admin, u.educational_level, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `;
    console.log("Local Users:", usersList);

    const studentsCount = await sql`SELECT COUNT(*)::int as count FROM students`;
    console.log("Local Students Count:", studentsCount[0].count);

  } catch (err: any) {
    console.error("❌ Failed to inspect LOCAL database:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
