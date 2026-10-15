const postgres = require("postgres");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getDbUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (m) return m[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return process.env.DATABASE_URL;
}

const sql = postgres(getDbUrl(), { max: 1 });

async function run() {
  console.log("🎓 Ensuring Alumni & Digital Diplomas tables...");
  try {
    // ── 1. Alumni Registry ────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS alumni (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_id INTEGER,
        full_name VARCHAR(200) NOT NULL,
        gender VARCHAR(20) DEFAULT 'M',
        date_of_birth DATE,
        nationality VARCHAR(80) DEFAULT 'Nigérienne',
        phone VARCHAR(50),
        email VARCHAR(150),
        address TEXT,
        graduation_year INTEGER NOT NULL,
        level_completed VARCHAR(100),
        series_or_track VARCHAR(80),
        final_grade VARCHAR(30),
        mention VARCHAR(50),
        exam_center VARCHAR(150),
        exam_registration_number VARCHAR(100),
        current_situation VARCHAR(100) DEFAULT 'Inconnu',
        current_employer VARCHAR(150),
        higher_education_institution VARCHAR(200),
        higher_education_field VARCHAR(150),
        photo_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS alumni_school_id_idx ON alumni(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS alumni_graduation_year_idx ON alumni(graduation_year)`;

    // ── 2. Digital Diplomas / Certificates ───────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS digital_certificates (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        alumni_id INTEGER REFERENCES alumni(id) ON DELETE CASCADE,
        certificate_type VARCHAR(100) NOT NULL DEFAULT 'Attestation de Réussite',
        certificate_number VARCHAR(100) UNIQUE NOT NULL,
        verification_code VARCHAR(64) UNIQUE NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        date_of_birth DATE,
        graduation_year INTEGER NOT NULL,
        level_completed VARCHAR(100),
        series_or_track VARCHAR(80),
        final_grade VARCHAR(30),
        mention VARCHAR(50),
        exam_registration_number VARCHAR(100),
        school_name VARCHAR(200),
        school_stamp TEXT,
        director_name VARCHAR(150),
        director_signature TEXT,
        issued_date DATE DEFAULT CURRENT_DATE,
        issued_by VARCHAR(150),
        is_valid BOOLEAN DEFAULT TRUE,
        revoked_reason TEXT,
        revoked_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS certs_school_id_idx ON digital_certificates(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS certs_verification_code_idx ON digital_certificates(verification_code)`;
    await sql`CREATE INDEX IF NOT EXISTS certs_alumni_id_idx ON digital_certificates(alumni_id)`;

    // ── 3. Verification Logs ──────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS certificate_verification_logs (
        id SERIAL PRIMARY KEY,
        certificate_id INTEGER REFERENCES digital_certificates(id) ON DELETE CASCADE,
        verification_code VARCHAR(64),
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verifier_ip VARCHAR(45),
        verifier_user_agent TEXT,
        result VARCHAR(20) DEFAULT 'VALID'
      )
    `;

    console.log("✅ Alumni & Digital Certificates tables created successfully!");

    // ── Sample seed data for testing ─────────────────────────────────────
    const count = await sql`SELECT COUNT(*) as c FROM alumni`;
    if (Number(count[0].c) === 0) {
      console.log("🌱 Seeding sample alumni...");
      const sampleAlumni = [
        { name: "Ibrahim Moussa Abdou", year: 2024, level: "Baccalauréat", series: "C", grade: "14.25/20", mention: "Bien" },
        { name: "Fatoumata Seydou", year: 2024, level: "Baccalauréat", series: "A", grade: "12.80/20", mention: "Assez Bien" },
        { name: "Mahamadou Laouali", year: 2023, level: "BEPC", series: "", grade: "13.50/20", mention: "Bien" },
        { name: "Ramatou Bachir", year: 2024, level: "BEPC", series: "", grade: "15.00/20", mention: "Bien" },
        { name: "Adamou Souley", year: 2023, level: "Baccalauréat", series: "D", grade: "11.20/20", mention: "Passable" },
      ];
      for (const a of sampleAlumni) {
        const result = await sql`
          INSERT INTO alumni (school_id, full_name, graduation_year, level_completed, series_or_track, final_grade, mention)
          VALUES (1, ${a.name}, ${a.year}, ${a.level}, ${a.series}, ${a.grade}, ${a.mention})
          RETURNING id
        `;
        const alumniId = result[0].id;
        const certNum = `CERT-${a.year}-${String(alumniId).padStart(5, "0")}`;
        const verCode = crypto.randomBytes(20).toString("hex");
        await sql`
          INSERT INTO digital_certificates
            (school_id, alumni_id, certificate_type, certificate_number, verification_code,
             full_name, graduation_year, level_completed, series_or_track, final_grade, mention,
             school_name, director_name, issued_by, is_valid)
          VALUES
            (1, ${alumniId}, 'Attestation de Réussite', ${certNum}, ${verCode},
             ${a.name}, ${a.year}, ${a.level}, ${a.series}, ${a.grade}, ${a.mention},
             'École Edut', 'M. Directeur Général', 'Administration', TRUE)
        `;
      }
      console.log("✅ Sample data seeded!");
    }

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await sql.end();
  }
}

run();
