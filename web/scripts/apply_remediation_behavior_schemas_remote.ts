import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("Applying database updates to REMOTE database...");

    console.log("1. Adding student_id to lms_assignments if not exists...");
    await sql`
      ALTER TABLE lms_assignments 
      ADD COLUMN IF NOT EXISTS student_id integer REFERENCES students(id) ON DELETE CASCADE
    `;

    console.log("2. Creating behavior_rewards table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS behavior_rewards (
        id SERIAL PRIMARY KEY,
        student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id integer REFERENCES schools(id),
        reward_type varchar(100) NOT NULL,
        points_effect double precision NOT NULL DEFAULT 0.0,
        reason text NOT NULL,
        granted_by varchar(255),
        created_at timestamp DEFAULT now()
      )
    `;

    console.log("3. Creating counselor_notes table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS counselor_notes (
        id SERIAL PRIMARY KEY,
        student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id integer REFERENCES schools(id),
        note_type varchar(100) NOT NULL,
        confidential_content text NOT NULL,
        recommendations text,
        is_secret boolean NOT NULL DEFAULT true,
        counselor_id integer,
        created_at timestamp DEFAULT now()
      )
    `;

    console.log("✅ All schemas applied to REMOTE database successfully!");
  } catch (err: any) {
    console.error("❌ Failed to apply database schema updates:", err.message);
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
