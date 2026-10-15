import { db } from "@/infrastructure/database";
import { roles, users } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";

async function testWithUser(superAdmin: boolean, schoolId: number) {
  console.log(`Testing with superAdmin=${superAdmin}, schoolId=${schoolId}`);
  try {
    const data = await db.query.roles.findMany({
      with: {
        permissions: true,
        users: {
          where: superAdmin ? undefined : eq(users.schoolId, schoolId),
          columns: { id: true },
        },
      },
    });
    console.log(`Roles count: ${data.length}`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await testWithUser(true, 9);
  await testWithUser(false, 9);
  process.exit(0);
}
run();
