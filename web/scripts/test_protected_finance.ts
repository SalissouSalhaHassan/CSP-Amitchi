import { getStudentFees, getAdvancedFinanceStats, getFinanceStats } from "../src/domains/finance/actions/finance.actions";
import { protectedDbAction } from "../src/lib/protected-action";
import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== Testing direct action calls ===");
  // User 28
  const u = await sql`SELECT * FROM users WHERE id = 28`;
  const user = u[0];
  console.log("User:", user);

  // Let's test protectedDbAction with user 28
  const testRes = await protectedDbAction("Finance", "canView", async (activeUser) => {
    console.log("Inside protectedDbAction, user:", activeUser);
    return { ok: true };
  });
  console.log("protectedDbAction result:", testRes);

  await sql.end();
}

main().catch(console.error);
