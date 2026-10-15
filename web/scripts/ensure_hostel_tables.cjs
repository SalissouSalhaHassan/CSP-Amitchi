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
    console.log("Ensuring hostel & dormitory tables in PostgreSQL...");

    // 1. Ensure basic hostel_rooms & hostel_allocations exist
    await sql`
      CREATE TABLE IF NOT EXISTS hostel_rooms (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        room_number VARCHAR(50) NOT NULL,
        building_name VARCHAR(255) NOT NULL,
        room_type VARCHAR(50) DEFAULT 'Mixte',
        capacity INTEGER DEFAULT 1,
        cost_per_term DOUBLE PRECISION DEFAULT 0,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS hostel_allocations (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        join_date TIMESTAMP DEFAULT NOW(),
        leave_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Occupé',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 2. Create hostel_night_attendance
    await sql`
      CREATE TABLE IF NOT EXISTS hostel_night_attendance (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        date VARCHAR(20) NOT NULL,
        time VARCHAR(10),
        status VARCHAR(30) NOT NULL DEFAULT 'Présent',
        checked_by VARCHAR(100) DEFAULT 'Surveillant Internat',
        remarks TEXT,
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 3. Create hostel_exit_permissions
    await sql`
      CREATE TABLE IF NOT EXISTS hostel_exit_permissions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES hostel_rooms(id) ON DELETE SET NULL,
        permission_type VARCHAR(50) NOT NULL DEFAULT 'Sortie weekend',
        departure_date VARCHAR(20) NOT NULL,
        return_date_expected VARCHAR(20) NOT NULL,
        actual_return_date VARCHAR(20),
        exit_time VARCHAR(10),
        return_time VARCHAR(10),
        guardian_name VARCHAR(150),
        guardian_phone VARCHAR(50),
        reason TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'En attente',
        approved_by VARCHAR(100),
        approval_remarks TEXT,
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 4. Create hostel_visitors_log
    await sql`
      CREATE TABLE IF NOT EXISTS hostel_visitors_log (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        visitor_name VARCHAR(150) NOT NULL,
        relation VARCHAR(50) NOT NULL DEFAULT 'Parent',
        visitor_phone VARCHAR(50),
        cnic VARCHAR(50),
        visit_date VARCHAR(20) NOT NULL,
        entry_time VARCHAR(10) NOT NULL,
        exit_time VARCHAR(10),
        purpose TEXT DEFAULT 'Visite familiale',
        remarks TEXT,
        recorded_by VARCHAR(100) DEFAULT 'Gardien internat',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS hostel_night_attendance_school_id_idx ON hostel_night_attendance(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_night_attendance_date_idx ON hostel_night_attendance(date)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_night_attendance_student_id_idx ON hostel_night_attendance(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_exit_permissions_school_id_idx ON hostel_exit_permissions(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_exit_permissions_student_id_idx ON hostel_exit_permissions(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_visitors_log_school_id_idx ON hostel_visitors_log(school_id)`;
    await sql`CREATE INDEX IF NOT EXISTS hostel_visitors_log_date_idx ON hostel_visitors_log(visit_date)`;

    console.log("✅ Hostel & Dormitory tables successfully created in PostgreSQL!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error ensuring hostel tables:", err);
    process.exit(1);
  }
}

main();
