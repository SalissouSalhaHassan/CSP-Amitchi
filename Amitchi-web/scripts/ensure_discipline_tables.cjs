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
    console.log("Ensuring discipline_incidents columns...");
    await sql`
      CREATE TABLE IF NOT EXISTS discipline_incidents (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        date TIMESTAMP DEFAULT NOW(),
        incident_type VARCHAR(255) NOT NULL,
        severity VARCHAR(50) NOT NULL DEFAULT 'Mineur',
        description TEXT,
        proposed_action VARCHAR(255),
        sanction_type VARCHAR(100) DEFAULT 'Rappel à l''ordre',
        sanction_duration_days INTEGER DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'En attente',
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        created_by VARCHAR(255) DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Ensure newly added columns if table previously existed
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS sanction_type VARCHAR(100) DEFAULT 'Rappel à l''ordre'`;
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS sanction_duration_days INTEGER DEFAULT 0`;
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS parent_notified BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS parent_notification_sent_at TIMESTAMP`;
    await sql`ALTER TABLE discipline_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
    console.log("✅ discipline_incidents columns ensured.");

    console.log("Creating table disciplinary_councils...");
    await sql`
      CREATE TABLE IF NOT EXISTS disciplinary_councils (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        incident_id INTEGER REFERENCES discipline_incidents(id) ON DELETE SET NULL,
        session_date TIMESTAMP DEFAULT NOW() NOT NULL,
        location VARCHAR(150) DEFAULT 'Salle de délibération',
        president_name VARCHAR(150),
        members_present TEXT,
        parent_convocation_status VARCHAR(50) DEFAULT 'Convoqué',
        reproached_facts TEXT NOT NULL,
        student_defense TEXT,
        decision_type VARCHAR(150) NOT NULL,
        exclusion_days INTEGER DEFAULT 0,
        exclusion_start_date VARCHAR(30),
        exclusion_end_date VARCHAR(30),
        report_summary TEXT,
        status VARCHAR(50) DEFAULT 'Programmé',
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ disciplinary_councils ensured.");

    console.log("Creating table parent_convocations...");
    await sql`
      CREATE TABLE IF NOT EXISTS parent_convocations (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        incident_id INTEGER REFERENCES discipline_incidents(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        convocation_date TIMESTAMP NOT NULL,
        location VARCHAR(150) DEFAULT 'Bureau du Censeur / Surveillant Général',
        status VARCHAR(50) DEFAULT 'Envoyé',
        channel VARCHAR(50) DEFAULT 'WhatsApp',
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ parent_convocations ensured.");

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS discipline_incidents_school_id_idx ON discipline_incidents(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS discipline_incidents_student_id_idx ON discipline_incidents(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS disciplinary_councils_school_id_idx ON disciplinary_councils(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS disciplinary_councils_student_id_idx ON disciplinary_councils(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS parent_convocations_school_id_idx ON parent_convocations(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS parent_convocations_student_id_idx ON parent_convocations(student_id)`;
    console.log("✅ Discipline indexes ensured.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error ensuring discipline tables:", err);
    process.exit(1);
  }
}

main();
