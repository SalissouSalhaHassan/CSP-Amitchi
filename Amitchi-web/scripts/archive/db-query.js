const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    const result = await sql`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'school_sessions';
    `;
    console.log("Foreign keys referencing school_sessions:");
    console.table(result);
    
    // Also let's try to just run drizzle-kit push programmatically maybe? Or using local drizzle-kit bin.
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
