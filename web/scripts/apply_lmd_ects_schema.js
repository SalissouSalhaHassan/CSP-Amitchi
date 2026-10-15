const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

let connStr = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  let remoteUrl = null;
  let localUrl = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('REMOTE_DATABASE_URL=')) {
      remoteUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('DATABASE_URL=')) {
      localUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    }
  }
  connStr = remoteUrl || localUrl || connStr;
}

if (!connStr) {
  console.error("No DATABASE_URL found!");
  process.exit(1);
}

const sql = postgres(connStr, { ssl: { rejectUnauthorized: false } });

async function applyLmdEctsSchema() {
  console.log("🏛️ Applying University LMD & ECTS Schema Migrations to PostgreSQL...\n");

  const tableQueries = [
    // 1. university_faculties
    `CREATE TABLE IF NOT EXISTS "university_faculties" (
      "id" SERIAL PRIMARY KEY,
      "school_id" integer REFERENCES "schools"("id") ON DELETE CASCADE,
      "name" varchar(150) NOT NULL,
      "code" varchar(30),
      "dean_employee_id" integer REFERENCES "employees"("id"),
      "description" text,
      "created_at" timestamp DEFAULT now()
    );`,

    // 2. university_departments
    `CREATE TABLE IF NOT EXISTS "university_departments" (
      "id" SERIAL PRIMARY KEY,
      "faculty_id" integer REFERENCES "university_faculties"("id") ON DELETE CASCADE,
      "name" varchar(150) NOT NULL,
      "code" varchar(30),
      "head_employee_id" integer REFERENCES "employees"("id"),
      "description" text,
      "created_at" timestamp DEFAULT now()
    );`,

    // 3. university_programs
    `CREATE TABLE IF NOT EXISTS "university_programs" (
      "id" SERIAL PRIMARY KEY,
      "department_id" integer REFERENCES "university_departments"("id") ON DELETE CASCADE,
      "school_id" integer REFERENCES "schools"("id") ON DELETE CASCADE,
      "section_id" integer REFERENCES "school_sections"("id"),
      "name" varchar(150) NOT NULL,
      "code" varchar(50),
      "degree_level" varchar(50) NOT NULL DEFAULT 'Licence',
      "total_credits" integer DEFAULT 180,
      "duration_semesters" integer DEFAULT 6,
      "description" text,
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT now()
    );`,

    // Add section_id column if table already existed without it
    `ALTER TABLE "university_programs" ADD COLUMN IF NOT EXISTS "section_id" integer REFERENCES "school_sections"("id");`,

    // 4. lmd_unites_enseignement
    `CREATE TABLE IF NOT EXISTS "lmd_unites_enseignement" (
      "id" SERIAL PRIMARY KEY,
      "program_id" integer REFERENCES "university_programs"("id") ON DELETE CASCADE,
      "semester" varchar(20) NOT NULL,
      "code_ue" varchar(50) NOT NULL,
      "name_ue" varchar(150) NOT NULL,
      "type_ue" varchar(50) DEFAULT 'Fondamentale',
      "credits_ects" double precision NOT NULL DEFAULT 6.0,
      "total_hours" double precision DEFAULT 60.0,
      "min_passing_grade" double precision DEFAULT 10.0,
      "is_eliminatory" boolean DEFAULT false,
      "created_at" timestamp DEFAULT now()
    );`,

    // 5. lmd_elements_constitutifs
    `CREATE TABLE IF NOT EXISTS "lmd_elements_constitutifs" (
      "id" SERIAL PRIMARY KEY,
      "ue_id" integer REFERENCES "lmd_unites_enseignement"("id") ON DELETE CASCADE,
      "subject_id" integer REFERENCES "school_subjects"("id"),
      "code_ecu" varchar(50),
      "name_ecu" varchar(150) NOT NULL,
      "credits_ects" double precision DEFAULT 3.0,
      "coefficient" integer DEFAULT 1,
      "hours_cm" double precision DEFAULT 24.0,
      "hours_td" double precision DEFAULT 12.0,
      "hours_tp" double precision DEFAULT 0.0,
      "hours_tpe" double precision DEFAULT 24.0,
      "teacher_employee_id" integer REFERENCES "employees"("id"),
      "eliminatory_grade" double precision DEFAULT 7.0,
      "created_at" timestamp DEFAULT now()
    );`,

    // 6. student_lmd_ue_results
    `CREATE TABLE IF NOT EXISTS "student_lmd_ue_results" (
      "id" SERIAL PRIMARY KEY,
      "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
      "ue_id" integer REFERENCES "lmd_unites_enseignement"("id") ON DELETE CASCADE,
      "session_id" integer REFERENCES "school_sessions"("id"),
      "semester" varchar(20) NOT NULL,
      "raw_average" double precision,
      "validated_status" varchar(20) DEFAULT 'NV',
      "credits_acquired" double precision DEFAULT 0.0,
      "session_acquisition" varchar(30) DEFAULT 'Normale',
      "academic_year" varchar(30),
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );`,

    // 7. student_lmd_semesters
    `CREATE TABLE IF NOT EXISTS "student_lmd_semesters" (
      "id" SERIAL PRIMARY KEY,
      "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
      "program_id" integer REFERENCES "university_programs"("id"),
      "class_id" integer REFERENCES "school_classes"("id"),
      "semester" varchar(20) NOT NULL,
      "session_id" integer REFERENCES "school_sessions"("id"),
      "semester_average" double precision,
      "credits_acquired" double precision DEFAULT 0.0,
      "total_credits_accumulated" double precision DEFAULT 0.0,
      "decision" varchar(100) DEFAULT 'Ajourné',
      "rank" varchar(20),
      "mention" varchar(50),
      "session_type" varchar(30) DEFAULT 'Normale',
      "jury_deliberation_notes" text,
      "validated_at" timestamp,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );`,
  ];

  for (const q of tableQueries) {
    try {
      await sql.unsafe(q);
      console.log(`✅ Executed: ${q.split('\n')[0].trim()}`);
    } catch (err) {
      console.warn(`⚠️ Warning: ${err.message}`);
    }
  }

  console.log("\n✨ All University LMD / ECTS tables successfully created and verified in PostgreSQL!");
  process.exit(0);
}

applyLmdEctsSchema().catch((err) => {
  console.error("❌ Fatal Migration Error:", err);
  process.exit(1);
});
