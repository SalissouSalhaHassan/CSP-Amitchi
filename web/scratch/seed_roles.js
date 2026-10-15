const postgres = require('postgres');

const DB_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function checkAndAddRoles() {
  const sql = postgres(DB_URL, { ssl: 'require', prepare: false });

  try {
    console.log('1. Checking current roles...');
    const currentRoles = await sql`SELECT id, role_name, description FROM public.roles ORDER BY id ASC`;
    console.log(`Current roles count: ${currentRoles.length}`);
    currentRoles.forEach(r => console.log(`- [${r.id}] ${r.role_name}`));

    console.log('\n2. Upserting Directeur role...');
    const inserted = await sql`
      INSERT INTO public.roles (role_name, description)
      VALUES ('Directeur', 'Directeur / Direction de l établissement')
      ON CONFLICT (role_name) DO UPDATE 
      SET description = EXCLUDED.description
      RETURNING id, role_name, description;
    `;
    console.log('Directeur role in DB:', inserted);

    // Standard platform roles
    const standardRoles = [
      { name: 'Super Admin', desc: 'Super Administrateur de la plateforme' },
      { name: 'Administrateur', desc: 'Accès administrateur au système' },
      { name: 'Directeur', desc: 'Direction de l établissement' },
      { name: 'Censeur', desc: 'Censeur des études' },
      { name: 'Surveillant', desc: 'Surveillant général' },
      { name: 'Secrétaire', desc: 'Secrétaire administratif' },
      { name: 'Comptable', desc: 'Comptable de l établissement' },
      { name: 'Caissier', desc: 'Gestion de la caisse et paiements' },
      { name: 'Finance', desc: 'Responsable financier' },
      { name: 'Enseignant', desc: 'Corps enseignant' },
      { name: 'Élève', desc: 'Compte élève' },
      { name: 'Parent', desc: 'Compte parent d élève' },
      { name: 'Inspection', desc: 'Inspecteur pédagogique' },
      { name: 'Ministère', desc: 'Représentant ministériel' },
      { name: 'DREN', desc: 'Direction Régionale' },
      { name: 'DDEN', desc: 'Direction Départementale' },
      { name: 'Consultation', desc: 'Accès en lecture seule' }
    ];

    for (const r of standardRoles) {
      await sql`
        INSERT INTO public.roles (role_name, description)
        VALUES (${r.name}, ${r.desc})
        ON CONFLICT (role_name) DO NOTHING;
      `;
    }

    console.log('\n3. All roles now in DB:');
    const allRoles = await sql`SELECT id, role_name, description FROM public.roles ORDER BY id ASC`;
    allRoles.forEach(r => console.log(`- [${r.id}] ${r.role_name} (${r.description})`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

checkAndAddRoles();
