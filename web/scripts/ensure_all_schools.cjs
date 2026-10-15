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

async function run() {
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'schools'
  `;
  console.log("Schools columns:", cols);

  const existing = await sql`SELECT * FROM schools`;
  console.log("Existing schools:", existing);

  // Insert school 9 with appropriate columns
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

  const existingIds = new Set(existing.map(s => s.id));
  for (const s of sampleSchools) {
    if (!existingIds.has(s.id)) {
      await sql`
        INSERT INTO schools (id, name, slug)
        VALUES (${s.id}, ${s.name}, ${s.slug})
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`✅ Ensured School ID ${s.id}: ${s.name}`);
    }
  }

  // Also test inserting a route for school 9!
  const stopsData = [
    { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
    { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
    { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 }
  ];
  const insertedRoute = await sql`
    INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity, monthly_fee, stops, status, notes)
    VALUES (9, 'Maradi-Niger', 'RN 2845 MI', 'Siraji', '+227 99 42 52 98', 30, 15000, ${JSON.stringify(stopsData)}::jsonb, 'Actif', null)
    RETURNING *
  `;
  console.log("🎉 ROUTE INSERT FOR SCHOOL 9 SUCCEEDED:", insertedRoute[0]);

  await sql.end();
}

run().catch(console.error);
