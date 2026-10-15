
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

async function fixSchema() {
  const sql = postgres(connectionString!, { ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("Checking if supabase_id column exists in users table...");
    
    // Check if column exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'supabase_id';
    `;
    
    if (result.length === 0) {
      console.log("Adding supabase_id column to users table...");
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR(255) UNIQUE;`;
      console.log("Column added successfully!");
    } else {
      console.log("Column already exists.");
    }
    
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    await sql.end();
  }
}

fixSchema();
