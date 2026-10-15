const postgres = require("postgres");

const OLD_URL = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function inspect() {
  const oldSql = postgres(OLD_URL, { ssl: "require", connect_timeout: 10 });
  try {
    const buckets = await oldSql`SELECT * FROM storage.buckets`;
    console.log("OLD BUCKETS DETAILS:", JSON.stringify(buckets, null, 2));

    const policies = await oldSql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'storage'
    `;
    console.log("STORAGE POLICIES:", JSON.stringify(policies, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await oldSql.end();
  }
}
inspect();
