import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { db } = await import("./src/infrastructure/database");
  const { sql } = await import("drizzle-orm");
  
  try {
    console.log("Attempting to alter school_branches.logo_path to TEXT...");
    // We run this as a raw SQL execute
    await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "logo_path" TYPE TEXT;`);
    console.log("Successfully altered logo_path column.");
    
    // Also double check if id column is serial and everything is fine
    const res = await db.execute(sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'school_branches' AND column_name = 'logo_path';
    `);
    console.log("New Column Info:", res);
    
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failed:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
    process.exit(1);
  }
}

main();
