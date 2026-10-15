import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as authSchema from "./schema/auth";
import * as studentsSchema from "./schema/students";
import * as hrSchema from "./schema/hr";
import * as academicsSchema from "./schema/academics";
import * as financeSchema from "./schema/finance";
import * as inventorySchema from "./schema/inventory";
import * as transportSchema from "./schema/transport";
import * as attendanceSchema from "./schema/attendance";
import * as librarySchema from "./schema/library";
import * as homeworkSchema from "./schema/homework";
import * as disciplineSchema from "./schema/discipline";
import * as frontOfficeSchema from "./schema/front_office";
import * as canteenSchema from "./schema/canteen";
import * as messagingSchema from "./schema/messaging";
import * as hostelSchema from "./schema/hostel";
import * as lmsSchema from "./schema/lms";
import * as settingsSchema from "./schema/settings";
import * as auditSchema from "./schema/audit";
import * as pedagogieSchema from "./schema/pedagogie";
import * as healthSchema from "./schema/health";
import * as admissionsSchema from "./schema/admissions";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not defined in environment variables. Using default local connection.");
}

function normalizeDatabaseUrl(value: string | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  const assignment = trimmed.match(/^[A-Z0-9_]+\s*=\s*(.+)$/i);
  const url = (assignment ? assignment[1] : trimmed).trim().replace(/^['"]|['"]$/g, "");

  return url || undefined;
}

const DEFAULT_PROD_DB_URL = "postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres";

const rawConnectionString = 
  normalizeDatabaseUrl(process.env.REMOTE_DATABASE_URL) || 
  normalizeDatabaseUrl(process.env.DATABASE_URL) ||
  DEFAULT_PROD_DB_URL;

const connectionString = rawConnectionString;
const readReplicaUrl = normalizeDatabaseUrl(process.env.READ_REPLICA_URL);

// Log connection target for debugging (masking password)
const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
console.log(`🔌 Initializing primary database client: ${maskedUrl}`);

if (readReplicaUrl) {
  const maskedReadUrl = readReplicaUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Initializing read replica client: ${maskedReadUrl}`);
}

// Detect remote connections (anything other than localhost/127.0.0.1)
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Prevent multiple instances of the database client in development
const globalForDb = global as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  readClient: ReturnType<typeof postgres> | undefined;
};

const commonConfig: postgres.Options<Record<string, never>> = {
  prepare: false,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,             // Sufficient connection pool size for concurrent parallel requests
  idle_timeout: 20,    // Allow connections to stay alive for standard query sequences
  max_lifetime: 60 * 30, // Periodically recycle old connections before pooler terminates them
  connect_timeout: 10, // Generous connect timeout to survive transient network lags
  onnotice: () => {},  
  connection: {
    application_name: "edut-web",
  },
};

// Primary client for Writes
export const client = globalForDb.client ?? postgres(connectionString, commonConfig);

// Read client (defaults to primary if no replica is defined)
export const readClient = globalForDb.readClient ?? (readReplicaUrl ? postgres(readReplicaUrl, commonConfig) : client);

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.readClient = readClient;
}

const schema = { ...authSchema, ...studentsSchema, ...hrSchema, ...academicsSchema, ...financeSchema, ...inventorySchema, ...transportSchema, ...attendanceSchema, ...librarySchema, ...homeworkSchema, ...disciplineSchema, ...frontOfficeSchema, ...canteenSchema, ...messagingSchema, ...hostelSchema, ...lmsSchema, ...settingsSchema, ...auditSchema, ...pedagogieSchema, ...healthSchema, ...admissionsSchema };

// Primary DB instance
export const db = drizzle(client, { schema });

// Read DB instance (for SELECT queries)
export const readDb = drizzle(readClient, { schema });

type WriteTenantTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ReadTenantTransaction = Parameters<Parameters<typeof readDb.transaction>[0]>[0];

/**
 * Executes write/primary queries inside a transaction with tenant RLS context set
 */
export async function withTenant<T>(
  schoolId: number,
  callback: (tx: WriteTenantTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(sql`SELECT set_config('app.current_school_id', ${String(schoolId)}, true)`);
    return await callback(tx);
  });
}

/**
 * Executes read queries inside a transaction with tenant RLS context set on the read replica
 */
export async function withReadTenant<T>(
  schoolId: number,
  callback: (tx: ReadTenantTransaction) => Promise<T>
): Promise<T> {
  return await readDb.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(sql`SELECT set_config('app.current_school_id', ${String(schoolId)}, true)`);
    return await callback(tx);
  });
}
