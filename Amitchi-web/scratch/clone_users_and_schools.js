const postgres = require('postgres');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

function sanitize(val, fallback = null) {
  return val === undefined ? fallback : val;
}

async function cloneUsersAndSchools() {
  console.log('🔄 Starting clone of Schools, Roles, Role Permissions, Employees, and Users...');
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  const newSql = postgres(NEW_URL, { ssl: 'require' });

  try {
    // 1. Clone Schools
    console.log('1️⃣ Syncing schools...');
    const oldSchools = await oldSql`SELECT * FROM public.schools`;
    for (const s of oldSchools) {
      await newSql`
        INSERT INTO public.schools (
          id, name, slug, logo_path, plan, status, 
          max_students, max_storage_mb, current_storage_mb, max_monthly_sync_ops,
          created_at
        ) VALUES (
          ${s.id}, ${s.name}, ${s.slug}, 
          ${sanitize(s.logo_url || s.logo_path)}, 
          ${sanitize(s.subscription_plan || s.plan, 'free')}, 
          ${s.status || 'active'}, 
          ${sanitize(s.max_students, 500)}, 
          ${sanitize(s.max_storage_mb, 100)}, 
          ${sanitize(s.current_storage_mb, 0)}, 
          ${sanitize(s.max_monthly_sync_ops, 5000)},
          ${s.created_at || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          status = EXCLUDED.status;
      `;
    }
    console.log(`✅ Synced ${oldSchools.length} schools.`);

    // 2. Clone Roles
    console.log('2️⃣ Syncing roles...');
    const oldRoles = await oldSql`SELECT * FROM public.roles`;
    for (const r of oldRoles) {
      await newSql`
        INSERT INTO public.roles (
          id, role_name, description, school_id
        ) VALUES (
          ${r.id}, ${r.role_name}, ${sanitize(r.description)}, ${sanitize(r.school_id)}
        )
        ON CONFLICT (id) DO UPDATE SET
          role_name = EXCLUDED.role_name,
          description = EXCLUDED.description,
          school_id = EXCLUDED.school_id;
      `;
    }
    console.log(`✅ Synced ${oldRoles.length} roles.`);

    // 3. Clone Role Permissions
    console.log('3️⃣ Syncing role permissions...');
    const oldPermissions = await oldSql`SELECT * FROM public.role_permissions`;
    for (const p of oldPermissions) {
      await newSql`
        INSERT INTO public.role_permissions (
          id, role_id, module_name, can_view, can_edit, can_delete, school_id
        ) VALUES (
          ${p.id}, ${p.role_id}, ${p.module_name}, ${p.can_view ?? false}, 
          ${p.can_edit ?? false}, ${p.can_delete ?? false}, ${sanitize(p.school_id)}
        )
        ON CONFLICT (id) DO UPDATE SET
          can_view = EXCLUDED.can_view,
          can_edit = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          school_id = EXCLUDED.school_id;
      `;
    }
    console.log(`✅ Synced ${oldPermissions.length} role permissions.`);

    // 4. Clone Employees
    console.log('4️⃣ Syncing employees...');
    try {
      const oldEmployees = await oldSql`SELECT * FROM public.employees`;
      for (const emp of oldEmployees) {
        await newSql`
          INSERT INTO public.employees (
            id, school_id, nom, prenom, role_id, email, telephone, 
            statut, created_at, updated_at
          ) VALUES (
            ${emp.id}, ${emp.school_id}, ${emp.nom}, ${sanitize(emp.prenom)}, ${sanitize(emp.role_id)}, 
            ${sanitize(emp.email)}, ${sanitize(emp.telephone)}, ${emp.statut || 'Actif'}, 
            ${emp.created_at || new Date()}, ${emp.updated_at || new Date()}
          )
          ON CONFLICT (id) DO UPDATE SET
            nom = EXCLUDED.nom,
            prenom = EXCLUDED.prenom,
            email = EXCLUDED.email,
            telephone = EXCLUDED.telephone,
            statut = EXCLUDED.statut;
        `;
      }
      console.log(`✅ Synced ${oldEmployees.length} employees.`);
    } catch (empErr) {
      console.warn('Employees sync notice:', empErr.message);
    }

    // 5. Clone Users (public.users)
    console.log('5️⃣ Syncing public.users...');
    const oldUsers = await oldSql`SELECT * FROM public.users`;
    for (const u of oldUsers) {
      await newSql`
        INSERT INTO public.users (
          id, school_id, utilisateur, mot_de_passe, nom_prenom, role_id,
          employee_id, student_id, admin, super_admin, educational_level,
          supabase_id, created_at
        ) VALUES (
          ${u.id}, ${sanitize(u.school_id)}, ${u.utilisateur}, ${u.mot_de_passe}, ${sanitize(u.nom_prenom)},
          ${sanitize(u.role_id)}, ${sanitize(u.employee_id)}, ${sanitize(u.student_id)}, ${u.admin ?? false},
          ${u.super_admin ?? false}, ${sanitize(u.educational_level)},
          ${sanitize(u.supabase_id)}, ${u.created_at || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          school_id = EXCLUDED.school_id,
          utilisateur = EXCLUDED.utilisateur,
          mot_de_passe = EXCLUDED.mot_de_passe,
          nom_prenom = EXCLUDED.nom_prenom,
          role_id = EXCLUDED.role_id,
          employee_id = EXCLUDED.employee_id,
          student_id = EXCLUDED.student_id,
          admin = EXCLUDED.admin,
          super_admin = EXCLUDED.super_admin,
          educational_level = EXCLUDED.educational_level,
          supabase_id = EXCLUDED.supabase_id;
      `;
    }
    console.log(`✅ Synced ${oldUsers.length} users successfully!`);

    // 6. Update Sequence values
    console.log('6️⃣ Resetting sequences to max IDs...');
    await newSql.unsafe(`SELECT setval('public.schools_id_seq', COALESCE((SELECT MAX(id) FROM public.schools), 1));`).catch(() => {});
    await newSql.unsafe(`SELECT setval('public.roles_id_seq', COALESCE((SELECT MAX(id) FROM public.roles), 1));`).catch(() => {});
    await newSql.unsafe(`SELECT setval('public.users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 1));`).catch(() => {});
    await newSql.unsafe(`SELECT setval('public.role_permissions_id_seq', COALESCE((SELECT MAX(id) FROM public.role_permissions), 1));`).catch(() => {});
    await newSql.unsafe(`SELECT setval('public.employees_id_seq', COALESCE((SELECT MAX(id) FROM public.employees), 1));`).catch(() => {});

    console.log('🎉 All users, schools, roles, and permissions cloned successfully!');
  } catch (err) {
    console.error('❌ Error during clone:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

cloneUsersAndSchools();
