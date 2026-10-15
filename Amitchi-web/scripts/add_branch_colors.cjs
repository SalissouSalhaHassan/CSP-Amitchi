const postgres = require("postgres");

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
const localUrl = "postgres://postgres:postgres@localhost:5432/edut";

async function migrate(url, name) {
  console.log(`Connecting to ${name}...`);
  try {
    const sql = postgres(url, { prepare: false, ssl: { rejectUnauthorized: false }, connect_timeout: 10 });
    
    console.log(`Adding primary_color and secondary_color to school_branches on ${name}...`);
    await sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "primary_color" varchar(30);`;
    await sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "secondary_color" varchar(30);`;
    
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'school_branches' AND column_name IN ('primary_color', 'secondary_color');
    `;
    console.log(`Success on ${name}! Found columns:`, cols);
    const testQuery = await sql`
      select "id", "school_id", "branch_name", "year_established", "registration_no", "branch_alias", "inst_type", "inst_category", "email", "alt_email", "contact_no", "office_no", "timezone", "address", "adm_prefix", "adm_padding", "smtp_url", "smtp_port", "smtp_email", "smtp_password", "logo_path", "working_days", "ministry", "region", "dren", "department", "dden", "inspection", "commune", "school_code", "vu_clauses", "primary_color", "secondary_color", "created_at" 
      from "school_branches" "schoolBranches" 
      where "schoolBranches"."inst_type" ilike 'Collège%' 
      limit 1;
    `;
    console.log(`Query verification on ${name} SUCCEEDED! Rows:`, testQuery.length);

    await sql.end();
  } catch (err) {
    console.error(`Error on ${name}:`, err.message);
  }
}

async function main() {
  await migrate(remoteUrl, "Remote Supabase DB");
}

main();
