import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    // Dynamic import to prevent import hoisting from executing before dotenv config
    const { db } = await import("./src/infrastructure/database");
    const { sql } = await import("drizzle-orm");

    console.log("Running migration...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY,
        "title" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "type" varchar(50) DEFAULT 'info' NOT NULL,
        "category" varchar(100) DEFAULT 'Général' NOT NULL,
        "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
        "is_read" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Successfully created notifications table in database.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
