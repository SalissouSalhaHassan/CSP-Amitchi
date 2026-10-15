import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING ROLES ===");
    const roles = await sql`
      SELECT id, role_name FROM public.roles
    `;
    console.table(roles);
  } catch (err: any) {
    console.error("Error inspecting roles:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
