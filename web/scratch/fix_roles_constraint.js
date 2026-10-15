const postgres = require('postgres');

const DB_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function fixRolesConstraint() {
  const sql = postgres(DB_URL, { ssl: 'require' });
  try {
    console.log('1. Checking duplicate role_name...');
    const dups = await sql`
      SELECT role_name, COUNT(*) 
      FROM public.roles 
      GROUP BY role_name 
      HAVING COUNT(*) > 1;
    `;
    console.log('Duplicates:', dups);

    console.log('2. Creating UNIQUE constraint on roles(role_name)...');
    await sql`
      ALTER TABLE public.roles 
      ADD CONSTRAINT roles_role_name_unique UNIQUE (role_name);
    `;
    console.log('✅ Added UNIQUE constraint roles_role_name_unique');

    console.log('3. Testing the exact previously failing INSERT query...');
    const res = await sql`
      INSERT INTO "roles" ("role_name")
      VALUES ('Directeur')
      ON CONFLICT ("role_name") DO UPDATE SET "role_name" = EXCLUDED."role_name"
      RETURNING "id", "role_name" AS "roleName";
    `;
    console.log('✅ Query succeeded:', res);

    const testNew = await sql`
      INSERT INTO "roles" ("role_name")
      VALUES ('Directeur Adjoint')
      ON CONFLICT ("role_name") DO UPDATE SET "role_name" = EXCLUDED."role_name"
      RETURNING "id", "role_name" AS "roleName";
    `;
    console.log('✅ New role insert succeeded:', testNew);

    // Clean up test role if desired or keep it
    await sql`DELETE FROM public.roles WHERE role_name = 'Directeur Adjoint'`;

  } catch (err) {
    console.error('Error applying fix:', err);
  } finally {
    await sql.end();
  }
}

fixRolesConstraint();
