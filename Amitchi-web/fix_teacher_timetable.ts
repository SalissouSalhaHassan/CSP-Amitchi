import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  console.log("🔌 Connecting to Supabase to update timetable entries...");
  
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    // Update L1 Arabic (class_id 16) Anglais (subject_id 14) timetable entries to employee_id 1
    console.log("Updating L1 Arabic Anglais timetable entries to employee_id 1...");
    const res = await sql`
      UPDATE timetable_entries 
      SET employee_id = 1
      WHERE class_id = 16 AND subject_id = 14
      RETURNING *
    `;
    console.log("Updated Timetable Entries:", res);
    
    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Update failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
