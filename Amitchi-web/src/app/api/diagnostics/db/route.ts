import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/database";
import { getCurrentUser } from "@/domains/auth/services/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLES_TO_COUNT = [
  "users",
  "roles",
  "schools",
  "students",
  "school_sessions",
  "employees",
  "fee_payments",
] as const;

function normalizeDatabaseUrl(value: string | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  const assignment = trimmed.match(/^[A-Z0-9_]+\s*=\s*(.+)$/i);
  const url = (assignment ? assignment[1] : trimmed).trim().replace(/^['"]|['"]$/g, "");

  return url || undefined;
}

function redactDatabaseTarget(value: string | undefined) {
  const normalized = normalizeDatabaseUrl(value);
  if (!normalized) return "DATABASE_URL is missing";

  try {
    const parsed = new URL(normalized);
    return `${parsed.protocol}//[user]@${parsed.hostname}:${parsed.port || "(default)"}${parsed.pathname}`;
  } catch {
    return "DATABASE_URL is invalid";
  }
}

function getErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      cause: typeof error.cause === "object" && error.cause && "message" in error.cause
        ? String((error.cause as { message?: unknown }).message)
        : undefined,
    };
  }

  return { message: String(error) };
}

function rowsFromResult(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  }

  return [];
}

async function getTableCount(tableName: string) {
  try {
    const result = await db.execute(sql.raw(`select count(*)::int as count from "${tableName}"`));
    const row = rowsFromResult(result)[0];
    return typeof row?.count === "number" ? row.count : Number(row?.count || 0);
  } catch (error: unknown) {
    return { error: getErrorPayload(error).message };
  }
}

export async function GET() {
  const environment = {
    nodeEnv: process.env.NODE_ENV,
    databaseTarget: redactDatabaseTarget(process.env.DATABASE_URL),
    hasDatabaseUrl: Boolean(normalizeDatabaseUrl(process.env.DATABASE_URL)),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  const currentUser = await getCurrentUser();
  const isSuperAdmin = currentUser?.superAdmin === true || currentUser?.superAdmin === 1;

  if (!currentUser) {
    return NextResponse.json({
      ok: false,
      authenticated: false,
      environment,
      error: "No authenticated Supabase user was found for this request.",
    }, { status: 401 });
  }

  if (!isSuperAdmin) {
    return NextResponse.json({
      ok: false,
      authenticated: true,
      user: {
        id: currentUser.id,
        utilisateur: currentUser.utilisateur,
        admin: currentUser.admin,
        superAdmin: currentUser.superAdmin,
        schoolId: currentUser.schoolId,
      },
      environment,
      error: "Only Super Admin can read database diagnostics.",
    }, { status: 403 });
  }

  try {
    const [connectionInfo, tableRows, columnRows] = await Promise.all([
      db.execute(sql`
        select current_database() as database, current_user as user, now() as checked_at
      `),
      db.execute(sql`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
        order by table_name
      `),
      db.execute(sql`
        select table_name, column_name, is_nullable, data_type
        from information_schema.columns
        where table_schema = 'public'
          and table_name in ('users', 'roles', 'schools')
        order by table_name, ordinal_position
      `),
    ]);

    const counts = Object.fromEntries(
      await Promise.all(TABLES_TO_COUNT.map(async (tableName) => [tableName, await getTableCount(tableName)]))
    );

    const connectionRow = rowsFromResult(connectionInfo)[0];
    const tables = rowsFromResult(tableRows);
    const columns = rowsFromResult(columnRows);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: currentUser.id,
        utilisateur: currentUser.utilisateur,
        admin: currentUser.admin,
        superAdmin: currentUser.superAdmin,
        schoolId: currentUser.schoolId,
      },
      environment,
      connection: connectionRow,
      tableCount: tables.length,
      tables: tables.map((row) => row.table_name),
      counts,
      columns,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      authenticated: true,
      environment,
      error: getErrorPayload(error),
    }, { status: 500 });
  }
}
