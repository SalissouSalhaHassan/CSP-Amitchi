const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const localConnectionString = process.env.DATABASE_URL;
const remoteConnectionString = process.env.REMOTE_DATABASE_URL;

const connectionStrings = [];
if (localConnectionString) connectionStrings.push({ name: "Local Database", url: localConnectionString });
if (remoteConnectionString) connectionStrings.push({ name: "Remote Supabase Database", url: remoteConnectionString });

if (connectionStrings.length === 0) {
  console.error("❌ No database connection strings found. Please check your .env.local file.");
  process.exit(1);
}

async function runMigrationFor(dbInfo) {
  console.log(`\n🚀 Running migration for: ${dbInfo.name}...`);
  const isLocal = dbInfo.url.includes("localhost") || dbInfo.url.includes("127.0.0.1");
  const sql = postgres(dbInfo.url, {
    prepare: false,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "educational_level" varchar(50) DEFAULT 'Tous'`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lieu_naissance" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "code_grade" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "categorie" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "classe" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "echelon" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "fonction" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "date_nomination" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lieu_affectation" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "commune" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "region" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "date_affectation" varchar(50)`;
    console.log(`✅ Columns checked/added successfully for ${dbInfo.name}.`);
  } catch (error) {
    console.error(`❌ Migration failed for ${dbInfo.name}:`, error.message);
  } finally {
    await sql.end();
  }
}

async function run() {
  for (const dbInfo of connectionStrings) {
    await runMigrationFor(dbInfo);
  }
  process.exit(0);
}

run();
