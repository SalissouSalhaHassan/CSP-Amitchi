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
    console.log("Ensuring HR self-service tables in PostgreSQL...");
    
    await sql`
      CREATE TABLE IF NOT EXISTS teacher_hr_requests (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        start_date VARCHAR(20),
        end_date VARCHAR(20),
        days_count INTEGER DEFAULT 1,
        advance_amount DOUBLE PRECISION,
        reason TEXT NOT NULL,
        document_url TEXT,
        status VARCHAR(30) DEFAULT 'En attente',
        admin_comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS teacher_extra_hours (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
        date VARCHAR(20) NOT NULL,
        type_hour VARCHAR(50) NOT NULL DEFAULT 'Heure supplémentaire',
        class_name VARCHAR(50),
        subject_name VARCHAR(100),
        hours_count DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 2500.0,
        total_amount DOUBLE PRECISION NOT NULL DEFAULT 2500.0,
        status VARCHAR(30) DEFAULT 'En attente',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS teacher_hr_requests_school_id_idx ON teacher_hr_requests(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS teacher_hr_requests_employee_id_idx ON teacher_hr_requests(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS teacher_extra_hours_school_id_idx ON teacher_extra_hours(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS teacher_extra_hours_employee_id_idx ON teacher_extra_hours(employee_id)`;

    console.log("✅ HR self-service tables verified and ready!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error verifying HR tables:", err);
    process.exit(1);
  }
}

main();
