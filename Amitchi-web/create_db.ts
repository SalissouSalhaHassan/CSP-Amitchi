import postgres from "postgres";

async function main() {
  const url = "postgres://postgres:postgres@localhost:5432/postgres";
  console.log("Connecting to local postgres database...");
  const sql = postgres(url);
  
  try {
    // Check if edut exists
    const databases = await sql`SELECT datname FROM pg_database WHERE datname = 'edut'`;
    if (databases.length === 0) {
      console.log("Creating database 'edut'...");
      // In postgres.js, utility commands like CREATE DATABASE cannot be executed as prepared parameters,
      // so we use sql.file or run it raw. Since there are no parameters, we can write it directly:
      await sql.unsafe("CREATE DATABASE edut");
      console.log("Database 'edut' created successfully!");
    } else {
      console.log("Database 'edut' already exists.");
    }
  } catch (e: any) {
    console.error("Failed to create database:", e.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
