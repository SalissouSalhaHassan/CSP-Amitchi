import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== COLUMNS IN fee_payments ===");
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'fee_payments'
  `;
  console.log(cols);

  // Add missing columns if any
  await sql`ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "receipt_token" varchar(100)`;
  console.log("Added receipt_token column to fee_payments successfully!");

  await sql.end();
}

main().catch(console.error);
