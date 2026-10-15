import postgres from "postgres";

async function main() {
  const url = "postgres://postgres:postgres@localhost:5432/edut";
  console.log("Connecting to local database...");
  const sql = postgres(url);
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("Local connection SUCCESS. Result:", result);
  } catch (e: any) {
    console.error("Local connection FAILED:", e.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
