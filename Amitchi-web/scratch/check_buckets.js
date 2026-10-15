const postgres = require("postgres");

const OLD_URL = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
const NEW_URL = "postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres";

async function run() {
  const oldSql = postgres(OLD_URL, { ssl: "require", connect_timeout: 10 });
  const newSql = postgres(NEW_URL, { ssl: "require", connect_timeout: 10 });
  try {
    const oldBuckets = await oldSql`SELECT id, name, public FROM storage.buckets`;
    console.log("OLD BUCKETS:", oldBuckets);
    const newBuckets = await newSql`SELECT id, name, public FROM storage.buckets`;
    console.log("NEW BUCKETS:", newBuckets);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}
run();
