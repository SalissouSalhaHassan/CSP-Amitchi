const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const test = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("DATABASE_URL is not set in env");
      process.exit(1);
    }
    const sql = postgres(connectionString);
    
    console.log("Attempting insert...");
    await sql`
      INSERT INTO hostel_rooms (room_number, building_name, room_type, capacity, occupied_beds, cost)
      VALUES ('TEST-101', 'Test Building', 'Mixte', 4, 0, 50000)
    `;
    console.log("Insert succeeded!");
    process.exit(0);
  } catch (err) {
    console.error("Insert failed with error:", err.message);
    console.error(err);
    process.exit(1);
  }
};

test();
