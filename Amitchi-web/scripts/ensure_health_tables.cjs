const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[match[1]] = val;
  }
}

const postgres = require(path.join(__dirname, '..', 'node_modules', 'postgres'));
const connectionString = envVars.REMOTE_DATABASE_URL || envVars.DATABASE_URL;
const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
  try {
    console.log("Creating table student_medical_records...");
    await sql`
      CREATE TABLE IF NOT EXISTS student_medical_records (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        blood_group VARCHAR(10),
        allergies TEXT,
        chronic_conditions TEXT,
        regular_medications TEXT,
        vaccinations JSONB,
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(50),
        emergency_contact_relation VARCHAR(50),
        doctor_name VARCHAR(150),
        doctor_phone VARCHAR(50),
        height_cm DOUBLE PRECISION,
        weight_kg DOUBLE PRECISION,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ student_medical_records table ensured.");

    console.log("Creating table infirmary_visits...");
    await sql`
      CREATE TABLE IF NOT EXISTS infirmary_visits (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        nurse_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        nurse_name VARCHAR(150),
        visit_date TIMESTAMP DEFAULT NOW() NOT NULL,
        symptoms TEXT NOT NULL,
        temperature DOUBLE PRECISION,
        blood_pressure VARCHAR(20),
        heart_rate INTEGER,
        diagnosis TEXT,
        care_provided TEXT,
        prescriptions TEXT,
        severity VARCHAR(30) DEFAULT 'Bénin',
        outcome VARCHAR(50) DEFAULT 'Retour en classe',
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ infirmary_visits table ensured.");

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS student_medical_records_school_id_idx ON student_medical_records(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS student_medical_records_student_id_idx ON student_medical_records(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS infirmary_visits_school_id_idx ON infirmary_visits(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS infirmary_visits_student_id_idx ON infirmary_visits(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS infirmary_visits_visit_date_idx ON infirmary_visits(visit_date)`;
    console.log("✅ Indexes ensured successfully.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error ensuring health tables:", err);
    process.exit(1);
  }
}

main();
