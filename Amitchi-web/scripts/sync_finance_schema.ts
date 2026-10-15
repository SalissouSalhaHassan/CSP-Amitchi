import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== CHECK TABLES AND MISSING COLUMNS ===");

  await sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "receipt_token" varchar(100)`;
  await sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "reduction" double precision DEFAULT 0`;
  await sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "recorded_by" varchar(100)`;
  await sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "school_id" integer`;

  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "total_reduction" double precision DEFAULT 0`;
  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "total_expected" double precision DEFAULT 0`;
  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "total_paid" double precision DEFAULT 0`;
  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "balance" double precision DEFAULT 0`;
  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "session_id" integer`;
  await sql`ALTER TABLE "student_fees" ADD COLUMN IF NOT EXISTS "school_id" integer`;

  console.log("All finance columns synchronized!");

  await sql.end();
}

main().catch(console.error);
