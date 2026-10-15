import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING REMOTE STUDENT RECORD ===");
    const studentsList = await sql`
      SELECT id, firstname, lastname, classe, school_id 
      FROM public.students 
      WHERE firstname ILIKE '%Ado%' OR lastname ILIKE '%Moussa%';
    `;
    console.log("Students found:");
    console.log(JSON.stringify(studentsList, null, 2));

    if (studentsList.length > 0) {
      const studentId = studentsList[0].id;
      console.log(`=== INSPECTING USER PROFILES LINKED TO STUDENT ID ${studentId} ===`);
      const users = await sql`
        SELECT id, utilisateur, nom_prenom, role_id, school_id, student_id, supabase_id
        FROM public.users
        WHERE student_id = ${studentId} OR utilisateur ILIKE '%ado%' OR utilisateur ILIKE '%moussa%';
      `;
      console.log("Users found:");
      console.log(JSON.stringify(users, null, 2));
    } else {
      console.log("No student found with name Ado / Moussa.");
    }

  } catch (err: any) {
    console.error("Error running script:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
