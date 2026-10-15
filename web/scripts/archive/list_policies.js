const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");

const sql = postgres(connectionString, {
  prepare: false,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const policies = await sql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies;
    `;
    console.log("=== POLICIES IN DATABASE ===");
    console.table(policies);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
