export const dynamic = "force-dynamic";

import { db } from "@/infrastructure/database";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { eq, or, isNull } from "drizzle-orm";
import { CopilotClient } from "./CopilotClient";

export default async function CopilotPage() {
  const schoolId = await getActiveSchoolId();

  let classes: any[] = [];
  let subjects: any[] = [];

  if (schoolId) {
    classes = await db.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
      columns: { id: true, className: true },
    });

    subjects = await db.query.schoolSubjects.findMany({
      where: or(eq(schoolSubjects.schoolId, schoolId), isNull(schoolSubjects.schoolId)),
      columns: { id: true, subjectName: true },
    });
  }

  return (
    <CopilotClient
      classes={classes}
      subjects={subjects}
    />
  );
}
