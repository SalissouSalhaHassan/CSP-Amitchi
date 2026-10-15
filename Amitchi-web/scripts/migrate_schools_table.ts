import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("🛠️ Verifying columns of public.schools table...");

  await sql.unsafe(`
    ALTER TABLE public.schools 
    ADD COLUMN IF NOT EXISTS license_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
  `);

  console.log("✅ Columns added successfully!");

  console.log("\n🧪 Testing update for school 9 (GROUP AIIU-NIGER)...");
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  const res = await sql`
    UPDATE public.schools 
    SET plan = 'enterprise', status = 'active', subscription_expiry = ${expiry}, license_key = 'EDUT-ENT-NBBL-OS1C-2027'
    WHERE id = 9
    RETURNING id, name, slug, plan, status, subscription_expiry, license_key;
  `;

  console.log("🎉 School 9 updated successfully:", res[0]);

  await sql.end();
  process.exit(0);
}

main();
