const postgres = require('postgres');

async function fix() {
  const urlNew = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
  const sql = postgres(urlNew, { ssl: 'require', connect_timeout: 10 });
  try {
    const student = await sql`SELECT id, nom_etudiant, school_id, educational_level, classe FROM students`;
    console.log('Student before:', student);

    const user = await sql`SELECT id, utilisateur, school_id, educational_level FROM users WHERE utilisateur ILIKE '%sani1%'`;
    console.log('User sani1 before:', user);

    const schoolClasses = await sql`SELECT id, class_name, school_id FROM school_classes WHERE school_id = 9`;
    console.log('Classes with school_id 9:', schoolClasses);

    // Let's update student and school_classes to school_id = 12 (AMICHI)
    console.log('Updating student school_id to 12 (AMICHI)...');
    await sql`UPDATE students SET school_id = 12 WHERE school_id = 9`;

    console.log('Updating school_classes school_id to 12 (AMICHI)...');
    await sql`UPDATE school_classes SET school_id = 12 WHERE school_id = 9`;

    const updatedStudent = await sql`SELECT id, nom_etudiant, school_id, educational_level, classe FROM students`;
    console.log('Student after update:', updatedStudent);

    const updatedClasses = await sql`SELECT id, class_name, school_id FROM school_classes WHERE school_id = 12`;
    console.log('Classes with school_id 12:', updatedClasses);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await sql.end();
  }
}

fix();
