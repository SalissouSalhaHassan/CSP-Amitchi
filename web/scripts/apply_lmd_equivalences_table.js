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

async function applyEquivalencesTable() {
  console.log("🏛️ Creating lmd_credit_equivalences Table in PostgreSQL...\n");

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "lmd_credit_equivalences" (
        "id" SERIAL PRIMARY KEY,
        "school_id" integer REFERENCES "schools"("id"),
        "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
        "origin_institution" varchar(200) NOT NULL,
        "origin_country" varchar(100) DEFAULT 'International',
        "origin_program" varchar(200),
        "academic_year" varchar(50),
        "target_program_id" integer REFERENCES "university_programs"("id"),
        "target_level" varchar(50) DEFAULT 'L2',
        "target_semester" varchar(50) DEFAULT 'S3',
        "credits_transferred" double precision NOT NULL DEFAULT 60.0,
        "equivalent_ues_json" text,
        "decision" varchar(50) DEFAULT 'Validé',
        "decision_date" timestamp DEFAULT now(),
        "commission_president" varchar(150),
        "commission_comments" text,
        "certificate_number" varchar(100),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log("✅ Created lmd_credit_equivalences table successfully!");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  } finally {
    await sql.end();
  }
}

applyEquivalencesTable();
