import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./src/infrastructure/database";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "period_id" integer REFERENCES "academic_periods"("id");`);
    console.log("Successfully added period_id column to exams table.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
