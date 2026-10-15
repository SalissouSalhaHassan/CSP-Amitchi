import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    const studentUid = '781b6337-dafb-41e6-a591-9b8d56e2f2c2'; // adoada@gmail.com (Student)
    const parentUid = '1e110d1a-5d20-4085-bcaf-1a03f20b1f35';  // ado@gmail.com (Parent)

    for (const uid of [studentUid, parentUid]) {
      const email = uid === studentUid ? 'adoada@gmail.com' : 'ado@gmail.com';
      console.log(`\n=== SIMULATING RLS FOR USER: ${email} (UID: ${uid}) ===`);

      await sql.begin(async (tx) => {
        const claims = JSON.stringify({ 
          sub: uid, 
          role: 'authenticated', 
          email: email 
        });
        await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
        await tx`SET LOCAL ROLE authenticated`;

        // Check get_my_student_id()
        const myStudentId = await tx`SELECT get_my_student_id() as student_id`;
        console.log("  get_my_student_id():", myStudentId[0].student_id);

        // Check student select
        const studSelect = await tx`SELECT id, nom_etudiant FROM students`;
        console.log("  SELECT on students count:", studSelect.length);

        // Check student results select
        const resultsSelect = await tx`SELECT id FROM student_results`;
        console.log("  SELECT on student_results count:", resultsSelect.length);

        // Check transport subscriptions select
        const transportSelect = await tx`SELECT id FROM transport_subscriptions`;
        console.log("  SELECT on transport_subscriptions count:", transportSelect.length);
      });
    }

  } catch (err: any) {
    console.error("Error simulating RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
