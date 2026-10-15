import { db } from "@/infrastructure/database";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType, getCompatibleLevels } from "@/domains/auth/services/rbac";

export async function getAuditLogs() {
  return protectedDbAction("Security", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return [];
    }

    let whereClause = eq(auditLogs.schoolId, schoolId);

    if (roleType === "level_director") {
      // Level directors can only see audit logs of users within their own educational level
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      const subUsers = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.schoolId, schoolId), inArray(users.educationalLevel, compatibleLevels)));
      const userIds = subUsers.map(u => u.id);
      
      if (userIds.length > 0) {
        whereClause = and(whereClause, inArray(auditLogs.userId, userIds)) as any;
      } else {
        whereClause = and(whereClause, eq(auditLogs.userId, user.id)) as any;
      }
    }

    return await db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            utilisateur: true,
            nomPrenom: true,
          }
        }
      },
      orderBy: [desc(auditLogs.timestamp)],
      limit: 100,
    });
  });
}
