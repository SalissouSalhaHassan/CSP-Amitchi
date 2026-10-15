import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { db } = await import("../src/infrastructure/database");
  const { sql } = await import("drizzle-orm");
  
  try {
    console.log("Adding new fee columns to students table...");
    
    // Add columns if they do not exist
    await db.execute(sql`
      ALTER TABLE "students" 
      ADD COLUMN IF NOT EXISTS "frais_coges_card" double precision DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS "frais_transport_internat" double precision DEFAULT 0.0;
    `);
    
    console.log("Successfully added frais_coges_card and frais_transport_internat columns.");
    
    // Double check column existence
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name IN ('frais_coges_card', 'frais_transport_internat');
    `);
    console.log("Column verification:", res);
    
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failed:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
    process.exit(1);
  }
}

main();
