const postgres = require('postgres');

const DB_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function checkRolesTable() {
  const sql = postgres(DB_URL, { ssl: 'require' });
  try {
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'roles';
    `;
    console.log('Roles constraints:', constraints);

    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'roles';
    `;
    console.log('Roles indexes:', indexes);

    // Try executing the exact failed query
    try {
      const res = await sql`
        INSERT INTO "roles" ("role_name")
        VALUES ('Directeur')
        ON CONFLICT ("role_name") DO UPDATE SET "role_name" = EXCLUDED."role_name"
        RETURNING "id", "role_name" AS "roleName";
      `;
      console.log('Exact query result:', res);
    } catch (qErr) {
      console.error('Exact query failed with error:', qErr);
    }
  } finally {
    await sql.end();
  }
}

checkRolesTable();
