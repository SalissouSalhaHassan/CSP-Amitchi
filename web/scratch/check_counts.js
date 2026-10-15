const postgres = require('postgres');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';

async function checkRows() {
  const oldSql = postgres(OLD_URL, { ssl: 'require' });
  const tables = await oldSql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' and table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  console.log(`Checking rows for ${tables.length} tables...`);
  const results = [];
  for (const t of tables) {
    try {
      const countRes = await oldSql.unsafe(`SELECT count(*)::int as count FROM "${t.table_name}"`);
      const cnt = countRes[0]?.count || 0;
      if (cnt > 0) {
        results.push({ table: t.table_name, count: cnt });
      }
    } catch (e) {
      // ignore
    }
  }

  results.sort((a, b) => b.count - a.count);
  console.log(`Found ${results.length} tables with data:`);
  results.forEach(r => console.log(`  ${r.table}: ${r.count} rows`));
  await oldSql.end();
  process.exit(0);
}

checkRows();
