import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    const roleId = 19;

    console.log(`\n=== CHECKING ROLE AND PERMISSIONS FOR ROLE ID ${roleId} ===`);
    const role = await sql`
      SELECT id, role_name, description
      FROM roles
      WHERE id = ${roleId}
    `;
    console.log("Role:", role);

    const perms = await sql`
      SELECT id, module_name, can_view, can_edit, can_delete
      FROM role_permissions
      WHERE role_id = ${roleId}
    `;
    console.log("Permissions:", perms);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
