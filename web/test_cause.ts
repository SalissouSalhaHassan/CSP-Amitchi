import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined.");

  console.log("Triggering raw query with postgres...");
  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("SUCCESS. Result:", result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const cause = error instanceof Error && "cause" in error ? error.cause : undefined;
    console.error("RAW ERROR OBJECT:", error);
    console.error("ERROR MESSAGE:", message);
    console.error("ERROR CAUSE:", cause);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
