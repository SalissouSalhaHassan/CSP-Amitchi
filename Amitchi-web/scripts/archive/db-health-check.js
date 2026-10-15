const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

function readText(file) {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
  } catch {
    return "";
  }
}

function readEnvUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envText = readText(".env.local");
  const line = envText.split(/\r?\n/).find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (!line) return null;

  return line
    .replace(/^\s*DATABASE_URL\s*=\s*/, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function readDiagnosticUrl() {
  return readDiagnosticUrls()[0] || null;
}

function readDiagnosticUrls() {
  const urls = [];

  for (const file of ["test_direct.ts", "scratch.ts", "test_cause.ts", "test_pooler_443.ts"]) {
    const match = readText(file).match(/postgres(?:ql)?:\/\/[^'"`\s]+/);
    if (match) urls.push({ file, url: match[0] });
  }

  return urls;
}

function redactUrl(url, source) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//[user]@${parsed.hostname}:${parsed.port || "(default)"}${parsed.pathname}${source ? ` (${source})` : ""}`;
  } catch {
    return `invalid${source ? ` (${source})` : ""}`;
  }
}

async function tableCount(sql, tableName) {
  try {
    const rows = await sql.unsafe(`select count(*)::int as count from "${tableName}"`);
    return rows[0].count;
  } catch (error) {
    return `ERR:${error.message.split("\n")[0]}`;
  }
}

async function check(url, source) {
  const sql = postgres(url, {
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    max: 1,
    connect_timeout: 12,
    prepare: false,
  });

  try {
    const started = Date.now();
    const basic = await sql.unsafe("select current_database() as db, current_user as usr, now() as now");
    const tables = await sql.unsafe(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);
    const columns = await sql.unsafe(`
      select table_name, column_name, is_nullable, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('users', 'roles', 'schools')
      order by table_name, ordinal_position
    `);

    const counts = {};
    for (const tableName of ["users", "roles", "schools", "students", "school_sessions", "employees", "fee_payments"]) {
      counts[tableName] = await tableCount(sql, tableName);
    }

    console.log(JSON.stringify({
      ok: true,
      source,
      target: redactUrl(url, source),
      ms: Date.now() - started,
      basic: basic[0],
      tableCount: tables.length,
      firstTables: tables.slice(0, 100).map((table) => table.table_name),
      counts,
      columns,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      source,
      target: redactUrl(url, source),
      message: error.message,
      code: error.code,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

async function main() {
  const mode = process.argv[2] || "local";
  const diagnostic = readDiagnosticUrl();
  const localUrl = readEnvUrl();

  if (mode === "remote") {
    if (!diagnostic) throw new Error("No diagnostic Supabase URL found.");
    await check(diagnostic.url, diagnostic.file);
    return;
  }

  if (mode === "remote-all") {
    const diagnostics = readDiagnosticUrls();
    if (diagnostics.length === 0) throw new Error("No diagnostic Supabase URLs found.");

    for (const entry of diagnostics) {
      await check(entry.url, entry.file);
    }
    return;
  }

  if (!localUrl) throw new Error("DATABASE_URL not found in .env.local.");
  await check(localUrl, ".env.local");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
});
