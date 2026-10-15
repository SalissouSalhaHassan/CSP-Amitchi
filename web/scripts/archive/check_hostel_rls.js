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
    const rlsStatus = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename IN ('hostel_rooms', 'hostel_allocations')
    `;
    console.log("=== RLS STATUS ===");
    console.log(rlsStatus);

    const policies = await sql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('hostel_rooms', 'hostel_allocations')
    `;
    console.log("=== POLICIES ===");
    console.log(policies);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
