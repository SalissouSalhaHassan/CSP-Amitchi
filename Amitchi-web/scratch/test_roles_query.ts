import { db } from "@/infrastructure/database";
import { roles } from "@/infrastructure/database/schema/auth";
import { ilike } from "drizzle-orm";

async function testQuery() {
  try {
    const existing = await db.query.roles.findFirst({
      where: ilike(roles.roleName, "Directeur"),
    });
    console.log("Found:", existing);
  } catch (e) {
    console.error("Query error:", e);
  }
  process.exit(0);
}

testQuery();
