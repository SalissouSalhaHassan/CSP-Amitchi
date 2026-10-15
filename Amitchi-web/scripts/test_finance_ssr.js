const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

let connStr = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  let remoteUrl = null;
  let localUrl = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('REMOTE_DATABASE_URL=')) {
      remoteUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('DATABASE_URL=')) {
      localUrl = trimmed.split('=')[1]?.replace(/^['"]|['"]$/g, '');
    }
  }
  connStr = remoteUrl || localUrl || connStr;
}

const { drizzle } = require('drizzle-orm/postgres-js');
const { relations, sql, eq, and, or, isNull, desc } = require('drizzle-orm');

// Schema definitions
const auth = require('../src/infrastructure/database/schema/auth');
const students = require('../src/infrastructure/database/schema/students');
const academics = require('../src/infrastructure/database/schema/academics');
const finance = require('../src/infrastructure/database/schema/finance');
const settings = require('../src/infrastructure/database/schema/settings');

const client = postgres(connStr, { ssl: { rejectUnauthorized: false } });
const db = drizzle(client, {
  schema: {
    ...auth,
    ...students,
    ...academics,
    ...finance,
    ...settings,
  }
});

async function run() {
  console.log("🔍 Simulating exact Finance Page queries on remote DB...");
  const schoolId = 9;

  try {
    console.log("1. Finding Session...");
    const sessionRow = await db.query.schoolSessions.findFirst({
      where: or(eq(academics.schoolSessions.schoolId, schoolId), isNull(academics.schoolSessions.schoolId)),
      orderBy: [
        sql`CASE WHEN ${academics.schoolSessions.isActive} = TRUE THEN 0 WHEN LOWER(TRIM(${academics.schoolSessions.status})) = 'actif' THEN 1 ELSE 2 END`,
        desc(academics.schoolSessions.id),
      ],
    });
    console.log("✅ Session:", sessionRow?.id, sessionRow?.sessionName);

    console.log("2. Querying Student Fees with Relations...");
    const feeRows = await db.query.studentFees.findMany({
      where: and(
        sessionRow?.id ? eq(finance.studentFees.sessionId, sessionRow.id) : undefined,
        or(eq(finance.studentFees.schoolId, schoolId), isNull(finance.studentFees.schoolId))
      ),
      with: {
        student: {
          columns: {
            id: true,
            nomEtudiant: true,
            numAdmission: true,
            classe: true,
            educationalLevel: true,
            photoPath: true,
            sexe: true,
            statut: true,
          }
        },
        payments: {
          columns: {
            id: true,
            feeId: true,
            amount: true,
            reduction: true,
            paymentMode: true,
            reference: true,
            datePaid: true,
            recordedBy: true,
            monthConcerned: true,
          },
          orderBy: [desc(finance.feePayments.datePaid)]
        }
      },
      orderBy: [desc(finance.studentFees.id)]
    });
    console.log("✅ Fee Rows:", feeRows.length);

    console.log("3. Payment Aggregation Query...");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const paymentSumsRes = await db
      .select({
        totalAmount: sql`COALESCE(SUM(${finance.feePayments.amount}), 0)`,
        todayAmount: sql`COALESCE(SUM(CASE WHEN ${finance.feePayments.datePaid} >= ${todayStart} THEN ${finance.feePayments.amount} ELSE 0 END), 0)`,
        weekAmount: sql`COALESCE(SUM(CASE WHEN ${finance.feePayments.datePaid} >= ${weekStart} THEN ${finance.feePayments.amount} ELSE 0 END), 0)`,
        monthAmount: sql`COALESCE(SUM(CASE WHEN ${finance.feePayments.datePaid} >= ${monthStart} THEN ${finance.feePayments.amount} ELSE 0 END), 0)`,
        yearAmount: sql`COALESCE(SUM(CASE WHEN ${finance.feePayments.datePaid} >= ${yearStart} THEN ${finance.feePayments.amount} ELSE 0 END), 0)`,
        totalCount: sql`COUNT(*)`,
      })
      .from(finance.feePayments)
      .where(or(eq(finance.feePayments.schoolId, schoolId), isNull(finance.feePayments.schoolId)));
    console.log("✅ Payment Sums:", paymentSumsRes);

    console.log("4. School Classes Query...");
    const classRows = await db
      .select()
      .from(academics.schoolClasses)
      .where(or(eq(academics.schoolClasses.schoolId, schoolId), isNull(academics.schoolClasses.schoolId)));
    console.log("✅ Classes:", classRows.length);

    console.log("🎉 SUCCESS: All database queries are 100% working!");
  } catch (err) {
    console.error("❌ ERROR FOUND:", err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
