import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    const schoolId = 9;

    console.log(`\n=== CHECKING STUDENTS IN SCHOOL ${schoolId} ===`);
    const totalStudents = await sql`
      SELECT COUNT(*), classe
      FROM students
      WHERE school_id = ${schoolId}
      GROUP BY classe
    `;
    console.log("Students Grouped by Class:", totalStudents);

    console.log("\n=== DETAILS OF STUDENTS IN L1 Arabic ===");
    const l1Students = await sql`
      SELECT id, nom_etudiant, num_admission, classe, educational_level, school_id
      FROM students
      WHERE school_id = ${schoolId} AND classe = 'L1 Arabic'
    `;
    console.log("Students in L1 Arabic:", l1Students);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
