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

async function applyUniversityAdmissionsSchema() {
  console.log("🏛️ Applying University & Higher Education Admissions Schema Migrations...\n");

  const columnQueries = [
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "education_level" varchar(50) DEFAULT 'Secondaire';`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "faculty" varchar(150);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "department" varchar(150);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "degree_program" varchar(150);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "degree_level" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "study_mode" varchar(50) DEFAULT 'Présentiel / Temps plein';`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "academic_year" varchar(50) DEFAULT '2026–2027';`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "candidate_email" varchar(150);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "candidate_phone" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "candidate_whatsapp" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_series" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_year" varchar(20);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_mention" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_roll_number" varchar(100);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_transcript_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "bac_certificate_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "higher_ed_transcript_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "cv_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "cover_letter" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "recommendation_letter_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "id_card_passport_url" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "admission_score" double precision;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "interview_score" double precision;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "interview_date" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "jury_decision" varchar(50);`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "jury_comment" text;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "tuition_deposit_paid" boolean DEFAULT false;`,
    `ALTER TABLE "admission_applications" ADD COLUMN IF NOT EXISTS "tuition_deposit_receipt_url" text;`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS "admission_applications_education_level_idx" ON "admission_applications" ("school_id", "education_level");`,
    `CREATE INDEX IF NOT EXISTS "admission_applications_faculty_idx" ON "admission_applications" ("school_id", "faculty");`,
    `CREATE INDEX IF NOT EXISTS "admission_applications_degree_program_idx" ON "admission_applications" ("school_id", "degree_program");`,
  ];

  for (const q of columnQueries) {
    try {
      await sql.unsafe(q);
      console.log(`✅ EXECUTED: ${q.trim()}`);
    } catch (e) {
      console.warn(`⚠️ Warning executing: ${q}:`, e.message);
    }
  }

  console.log("\n⚡ Verifying columns in admission_applications table...");
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'admission_applications'
    ORDER BY ordinal_position;
  `;
  for (const col of columns) {
    console.log(`   • ${col.column_name} (${col.data_type})`);
  }

  await sql.end();
  console.log("\n🎉 UNIVERSITY ADMISSIONS SCHEMA APPLIED SUCCESSFULLY!");
  process.exit(0);
}

applyUniversityAdmissionsSchema().catch(async (err) => {
  console.error("Migration error:", err);
  await sql.end();
  process.exit(1);
});
