import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== ADDING NEW COLUMNS TO school_classes TABLE ===");
    
    await sql`
      ALTER TABLE public.school_classes 
      ADD COLUMN IF NOT EXISTS room_name varchar(100),
      ADD COLUMN IF NOT EXISTS scolarite_mensuelle double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS droits_inscription double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS coges_carte_id double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS transport_internat double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ancien_solde double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS statut_initial varchar(100)
    `;
    console.log("✅ New columns added successfully to school_classes!");

  } catch (err: any) {
    console.error("Error modifying table:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
