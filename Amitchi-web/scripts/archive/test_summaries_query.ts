import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("1. Querying columns of student_term_summaries table...");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_term_summaries'
    `;
    
    if (columns.length === 0) {
      console.log("❌ Table 'student_term_summaries' does not exist in the database!");
    } else {
      console.log("Found table 'student_term_summaries'. Columns:");
      columns.forEach(col => {
        console.log(` - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log("\n2. Executing a test SELECT on student_term_summaries...");
    const testSelect = await sql`SELECT * FROM student_term_summaries LIMIT 1`;
    console.log("Select success! Row count:", testSelect.length);

  } catch (err: any) {
    console.error("\n❌ Database Query Error:", err.message);
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
