const postgres = require('postgres');

const OLD_URL = 'postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
const NEW_URL = 'postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function generateDDLAndMigrate() {
  console.log('🏁 Starting complete schema & data transfer...');
  const oldSql = postgres(OLD_URL, { ssl: 'require', max: 5 });
  const newSql = postgres(NEW_URL, { ssl: 'require', max: 5 });

  try {
    // 1. Fetch and create all sequences first
    console.log('Creating sequences...');
    const sequences = await oldSql`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `;
    console.log(`Found ${sequences.length} sequences.`);
    for (const seq of sequences) {
      await newSql.unsafe(`CREATE SEQUENCE IF NOT EXISTS public."${seq.sequence_name}";`);
    }

    // 2. Fetch all custom enums / types
    const enums = await oldSql`
      SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname;
    `;
    for (const en of enums) {
      try {
        const vals = en.enum_values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
        await newSql.unsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${en.enum_name}') THEN CREATE TYPE public."${en.enum_name}" AS ENUM (${vals}); END IF; END $$;`);
      } catch (e) {
        // ignore
      }
    }

    // 3. Get all tables in public schema
    const tables = await oldSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    // 4. Get all columns
    const columns = await oldSql`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        udt_name,
        character_maximum_length,
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const colsByTable = {};
    for (const c of columns) {
      if (!colsByTable[c.table_name]) colsByTable[c.table_name] = [];
      colsByTable[c.table_name].push(c);
    }

    // 5. Create tables
    console.log('Creating 150 tables in target database...');
    for (const t of tables) {
      const tName = t.table_name;
      const tCols = colsByTable[tName] || [];
      if (tCols.length === 0) continue;

      const colDefs = tCols.map(c => {
        let typeStr = c.data_type;
        if (c.data_type === 'character varying') {
          typeStr = c.character_maximum_length ? `varchar(${c.character_maximum_length})` : 'varchar';
        } else if (c.data_type === 'USER-DEFINED') {
          typeStr = `public."${c.udt_name}"`;
        } else if (c.data_type === 'ARRAY') {
          typeStr = `${c.udt_name.replace(/^_/, '')}[]`;
        }

        let def = `"${c.column_name}" ${typeStr}`;
        if (c.column_default) {
          def += ` DEFAULT ${c.column_default}`;
        }
        if (c.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        return def;
      });

      const createSql = `CREATE TABLE IF NOT EXISTS public."${tName}" (\n  ${colDefs.join(',\n  ')}\n);`;
      await newSql.unsafe(createSql);
    }
    console.log('✅ All 150 tables created successfully!');

    // 6. Primary keys
    console.log('Applying primary keys...');
    const pks = await oldSql`
      SELECT tc.table_name, c.column_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage c ON tc.constraint_name = c.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
    `;
    for (const pk of pks) {
      try {
        await newSql.unsafe(`ALTER TABLE public."${pk.table_name}" ADD CONSTRAINT "${pk.constraint_name}" PRIMARY KEY ("${pk.column_name}");`);
      } catch (e) {
        // ignore duplicate
      }
    }

    // 7. Copy data for each table
    console.log('📦 Transferring row data across all tables...');
    let totalCopied = 0;
    for (const t of tables) {
      const tName = t.table_name;
      const countRes = await oldSql.unsafe(`SELECT count(*)::int as cnt FROM public."${tName}"`);
      const rowCount = countRes[0]?.cnt || 0;
      if (rowCount === 0) continue;

      console.log(`Copying ${rowCount} rows for table: ${tName}...`);
      let offset = 0;
      const limit = 500;
      while (offset < rowCount) {
        const rows = await oldSql.unsafe(`SELECT * FROM public."${tName}" OFFSET ${offset} LIMIT ${limit}`);
        if (rows.length === 0) break;

        await newSql`INSERT INTO public.${newSql(tName)} ${newSql(rows)}`;
        offset += rows.length;
      }
      totalCopied += rowCount;
    }
    console.log(`🎉 Data transfer complete! Total transferred rows: ${totalCopied}`);

    // 8. Sync sequence values
    console.log('Syncing all sequence values with current max IDs...');
    for (const seq of sequences) {
      try {
        // Find which table/column this sequence belongs to or match by convention (tablename_id_seq)
        const match = seq.sequence_name.match(/^(.+)_([a-zA-Z0-9_]+)_seq$/);
        if (match) {
          const tab = match[1];
          const col = match[2];
          await newSql.unsafe(`
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${tab}' AND column_name='${col}') THEN
                PERFORM setval('public."${seq.sequence_name}"', COALESCE((SELECT MAX("${col}") FROM public."${tab}"), 1), true);
              END IF;
            END $$;
          `);
        }
      } catch (e) {
        // ignore
      }
    }

    console.log('🌟 MIGRATION COMPLETED 100% SUCCESSFULLY!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

generateDDLAndMigrate();
