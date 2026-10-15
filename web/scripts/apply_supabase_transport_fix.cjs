const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

function getRemoteDbUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^REMOTE_DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
}

const remoteUrl = getRemoteDbUrl();
console.log("🔌 Connecting directly to SUPABASE (Production):", remoteUrl.replace(/:([^:@]+)@/, ":****@"));

const sql = postgres(remoteUrl, { 
  max: 1, 
  ssl: { rejectUnauthorized: false },
  prepare: false 
});

async function migrateSupabase() {
  console.log("🚀 Running complete Transport & Schools fix on SUPABASE Production DB...");

  // 1. Ensure columns on transport_routes in Supabase
  await sql`
    CREATE TABLE IF NOT EXISTS transport_routes (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
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
  console.log("Verified transport_routes table.");

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
  console.log("✅ transport_routes schema updated on Supabase.");

  // 2. Ensure columns on transport_subscriptions
  await sql`
    CREATE TABLE IF NOT EXISTS transport_subscriptions (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
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
    ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS pickup_stop VARCHAR(255),
    ADD COLUMN IF NOT EXISTS dropoff_stop VARCHAR(255),
    ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50) DEFAULT 'Aller-Retour',
    ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS parent_whatsapp VARCHAR(50),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_school_id_idx ON transport_subscriptions(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_student_id_idx ON transport_subscriptions(student_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_subscriptions_route_id_idx ON transport_subscriptions(route_id);`;
  console.log("✅ transport_subscriptions schema updated on Supabase.");

  // 3. Ensure transport_live_trips
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
    ADD COLUMN IF NOT EXISTS current_stop VARCHAR(150),
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_school_id_idx ON transport_live_trips(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_route_id_idx ON transport_live_trips(route_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_live_trips_date_idx ON transport_live_trips(trip_date);`;
  console.log("✅ transport_live_trips schema updated on Supabase.");

  // 4. Ensure transport_boarding_logs
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
    ADD COLUMN IF NOT EXISTS "subscriptionId" INTEGER REFERENCES transport_subscriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parent_notified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parent_notification_sent_at TIMESTAMP;
  `;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_school_id_idx ON transport_boarding_logs(school_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_trip_id_idx ON transport_boarding_logs(trip_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_student_id_idx ON transport_boarding_logs(student_id);`;
  await sql`CREATE INDEX IF NOT EXISTS transport_boarding_logs_scan_time_idx ON transport_boarding_logs(scan_time);`;
  console.log("✅ transport_boarding_logs schema updated on Supabase.");

  // 5. Ensure Schools in Supabase
  const schoolsInSupabase = await sql`SELECT id, name FROM schools`;
  console.log("Schools currently in Supabase:", schoolsInSupabase);

  const sampleSchools = [
    { id: 1, name: "CES ALKAHIRA FA", slug: "ces-alkahira-fa" },
    { id: 2, name: "Super Admin", slug: "super-admin" },
    { id: 3, name: "Complexe Scolaire Excellence", slug: "excellence" },
    { id: 4, name: "Lycée Dan Baskoré", slug: "dan-baskore" },
    { id: 5, name: "Collège Privé Moderne", slug: "moderne" },
    { id: 6, name: "École Primaire Al-Nour", slug: "al-nour" },
    { id: 7, name: "Institut Supérieur Sahel", slug: "sahel" },
    { id: 8, name: "Groupe Scolaire Élite", slug: "elite" },
    { id: 9, name: "Complexe Scolaire Maradi-Niger", slug: "maradi" },
    { id: 10, name: "Académie Horizon", slug: "horizon" },
  ];

  const existingIds = new Set(schoolsInSupabase.map(s => s.id));
  for (const s of sampleSchools) {
    if (!existingIds.has(s.id)) {
      await sql`
        INSERT INTO schools (id, name, slug, status, plan, created_at)
        VALUES (${s.id}, ${s.name}, ${s.slug}, 'active', 'enterprise', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`✨ Ensured School in Supabase: ID ${s.id} (${s.name})`);
    }
  }

  // 6. Test direct INSERT of the exact route requested by the user:
  const stopsData = [
    { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
    { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
    { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 }
  ];

  const testInsert = await sql`
    INSERT INTO transport_routes (
      school_id, route_name, vehicle_number, driver_name, driver_phone, capacity, monthly_fee, stops, status, notes
    ) VALUES (
      9, 'Bgalam', 'RN 8281 MI', 'Siraji', '+227 99 42 52 98', 30, 15000, ${JSON.stringify(stopsData)}::jsonb, 'Actif', null
    ) RETURNING *;
  `;
  console.log("🎉 EXACT USER ROUTE INSERTED DIRECTLY ON SUPABASE PROD DB:", testInsert[0]);

  await sql.end();
  console.log("🚀 SUPABASE PROD DATABASE FULLY REPAIRED & SYNCED!");
}

migrateSupabase().catch(e => {
  console.error("❌ Supabase Migration Error:", e);
  process.exit(1);
});
