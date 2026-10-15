export const dynamic = "force-dynamic";

import { db } from "@/infrastructure/database";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, getCompatibleLevels } from "@/domains/auth/services/rbac";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { eq, and, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import ClassroomQRCodes from "./qrcodes-client";

export default async function ClassroomQRCodesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const roleType = await getUserRoleType(currentUser);
  if (roleType === "teacher") {
    redirect("/dashboard?error=unauthorized");
  }

  const schoolId = await getActiveSchoolId();

  // Load header and branch/school details
  const [branch, headerConfigRes] = await Promise.all([
    db.query.schoolBranches.findFirst({
      where: eq(schoolBranches.schoolId, schoolId),
    }),
    getDocumentHeaderConfig().catch(() => null),
  ]);

  const headerConfig = (headerConfigRes as any)?.data?.data || (headerConfigRes as any)?.data || null;
  const schoolName = headerConfig?.schoolName || branch?.branchName || "Mon École";

  // Build where clause for level directors
  let classWhere = eq(schoolClasses.schoolId, schoolId);
  
  const classes = await db.query.schoolClasses.findMany({
    where: classWhere,
    with: {
      section: true,
    },
    orderBy: (schoolClasses, { asc }) => [asc(schoolClasses.className)],
  });

  // Filter classes by level director's level access if applicable
  const filteredClasses = classes.filter((cls) => {
    if (roleType === "level_director") {
      return checkEducationalLevelAccessLocal(currentUser, cls.section?.educationalLevel);
    }
    return true;
  });

  // Query all timetable entries for these classes with teacher and subject info
  const classIds = filteredClasses.map((c) => c.id);
  
  let allTimetableEntries: any[] = [];
  if (classIds.length > 0) {
    try {
      const rawEntries = await db.execute(sql`
        SELECT 
          te.id,
          te.class_id as "classId",
          te.subject_id as "subjectId",
          te.employee_id as "employeeId",
          te.day_name as "dayName",
          te.start_time as "startTime",
          te.end_time as "endTime",
          te.period_number as "periodNumber",
          sub.subject_name as "subjectName",
          emp.nom as "employeeNom",
          emp.prenom as "employeePrenom"
        FROM timetable_entries te
        LEFT JOIN school_subjects sub ON te.subject_id = sub.id
        LEFT JOIN employees emp ON te.employee_id = emp.id
        WHERE te.class_id IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})
      `).catch(() => []);

      allTimetableEntries = Array.isArray(rawEntries) ? rawEntries : (rawEntries as any)?.rows || [];
    } catch (e) {
      console.error("Timetable entries query info:", e);
    }
  }

  // Attach timetable entries to each class object
  const classesWithSchedule = filteredClasses.map((cls) => {
    const entries = allTimetableEntries.filter((e) => Number(e.classId) === Number(cls.id));
    return {
      ...cls,
      timetableEntries: entries,
    };
  });

  return (
    <ClassroomQRCodes
      classes={classesWithSchedule}
      schoolName={schoolName}
      headerConfig={headerConfig}
    />
  );
}

// Local helper to avoid importing checkEducationalLevelAccess which is cached
function checkEducationalLevelAccessLocal(user: any, resourceLevel: string | null | undefined): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;
  
  const hasRestrictedLevel = user.educationalLevel && user.educationalLevel !== "Tous" && user.educationalLevel !== "All" && user.educationalLevel !== "";
  if (user.admin === true && !hasRestrictedLevel) {
    return true;
  }
  
  if (!resourceLevel) return true;
  
  const normUser = (user.educationalLevel || "").toLowerCase().trim();
  const normResource = resourceLevel.toLowerCase().trim();
  
  if (normUser === normResource) return true;
  if (normResource === "tous" || normResource === "all" || normResource === "") return true;
  
  const primaryTerms = ["primaire", "maternelle", "elementaire"];
  if (primaryTerms.includes(normUser) && primaryTerms.includes(normResource)) return true;

  const middleTerms = ["college", "moyen"];
  if (middleTerms.includes(normUser) && middleTerms.includes(normResource)) return true;

  const secondaryTerms = ["lycee", "secondaire"];
  if (secondaryTerms.includes(normUser) && secondaryTerms.includes(normResource)) return true;

  return false;
}
