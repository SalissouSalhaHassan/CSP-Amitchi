const postgres = require('postgres');
const url = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });

async function testQuery() {
  try {
    const res = await sql`
      select "id", "name", "slug", "custom_domain", "logo_path", "plan", "status", "subscription_expiry", "license_key", "billing_cycle", "auto_renew", "max_students", "max_storage_mb", "current_storage_mb", "max_monthly_sync_ops", "created_at" 
      from "schools" 
      where "slug" = 'amichi' 
      limit 1;
    `;
    console.log('QUERY SUCCESSFUL! Result:', res);
  } catch (err) {
    console.error('QUERY FAILED:', err);
  } finally {
    process.exit(0);
  }
}

testQuery();
