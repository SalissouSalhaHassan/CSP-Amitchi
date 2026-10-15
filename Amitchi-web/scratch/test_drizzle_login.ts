import { db } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { or, eq, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function testDrizzle() {
  const username = "superadmin@gmail.com";
  const password = "salissou1994S";

  console.log("Testing db.query.users.findFirst...");
  try {
    const userWithRel = await db.query.users.findFirst({
      where: or(
        eq(users.utilisateur, username),
        ilike(users.utilisateur, username)
      ),
      with: { role: true, school: true }
    });
    console.log("Result with relations:", userWithRel);
  } catch (e) {
    console.error("Relational query failed:", e.message);
  }

  console.log("Testing db.select().from(users)...");
  try {
    const directUser = await db.select().from(users).where(eq(users.utilisateur, username)).limit(1);
    console.log("Direct select user:", directUser);
    if (directUser[0]) {
      console.log("Password match?", bcrypt.compareSync(password, directUser[0].motDePasse));
    }
  } catch (e) {
    console.error("Direct select failed:", e.message);
  }
}

testDrizzle().then(() => process.exit(0)).catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
