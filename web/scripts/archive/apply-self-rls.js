const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");

const sql = postgres(connectionString, {
  prepare: false,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const sqlPath = path.join(__dirname, 'setup-self-rls.sql');
    const queries = fs.readFileSync(sqlPath, 'utf8');

    console.log("Applying self-RLS policies to database...");
    await sql.unsafe(queries);
    console.log("✅ RLS policies applied successfully!");
  } catch (err) {
    console.error("❌ Failed to apply policies:", err);
  } finally {
    await sql.end();
  }
}

main();
