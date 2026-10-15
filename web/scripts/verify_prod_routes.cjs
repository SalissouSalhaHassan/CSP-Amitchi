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
  return process.env.REMOTE_DATABASE_URL;
}

const dbUrl = getRemoteDbUrl();
const sql = postgres(dbUrl, { max: 1, ssl: { rejectUnauthorized: false }, prepare: false });

async function check() {
  const routes = await sql`SELECT id, school_id, route_name, vehicle_number, driver_name, monthly_fee, status FROM transport_routes`;
  console.log("Current Supabase Production Routes:", routes);
  await sql.end();
}

check().catch(console.error);
