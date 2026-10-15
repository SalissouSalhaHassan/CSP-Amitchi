import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Set DATABASE_URL before importing the database module dynamically
if (process.env.REMOTE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.REMOTE_DATABASE_URL;
} else {
  process.env.DATABASE_URL = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
}

async function main() {
  try {
    // Dynamically import database module to avoid ES module import hoisting
    const { db } = await import("./src/infrastructure/database");
    const { eq, and, inArray } = await import("drizzle-orm");
    const { users } = await import("./src/infrastructure/database/schema/auth");
    const { schoolClasses } = await import("./src/infrastructure/database/schema/academics");
    const { students } = await import("./src/infrastructure/database/schema/students");
    const { getTeacherEmployee, getTeacherClassIds, getUserRoleType } = await import("./src/domains/auth/services/rbac");

    const userId = 42; // macoll@gmail.com
    const className = "L1 Arabic";

    console.log("🔌 Connecting to Supabase database...");
    console.log("Fetching user...");
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: {
          with: {
            permissions: true
          }
        },
        school: true
      }
    });

    if (!user) {
      console.error("User not found!");
      process.exit(1);
    }

    console.log("User:", user);
    console.log("Role Type:", await getUserRoleType(user));

    const schoolId = user.schoolId || 9;
    const roleType = await getUserRoleType(user);

    let whereClause = and(
      eq(students.classe, className),
      eq(students.schoolId, schoolId)
    ) as any;

    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      console.log("Resolved Employee:", emp);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        console.log("Teacher Class IDs:", classIds);
        if (classIds.length > 0) {
          const classesList = await db.select({ className: schoolClasses.className })
            .from(schoolClasses)
            .where(and(inArray(schoolClasses.id, classIds), eq(schoolClasses.className, className)));
          console.log("Classes matched:", classesList);
          if (classesList.length === 0) {
            console.log("Access denied: class not taught by teacher!");
            process.exit(0);
          }
        } else {
          console.log("No classes taught by teacher!");
          process.exit(0);
        }
      } else {
        console.log("No employee resolved!");
        process.exit(0);
      }
    }

    console.log("Executing students query with where clause:", whereClause);
    const data = await db.query.students.findMany({
      where: whereClause,
      orderBy: [students.nomEtudiant]
    });
    console.log("Fetched Students count:", data.length);
    console.log("First 3 Students:", data.slice(0, 3));

    process.exit(0);
  } catch (err: any) {
    console.error("Error executing check:", err);
    process.exit(1);
  }
}

main();
