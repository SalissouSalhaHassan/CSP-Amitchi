import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { db } = await import("./src/infrastructure/database");
  const { sql } = await import("drizzle-orm");
  
  try {
    console.log("Setting statement_timeout to 0 and altering column...");
    await db.execute(sql`SET statement_timeout = 0;`);
    await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "logo_path" TYPE TEXT;`);
    console.log("Successfully altered logo_path column.");
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

main();
