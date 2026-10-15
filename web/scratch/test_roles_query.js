const postgres = require('postgres');
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const sql = postgres(NEW_URL, { ssl: 'require' });

async function test() {
  const rawRoles = await sql.unsafe(`
    SELECT 
      r.id, 
      r.role_name AS "roleName", 
      r.description,
      COALESCE(
        json_agg(
          json_build_object(
            'id', rp.id,
            'moduleName', rp.module_name,
            'canView', rp.can_view,
            'canEdit', rp.can_edit,
            'canDelete', rp.can_delete,
            'fieldPermissions', rp.field_permissions
          )
        ) FILTER (WHERE rp.id IS NOT NULL), 
        '[]'
      ) AS permissions,
      COALESCE(
        json_agg(
          json_build_object('id', u.id)
        ) FILTER (WHERE u.id IS NOT NULL), 
        '[]'
      ) AS users
    FROM "roles" r
    LEFT JOIN "role_permissions" rp ON rp.role_id = r.id
    LEFT JOIN "users" u ON u.role_id = r.id
    GROUP BY r.id, r.role_name, r.description
    ORDER BY r.id ASC
  `);
  console.log('Query returned count:', rawRoles.length);
  console.log('First 2 roles:', JSON.stringify(rawRoles.slice(0, 2), null, 2));
  await sql.end();
}
test().catch(console.error);
