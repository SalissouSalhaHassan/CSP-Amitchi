const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

function getDbUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return process.env.DATABASE_URL;
}

const dbUrl = getDbUrl();
if (!dbUrl) {
  console.error("❌ DATABASE_URL not found!");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function run() {
  console.log("🚀 Ensuring Smart Transport & Boarding tables in PostgreSQL...");

  try {
    // 1. Ensure columns on transport_routes
    await sql`
      CREATE TABLE IF NOT EXISTS transport_routes (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        route_name VARCHAR(255) NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        driver_name VARCHAR(255) NOT NULL,
        driver_phone VARCHAR(50),
        capacity INTEGER DEFAULT 30,
        monthly_fee DOUBLE PRECISION NOT NULL DEFAULT 15000,
        stops JSONB,
        status VARCHAR(20) DEFAULT 'Actif',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE transport_routes 
      ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS stops JSONB,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Actif',
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    // 2. Ensure columns on transport_subscriptions
    await sql`
      CREATE TABLE IF NOT EXISTS transport_subscriptions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        pickup_point VARCHAR(255),
        pickup_stop VARCHAR(255),
        dropoff_stop VARCHAR(255),
        trip_type VARCHAR(50) DEFAULT 'Aller-Retour',
        parent_phone VARCHAR(50),
        parent_whatsapp VARCHAR(50),
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Actif',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE transport_subscriptions
      ADD COLUMN IF NOT EXISTS pickup_stop VARCHAR(255),
      ADD COLUMN IF NOT EXISTS dropoff_stop VARCHAR(255),
      ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50) DEFAULT 'Aller-Retour',
      ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS parent_whatsapp VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    // 3. Create transport_live_trips
    await sql`
      CREATE TABLE IF NOT EXISTS transport_live_trips (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        trip_date VARCHAR(20) NOT NULL,
        trip_type VARCHAR(50) DEFAULT 'Circuit Matin',
        driver_name VARCHAR(150),
        vehicle_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'Programmé',
        start_time VARCHAR(20),
        end_time VARCHAR(20),
        current_stop VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_school_id_idx ON transport_live_trips(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_route_id_idx ON transport_live_trips(route_id);`;
    await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_date_idx ON transport_live_trips(trip_date);`;

    // 4. Create transport_boarding_logs
    await sql`
      CREATE TABLE IF NOT EXISTS transport_boarding_logs (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        trip_id INTEGER REFERENCES transport_live_trips(id) ON DELETE CASCADE,
        "subscriptionId" INTEGER REFERENCES transport_subscriptions(id) ON DELETE SET NULL,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        scan_time TIMESTAMP DEFAULT NOW() NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        stop_name VARCHAR(150),
        scanned_by VARCHAR(150) DEFAULT 'Surveillant de bus',
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notification_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_school_id_idx ON transport_boarding_logs(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_trip_id_idx ON transport_boarding_logs(trip_id);`;
    await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_student_id_idx ON transport_boarding_logs(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_scan_time_idx ON transport_boarding_logs(scan_time);`;

    console.log("✅ All Smart Transport & Boarding tables and indexes successfully created / verified!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await sql.end();
  }
}

run();
