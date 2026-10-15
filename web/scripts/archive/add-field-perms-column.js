const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🚀 Adding columns and tables...');
  try {
    // 1. Add field_permissions to role_permissions
    await sql`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS field_permissions text;`;
    console.log('✅ Column field_permissions added successfully!');

    // 2. Add custom_domain to schools
    await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS custom_domain varchar(255) UNIQUE;`;
    console.log('✅ Column custom_domain added successfully!');

    // 3. Create audit_logs table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50),
        record_id VARCHAR(50),
        old_data TEXT,
        new_data TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✅ Table audit_logs created successfully!');

  } catch (err) {
    console.error('❌ Error during migration:', err.message);
  } finally {
    await sql.end();
  }
}

migrate();
