import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SEEDING REMOTE DATABASE WITH TEST STUDENTS ===");

    const studentsToInsert = [
      // School 1 (Edut Pro Main)
      {
        school_id: 1,
        num_admission: "ADM001",
        nom_etudiant: "Ahmad Primaire",
        sexe: "Garçon",
        educational_level: "Primaire",
        classe: "6ème A",
        statut: "Actif"
      },
      {
        school_id: 1,
        num_admission: "ADM002",
        nom_etudiant: "Mariam Collège",
        sexe: "Fille",
        educational_level: "Collège",
        classe: "5ème A",
        statut: "Actif"
      },
      {
        school_id: 1,
        num_admission: "ADM003",
        nom_etudiant: "Zainab Lycée",
        sexe: "Fille",
        educational_level: "Lycée",
        classe: "2nde A",
        statut: "Actif"
      },
      // School 9 (GROUP AIIU-NIGER)
      {
        school_id: 9,
        num_admission: "ADM009_1",
        nom_etudiant: "Alioune Niger Primaire",
        sexe: "Garçon",
        educational_level: "Primaire",
        classe: "6ème A",
        statut: "Actif"
      },
      {
        school_id: 9,
        num_admission: "ADM009_2",
        nom_etudiant: "Fatou Niger Collège",
        sexe: "Fille",
        educational_level: "Collège",
        classe: "6ème A",
        statut: "Actif"
      }
    ];

    for (const student of studentsToInsert) {
      console.log(`Inserting student: ${student.nom_etudiant} (${student.educational_level}) for School ${student.school_id}...`);
      await sql`
        INSERT INTO students (school_id, num_admission, nom_etudiant, sexe, educational_level, classe, statut)
        VALUES (${student.school_id}, ${student.num_admission}, ${student.nom_etudiant}, ${student.sexe}, ${student.educational_level}, ${student.classe}, ${student.statut})
      `;
    }

    console.log("✅ Successfully seeded test students on REMOTE database!");
  } catch (err: any) {
    console.error("❌ Failed to seed students on REMOTE database:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
