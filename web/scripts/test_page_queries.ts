import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as authSchema from "../src/infrastructure/database/schema/auth";
import * as studentsSchema from "../src/infrastructure/database/schema/students";
import * as hrSchema from "../src/infrastructure/database/schema/hr";
import * as academicsSchema from "../src/infrastructure/database/schema/academics";
import * as financeSchema from "../src/infrastructure/database/schema/finance";
import * as settingsSchema from "../src/infrastructure/database/schema/settings";
import { eq, and, or, isNull, desc, inArray } from "drizzle-orm";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const client = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });
  const schema = {
    ...authSchema,
    ...studentsSchema,
    ...hrSchema,
    ...academicsSchema,
    ...financeSchema,
    ...settingsSchema,
  };
  const db = drizzle(client, { schema });

  const schoolId = 9;

  console.log("1. Finding activeSessionRow...");
  const activeSessionRow = await db.query.schoolSessions.findFirst({
    where: and(
      or(eq(academicsSchema.schoolSessions.schoolId, schoolId), isNull(academicsSchema.schoolSessions.schoolId)),
      or(eq(academicsSchema.schoolSessions.isActive, true), eq(academicsSchema.schoolSessions.status, "Actif"))
    ),
    orderBy: [desc(academicsSchema.schoolSessions.id)],
  });
  console.log("activeSessionRow:", activeSessionRow);

  console.log("2. Querying studentFees, students, and feePayments separately...");
  const feeRows = await db.select().from(financeSchema.studentFees)
    .where(
      and(
        activeSessionRow?.id ? eq(financeSchema.studentFees.sessionId, activeSessionRow.id) : undefined,
        or(eq(financeSchema.studentFees.schoolId, schoolId), isNull(financeSchema.studentFees.schoolId))
      )
    );
  console.log("feeRows count:", feeRows.length);

  const studentIds = feeRows.map(f => f.studentId).filter(Boolean) as number[];
  const feeIds = feeRows.map(f => f.id);

  const studentRows = studentIds.length > 0
    ? await db.select().from(studentsSchema.students).where(inArray(studentsSchema.students.id, studentIds))
    : [];
  console.log("studentRows count:", studentRows.length);

  const paymentRows = feeIds.length > 0
    ? await db.select().from(financeSchema.feePayments).where(inArray(financeSchema.feePayments.feeId, feeIds))
    : [];
  console.log("paymentRows count:", paymentRows.length);

  const studentMap = new Map(studentRows.map(s => [s.id, s]));
  const paymentsMap = new Map<number, any[]>();
  for (const p of paymentRows) {
    if (!p.feeId) continue;
    if (!paymentsMap.has(p.feeId)) paymentsMap.set(p.feeId, []);
    paymentsMap.get(p.feeId)!.push(p);
  }

  const merged = feeRows.map(f => ({
    ...f,
    student: f.studentId ? studentMap.get(f.studentId) || null : null,
    payments: paymentsMap.get(f.id) || [],
  }));

  console.log("Successfully merged count:", merged.length);
  console.log("Sample merged fee:", merged[0]);

  await client.end();
}

main().catch(console.error);
