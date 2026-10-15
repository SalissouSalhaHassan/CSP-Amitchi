const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

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
  console.log("🚀 Ensuring Front Office tables in PostgreSQL...");
  try {
    // ── 1. Visitors ────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        visitor_name VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        id_card_number VARCHAR(100),
        visitor_type VARCHAR(80) DEFAULT 'Parent / Tuteur',
        purpose TEXT NOT NULL,
        meeting_with VARCHAR(150),
        student_name VARCHAR(150),
        date DATE DEFAULT CURRENT_DATE,
        time_in VARCHAR(10),
        time_out VARCHAR(10),
        badge_number VARCHAR(30),
        status VARCHAR(50) DEFAULT 'En cours',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS school_id INTEGER`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(100)`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visitor_type VARCHAR(80) DEFAULT 'Parent / Tuteur'`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS student_name VARCHAR(150)`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS badge_number VARCHAR(30)`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'En cours'`;
    await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS notes TEXT`;

    // ── 2. Gate Pass (Sortie temporaire des élèves) ────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS gate_passes (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_id INTEGER,
        student_name VARCHAR(150) NOT NULL,
        student_class VARCHAR(80),
        reason TEXT NOT NULL,
        authorized_by VARCHAR(150) DEFAULT 'Direction',
        parent_contact VARCHAR(80),
        exit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expected_return_time TIMESTAMP,
        actual_return_time TIMESTAMP,
        escort VARCHAR(150),
        status VARCHAR(50) DEFAULT 'Sorti',
        pass_number VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── 3. Admin Mail Registry (Courrier admin) ────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS admin_mail_registry (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        mail_type VARCHAR(30) NOT NULL DEFAULT 'Entrant',
        reference_number VARCHAR(100),
        subject VARCHAR(255) NOT NULL,
        sender_or_recipient VARCHAR(200) NOT NULL,
        mail_date DATE DEFAULT CURRENT_DATE,
        received_or_sent_date DATE DEFAULT CURRENT_DATE,
        assigned_to VARCHAR(150),
        category VARCHAR(80) DEFAULT 'Administratif',
        priority VARCHAR(30) DEFAULT 'Normal',
        status VARCHAR(50) DEFAULT 'Reçu',
        attachment_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── 4. Complaints & Suggestions (Réclamations) ────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS complaints_suggestions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        type VARCHAR(30) DEFAULT 'Réclamation',
        submitted_by VARCHAR(150) NOT NULL,
        contact VARCHAR(80),
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(80) DEFAULT 'Pédagogique',
        priority VARCHAR(30) DEFAULT 'Normale',
        status VARCHAR(50) DEFAULT 'Ouverte',
        assigned_to VARCHAR(150),
        resolution_notes TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── Indexes ──────────────────────────────────────────────────────────
    await sql`CREATE INDEX IF NOT EXISTS visitors_school_id_idx ON visitors(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS visitors_date_idx ON visitors(date)`;
    await sql`CREATE INDEX IF NOT EXISTS gate_passes_school_id_idx ON gate_passes(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS gate_passes_student_id_idx ON gate_passes(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS admin_mail_school_id_idx ON admin_mail_registry(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS complaints_school_id_idx ON complaints_suggestions(school_id)`;

    console.log("✅ All Front Office tables ensured successfully!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await sql.end();
  }
}

run();
