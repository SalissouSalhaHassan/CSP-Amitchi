import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined.");

  console.log("Connecting to pooler on port 443...");
  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("Port 443 connection SUCCESS. Result:", result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Port 443 connection FAILED:", message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
