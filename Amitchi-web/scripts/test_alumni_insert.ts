import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== TESTING INSERT ALUMNUS ===");
  const testRes = await sql`
    INSERT INTO alumni
      (school_id, full_name, gender, date_of_birth, nationality, phone, email, address,
       graduation_year, level_completed, series_or_track, final_grade, mention, exam_center,
       exam_registration_number, current_situation, current_employer,
       higher_education_institution, higher_education_field, notes)
    VALUES
      (9, 'Test Diplome', 'M', null, 'Nigérienne', '+22790000000', 'test@gmail.com', null,
       2026, 'Licence', 'Littéraire', '16/20', 'Très Bien', 'Lycée Test',
       'NUG-2026', 'Étudiant(e)', 'BR', 'SAT', 'MADE', 'YTT')
    RETURNING id
  `;
  console.log("Inserted alumnus successfully! ID:", testRes[0]?.id);

  const all = await sql`SELECT id, full_name, school_id FROM alumni`;
  console.log("All alumni:", all);

  await sql.end();
}

main().catch(console.error);
