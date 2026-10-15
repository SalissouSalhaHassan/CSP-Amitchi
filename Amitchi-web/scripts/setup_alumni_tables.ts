import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== CREATING ALUMNI TABLES IF NOT EXIST ===");

  await sql`
    CREATE TABLE IF NOT EXISTS alumni (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
      full_name VARCHAR(255) NOT NULL,
      gender VARCHAR(10) DEFAULT 'M',
      date_of_birth DATE,
      nationality VARCHAR(100) DEFAULT 'Nigérienne',
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      photo_url TEXT,
      graduation_year INTEGER NOT NULL,
      level_completed VARCHAR(100) NOT NULL,
      series_or_track VARCHAR(100),
      final_grade VARCHAR(20),
      mention VARCHAR(50),
      exam_center VARCHAR(255),
      exam_registration_number VARCHAR(100),
      current_situation VARCHAR(100) DEFAULT 'Inconnu',
      current_employer VARCHAR(255),
      higher_education_institution VARCHAR(255),
      higher_education_field VARCHAR(255),
      linkedin_url VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("alumni table created or verified!");

  await sql`
    CREATE TABLE IF NOT EXISTS digital_certificates (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      alumni_id INTEGER REFERENCES alumni(id) ON DELETE CASCADE,
      certificate_type VARCHAR(100) DEFAULT 'Attestation de Réussite',
      certificate_number VARCHAR(100) UNIQUE NOT NULL,
      verification_code VARCHAR(100) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      date_of_birth DATE,
      graduation_year INTEGER NOT NULL,
      level_completed VARCHAR(100) NOT NULL,
      series_or_track VARCHAR(100),
      final_grade VARCHAR(20),
      mention VARCHAR(50),
      exam_registration_number VARCHAR(100),
      school_name VARCHAR(255),
      director_name VARCHAR(255),
      issued_by VARCHAR(100),
      issued_date DATE DEFAULT CURRENT_DATE,
      is_valid BOOLEAN DEFAULT TRUE,
      revoked_reason TEXT,
      revoked_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("digital_certificates table created or verified!");

  await sql`
    CREATE TABLE IF NOT EXISTS certificate_verification_logs (
      id SERIAL PRIMARY KEY,
      certificate_id INTEGER REFERENCES digital_certificates(id) ON DELETE SET NULL,
      verification_code VARCHAR(100) NOT NULL,
      result VARCHAR(50) NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("certificate_verification_logs table created or verified!");

  // Ensure Alumni module permission exists
  const existingMod = await sql`SELECT id FROM modules WHERE nom_module = 'Alumni'`;
  if (existingMod.length === 0) {
    await sql`INSERT INTO modules (nom_module) VALUES ('Alumni')`;
    console.log("Inserted Alumni into modules!");
  }

  await sql.end();
}

main().catch(console.error);
