import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  const tables = await sql.unsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log("All existing tables in public schema:");
  console.log(tables.map(x => x.table_name));

  // Check what school_id the students and employees belong to!
  console.log("\n📊 Student school_id distribution:");
  const studentSchools = await sql.unsafe(`SELECT school_id, count(*) FROM public.students GROUP BY school_id`);
  console.table(studentSchools);

  console.log("\n📊 Employee school_id distribution:");
  const empSchools = await sql.unsafe(`SELECT school_id, count(*) FROM public.employees GROUP BY school_id`);
  console.table(empSchools);

  console.log("\n📊 Classes school_id distribution:");
  const classSchools = await sql.unsafe(`SELECT school_id, count(*) FROM public.school_classes GROUP BY school_id`);
  console.table(classSchools);

  await sql.end();
  process.exit(0);
}

main();
