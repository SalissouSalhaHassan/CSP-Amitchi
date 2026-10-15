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
    const triggers = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'hostel_rooms'
    `;
    console.log("=== TRIGGERS ON HOSTEL_ROOMS ===");
    console.log(triggers);

    // Also let's run a test insert using the exact query format with DEFAULT values to see what happens
    console.log("Attempting test insert with defaults...");
    try {
      const res = await sql`
        INSERT INTO hostel_rooms (id, room_number, building_name, room_type, capacity, occupied_beds, cost, created_at)
        VALUES (DEFAULT, 'TEST-TRIGGER', 'Trigger Building', 'Mixte', 4, 0, 50000, DEFAULT)
        RETURNING *
      `;
      console.log("Test insert succeeded!", res);
      // Clean up
      await sql`DELETE FROM hostel_rooms WHERE room_number = 'TEST-TRIGGER'`;
    } catch (e) {
      console.error("Test insert with defaults failed:", e.message);
      console.error(e);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
