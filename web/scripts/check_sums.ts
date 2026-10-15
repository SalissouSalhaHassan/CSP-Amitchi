import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  const sumBySession = await sql`
    SELECT session_id, count(*), sum(total_expected) as sum_expected, sum(total_paid) as sum_paid, sum(balance) as sum_balance 
    FROM student_fees 
    WHERE school_id = 9 
    GROUP BY session_id
  `;
  console.log("Sums by session_id:", sumBySession);

  const payments = await sql`SELECT * FROM fee_payments WHERE school_id = 9`;
  console.log("Payments:", payments);

  const schoolsRow = await sql`SELECT * FROM schools WHERE id = 9`;
  console.log("School 9:", schoolsRow);

  await sql.end();
}

main().catch(console.error);
