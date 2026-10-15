import { db } from "@/infrastructure/database";
import { roles, users } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";

async function testGetRoles() {
  console.log("Testing db.query.roles.findMany with relations...");
  try {
    const data = await db.query.roles.findMany({
      with: {
        permissions: true,
        users: {
          columns: { id: true },
        },
      },
    });
    console.log("Success with relations! Roles count:", data.length);
  } catch (e) {
    console.error("FAILED with relations:", e.message);
  }

  console.log("\nTesting direct select roles...");
  try {
    const direct = await db.select().from(roles);
    console.log("Direct select count:", direct.length);
    console.log("First 3 roles:", direct.slice(0, 3));
  } catch (e) {
    console.error("Direct select failed:", e.message);
  }
}

testGetRoles().then(() => process.exit(0)).catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
