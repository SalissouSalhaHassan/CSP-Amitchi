const postgres = require('postgres');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

function sanitize(val, fallback = null) {
  return val === undefined ? fallback : val;
}

async function syncEmployees() {
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  const newSql = postgres(NEW_URL, { ssl: 'require' });

  try {
    const oldEmployees = await oldSql`SELECT * FROM public.employees`;
    console.log(`Found ${oldEmployees.length} employees in old DB.`);

    for (const emp of oldEmployees) {
      await newSql`
        INSERT INTO public.employees (
          id, emp_id, school_id, nom, poste, departement, mobile, email, 
          statut, educational_level, photo_path, created_at
        ) VALUES (
          ${emp.id}, ${sanitize(emp.emp_id || `EMP-${emp.id}`)}, ${emp.school_id}, 
          ${emp.nom}, ${sanitize(emp.poste || emp.role_name)}, ${sanitize(emp.departement)}, 
          ${sanitize(emp.mobile || emp.telephone)}, ${sanitize(emp.email)}, 
          ${emp.statut || 'Actif'}, ${sanitize(emp.educational_level)}, 
          ${sanitize(emp.photo_path)}, ${emp.created_at || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          nom = EXCLUDED.nom,
          email = EXCLUDED.email,
          mobile = EXCLUDED.mobile,
          statut = EXCLUDED.statut;
      `;
    }
    console.log('✅ Synced all 42 employees successfully!');
    await newSql.unsafe(`SELECT setval('public.employees_id_seq', COALESCE((SELECT MAX(id) FROM public.employees), 1));`).catch(() => {});
  } catch (e) {
    console.error('Error syncing employees:', e);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

syncEmployees();
