import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { db } = await import("./src/infrastructure/database");
  const { sql } = await import("drizzle-orm");
  
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'school_branches' AND column_name = 'logo_path';
    `);
    console.log("Column Info:", res);
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    process.exit(1);
  }
}

main();
