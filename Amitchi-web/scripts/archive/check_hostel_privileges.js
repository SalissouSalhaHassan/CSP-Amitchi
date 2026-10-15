const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const sql = postgres(connectionString);
  try {
    const privileges = await sql`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'hostel_rooms'
    `;
    console.log("=== PRIVILEGES ON HOSTEL_ROOMS ===");
    console.log(privileges);

    // Let's also check if we can simulate the insert as the 'authenticated' role
    console.log("Simulating insert as role 'authenticated'...");
    try {
      await sql.begin(async tx => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`
          INSERT INTO hostel_rooms (room_number, building_name, room_type, capacity, occupied_beds, cost)
          VALUES ('TEST-AUTH-ROLE', 'Test', 'Mixte', 4, 0, 50000)
        `;
      });
      console.log("Insert as authenticated role succeeded!");
    } catch (e) {
      console.error("Insert as authenticated role failed:", e.message);
      console.error(e);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
