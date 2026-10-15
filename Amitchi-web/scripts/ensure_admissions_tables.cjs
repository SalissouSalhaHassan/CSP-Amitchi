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
    console.log("Creating admission_applications table in PostgreSQL...");
    await sql`
      CREATE TABLE IF NOT EXISTS admission_applications (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(50) NOT NULL UNIQUE,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_first_name VARCHAR(150) NOT NULL,
        student_last_name VARCHAR(150) NOT NULL,
        date_of_birth VARCHAR(50) NOT NULL,
        gender VARCHAR(10) NOT NULL DEFAULT 'M',
        place_of_birth VARCHAR(150),
        nationality VARCHAR(100) DEFAULT 'Nigérienne',
        target_class VARCHAR(100) NOT NULL,
        previous_school VARCHAR(255),
        previous_grade_avg VARCHAR(50),
        parent_name VARCHAR(255) NOT NULL,
        parent_relation VARCHAR(50) DEFAULT 'Père',
        parent_phone VARCHAR(50) NOT NULL,
        parent_whatsapp VARCHAR(50),
        parent_email VARCHAR(150),
        parent_profession VARCHAR(150),
        address TEXT,
        city VARCHAR(100) DEFAULT 'Niamey',
        birth_certificate_url TEXT,
        photo_url TEXT,
        report_card_url TEXT,
        medical_notes TEXT,
        payment_receipt_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'En attente',
        review_notes TEXT,
        reviewed_by VARCHAR(150),
        reviewed_at TIMESTAMP,
        admitted_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        generated_matricule VARCHAR(50),
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS admission_applications_school_id_idx ON admission_applications(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS admission_applications_status_idx ON admission_applications(status)`;
    await sql`CREATE INDEX IF NOT EXISTS admission_applications_number_idx ON admission_applications(application_number)`;

    console.log("✅ Table admission_applications created successfully with indexes!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error ensuring admissions table:", err);
    process.exit(1);
  }
}

main();
