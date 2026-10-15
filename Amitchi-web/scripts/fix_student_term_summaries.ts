import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("1. Dropping old student_term_summaries table...");
    await sql`DROP TABLE IF EXISTS "student_term_summaries" CASCADE`;
    console.log("Successfully dropped table.");

    console.log("\n2. Re-creating student_term_summaries table to match Drizzle Schema...");
    await sql`
      CREATE TABLE "student_term_summaries" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer,
        "class_id" integer,
        "session_id" integer,
        "term" varchar(50) NOT NULL,
        "conduite" double precision DEFAULT 0,
        "travail" varchar(100),
        "tableau_honneur" boolean DEFAULT false,
        "assiduite" varchar(100),
        "observation" text,
        "average" double precision DEFAULT 0,
        "rank" varchar(20),
        "decision" varchar(50),
        "created_at" timestamp DEFAULT now()
      )
    `;
    console.log("Successfully created table.");

    console.log("\n3. Adding foreign key constraints...");
    await sql`
      ALTER TABLE "student_term_summaries" 
      ADD CONSTRAINT "student_term_summaries_student_id_students_id_fk" 
      FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action
    `;
    
    await sql`
      ALTER TABLE "student_term_summaries" 
      ADD CONSTRAINT "student_term_summaries_class_id_school_classes_id_fk" 
      FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action
    `;

    await sql`
      ALTER TABLE "student_term_summaries" 
      ADD CONSTRAINT "student_term_summaries_session_id_school_sessions_id_fk" 
      FOREIGN KEY ("session_id") REFERENCES "public"."school_sessions"("id") ON DELETE cascade ON UPDATE no action
    `;
    console.log("Successfully added foreign key constraints.");

    console.log("\n4. Verifying new columns...");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_term_summaries'
    `;
    console.log("New columns in 'student_term_summaries':");
    columns.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type}`);
    });

    console.log("\n✅ Database table fixed successfully!");

  } catch (err: any) {
    console.error("\n❌ Error fixing database table:", err.message);
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
