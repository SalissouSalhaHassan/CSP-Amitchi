const postgres = require('postgres');
const url = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });

async function addMissingColumns() {
  try {
    console.log('Adding missing quota columns to schools table...');
    
    await sql`
      ALTER TABLE public.schools 
      ADD COLUMN IF NOT EXISTS max_students integer DEFAULT 500,
      ADD COLUMN IF NOT EXISTS max_storage_mb integer DEFAULT 100,
      ADD COLUMN IF NOT EXISTS current_storage_mb integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_monthly_sync_ops integer DEFAULT 5000;
    `;

    console.log('Columns added successfully!');

    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schools' 
      ORDER BY ordinal_position;
    `;
    console.log('Updated columns in schools:');
    console.table(cols);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();
