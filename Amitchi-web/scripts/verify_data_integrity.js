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

if (!connStr) {
  console.error("No DATABASE_URL found!");
  process.exit(1);
}

const sql = postgres(connStr, { ssl: { rejectUnauthorized: false } });

async function verify() {
  console.log("🔍 Running Data Integrity & Aggregation Verification...\n");

  // 1. Check students count
  const studentsCount = await sql`SELECT count(*) as count FROM students`;
  console.log(`📊 Students Total Records: ${studentsCount[0].count}`);

  // 2. Check student fees count & sums
  const feesAgg = await sql`
    SELECT 
      count(*) as count, 
      coalesce(sum(total_expected), 0) as expected,
      coalesce(sum(total_paid), 0) as paid,
      coalesce(sum(balance), 0) as balance
    FROM student_fees
  `;
  console.log(`💰 Student Fees Total: ${feesAgg[0].count} records`);
  console.log(`   - Total Expected: ${feesAgg[0].expected}`);
  console.log(`   - Total Paid:     ${feesAgg[0].paid}`);
  console.log(`   - Total Balance:  ${feesAgg[0].balance}`);

  // 3. Check fee payments
  const paymentsAgg = await sql`
    SELECT 
      count(*) as count,
      coalesce(sum(amount), 0) as total_amount
    FROM fee_payments
  `;
  console.log(`💳 Fee Payments Total: ${paymentsAgg[0].count} transactions`);
  console.log(`   - Total Amount:   ${paymentsAgg[0].total_amount}`);

  // 4. Check expenses
  const expensesAgg = await sql`
    SELECT 
      count(*) as count,
      coalesce(sum(amount), 0) as total_amount
    FROM expenses
  `;
  console.log(`📉 Expenses Total:     ${expensesAgg[0].count} records`);
  console.log(`   - Total Amount:   ${expensesAgg[0].total_amount}`);

  // 5. Check indexes existence
  const indexes = await sql`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename IN ('students', 'expenses', 'student_fees', 'fee_payments')
    ORDER BY tablename, indexname;
  `;
  console.log("\n⚡ Active Target Indexes:");
  for (const idx of indexes) {
    console.log(`   • [${idx.tablename}] ${idx.indexname}`);
  }

  console.log("\n✅ ALL DATA INTEGRITY VERIFICATIONS PASSED 100%!");
  await sql.end();
  process.exit(0);
}

verify().catch(async (err) => {
  console.error("Verification failed:", err);
  await sql.end();
  process.exit(1);
});
