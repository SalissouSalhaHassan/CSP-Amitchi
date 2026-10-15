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

async function applyTables() {
  console.log("💰 Creating Scholarships & Payment Schedules Tables in PostgreSQL...\n");

  try {
    // 1. scholarships
    await sql`
      CREATE TABLE IF NOT EXISTS "scholarships" (
        "id" SERIAL PRIMARY KEY,
        "school_id" integer REFERENCES "schools"("id"),
        "name" varchar(150) NOT NULL,
        "provider" varchar(150) DEFAULT 'Ministère de l''Enseignement Supérieur',
        "type" varchar(50) DEFAULT 'Pourcentage',
        "discount_value" double precision NOT NULL DEFAULT 50.0,
        "applies_to" varchar(50) DEFAULT 'Frais de Scolarité',
        "academic_year" varchar(50),
        "criteria" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log("✅ scholarships table ready!");

    // 2. student_scholarships
    await sql`
      CREATE TABLE IF NOT EXISTS "student_scholarships" (
        "id" SERIAL PRIMARY KEY,
        "school_id" integer REFERENCES "schools"("id"),
        "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
        "scholarship_id" integer REFERENCES "scholarships"("id") ON DELETE CASCADE,
        "academic_year" varchar(50),
        "custom_discount_percentage" double precision,
        "allocated_amount" double precision DEFAULT 0,
        "decision_reference" varchar(100),
        "decision_date" timestamp DEFAULT now(),
        "status" varchar(50) DEFAULT 'Actif',
        "notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `;
    console.log("✅ student_scholarships table ready!");

    // 3. student_payment_schedules
    await sql`
      CREATE TABLE IF NOT EXISTS "student_payment_schedules" (
        "id" SERIAL PRIMARY KEY,
        "school_id" integer REFERENCES "schools"("id"),
        "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
        "session_id" integer REFERENCES "school_sessions"("id"),
        "installment_number" integer NOT NULL DEFAULT 1,
        "label" varchar(100) NOT NULL,
        "due_date" timestamp NOT NULL,
        "gross_amount" double precision NOT NULL,
        "scholarship_deduction" double precision DEFAULT 0,
        "net_amount" double precision NOT NULL,
        "paid_amount" double precision DEFAULT 0,
        "balance" double precision NOT NULL,
        "status" varchar(50) DEFAULT 'À échoir',
        "reminder_sent_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log("✅ student_payment_schedules table ready!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await sql.end();
  }
}

applyTables();
