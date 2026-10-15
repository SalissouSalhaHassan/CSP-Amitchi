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
const sql = postgres(dbUrl, { max: 1 });

async function fixAll() {
  console.log("🔧 Fixing and aligning all transport schema columns in PostgreSQL...");

  // 1. transport_routes
  await sql`
    ALTER TABLE transport_routes 
    ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS stops JSONB,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Actif',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_routes_school_id_idx ON transport_routes(school_id);`;

  // 2. transport_subscriptions
  await sql`
    ALTER TABLE transport_subscriptions
    ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS route_id INTEGER REFERENCES transport_routes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS pickup_point VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pickup_stop VARCHAR(255),
    ADD COLUMN IF NOT EXISTS dropoff_stop VARCHAR(255),
    ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50) DEFAULT 'Aller-Retour',
    ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS parent_whatsapp VARCHAR(50),
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Actif',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_school_id_idx ON transport_subscriptions(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_student_id_idx ON transport_subscriptions(student_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_route_id_idx ON transport_subscriptions(route_id);`;

  // 3. transport_live_trips
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
  await sql`
    ALTER TABLE transport_live_trips
    ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS route_id INTEGER REFERENCES transport_routes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS trip_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50) DEFAULT 'Circuit Matin',
    ADD COLUMN IF NOT EXISTS driver_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Programmé',
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(20),
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(20),
    ADD COLUMN IF NOT EXISTS current_stop VARCHAR(150),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_school_id_idx ON transport_live_trips(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_route_id_idx ON transport_live_trips(route_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_date_idx ON transport_live_trips(trip_date);`;

  // 4. transport_boarding_logs
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
  await sql`
    ALTER TABLE transport_boarding_logs
    ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES transport_live_trips(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS "subscriptionId" INTEGER REFERENCES transport_subscriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS scan_time TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS stop_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS scanned_by VARCHAR(150) DEFAULT 'Surveillant de bus',
    ADD COLUMN IF NOT EXISTS parent_notified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parent_notification_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_school_id_idx ON transport_boarding_logs(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_trip_id_idx ON transport_boarding_logs(trip_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_student_id_idx ON transport_boarding_logs(student_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_scan_time_idx ON transport_boarding_logs(scan_time);`;

  console.log("✅ All transport tables structure updated!");

  // Test insert again
  const stopsData = [
    { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
    { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
    { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 }
  ];
  const inserted = await sql`
    INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity, monthly_fee, stops, status, notes)
    VALUES (9, 'Maradi-Niger', 'RN 2845 MI', 'Siraji', '+227 99 42 52 98', 30, 15000, ${JSON.stringify(stopsData)}::jsonb, 'Actif', null)
    RETURNING *
  `;
  console.log("🎉 Test insert successfully completed! ID:", inserted[0]?.id);

  // Also clean up or keep test row
  await sql.end();
}

fixAll().catch(e => {
  console.error("❌ Fix error:", e);
  process.exit(1);
});
