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

async function check() {
  const schools = await sql`SELECT id, name FROM schools ORDER BY id`;
  console.log("Existing Schools in Database:", schools);

  if (schools.length > 0) {
    const targetSchoolId = schools[0].id;
    console.log("Testing insert with valid school ID:", targetSchoolId);
    const stopsData = [
      { id: "1", stopName: "Terminus / Départ", timeMorning: "06:30", timeEvening: "16:45", order: 1 },
      { id: "2", stopName: "Carrefour Central", timeMorning: "06:45", timeEvening: "16:30", order: 2 },
      { id: "3", stopName: "École (Arrivée)", timeMorning: "07:15", timeEvening: "16:00", order: 3 }
    ];
    const res = await sql`
      INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity, monthly_fee, stops, status, notes)
      VALUES (${targetSchoolId}, 'Ligne Test', 'RN-1234', 'Chauffeur Test', '+227 00 00 00 00', 30, 15000, ${JSON.stringify(stopsData)}::jsonb, 'Actif', null)
      RETURNING *
    `;
    console.log("✅ Insert test succeeded! Inserted route:", res[0]);

    // Clean up test route
    await sql`DELETE FROM transport_routes WHERE id = ${res[0].id}`;
    console.log("Cleaned up test route.");
  }

  await sql.end();
}

check().catch(console.error);
