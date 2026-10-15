import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING STUDENT 59 ===");
    const student = await sql`
      SELECT id, school_id, nom_etudiant, classe, num_admission, mobile, whatsapp, nom_pere
      FROM public.students
      WHERE id = 59
    `;
    console.table(student);
  } catch (err: any) {
    console.error("Error inspecting student:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
