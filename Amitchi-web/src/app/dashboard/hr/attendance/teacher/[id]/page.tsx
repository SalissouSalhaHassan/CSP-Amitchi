export const dynamic = "force-dynamic";

import { db } from "@/infrastructure/database";
import { employees } from "@/infrastructure/database/schema/hr";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, getTeacherEmployee, getCompatibleLevels, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";
import { getTeacherScheduleAttendance } from "@/domains/hr/actions/teacher-attendance.actions";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import TeacherAttendanceDetail from "../teacher-attendance-detail-client";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export default async function TeacherAttendanceDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; filter?: "day" | "week" | "month" | "year" }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const roleType = await getUserRoleType(currentUser);
  const schoolId = await getActiveSchoolId();

  let employeeId = parseInt(params.id);
  const isTeacher = roleType === "teacher";

  if (isTeacher) {
    const emp = await getTeacherEmployee(currentUser);
    if (!emp) {
      redirect("/dashboard?error=teacher_profile_not_found");
    }
    // Force teachers to only see their own attendance
    employeeId = emp.id;
  }

  // Fetch the teacher in question
  const teacher = await db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.schoolId, schoolId)),
  });

  if (!teacher) {
    redirect("/dashboard/hr?error=teacher_not_found");
  }

  // Level director access restriction check
  if (roleType === "level_director") {
    if (!checkEducationalLevelAccess(currentUser, teacher.educationalLevel)) {
      redirect("/dashboard/hr?error=unauthorized_level");
    }
  }

  // Resolve search parameters
  const date = searchParams.date || new Date().toISOString().split("T")[0];
  const filter = searchParams.filter || "week";

  // Fetch the timetable slots + status mappings
  const data = await getTeacherScheduleAttendance(employeeId, filter, date);
  const slots = (data as any).data?.slots || (data as any).slots || [];
  const stats = (data as any).data?.stats || (data as any).stats || { total: 0, attended: 0, absent: 0, late: 0, rate: 100 };

  // Fetch all active teachers for the admin switcher dropdown
  let teachersList: any[] = [];
  if (!isTeacher) {
    let empWhere = eq(employees.schoolId, schoolId);
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(currentUser.educationalLevel || "Primaire");
      empWhere = and(
        empWhere,
        or(
          inArray(employees.educationalLevel, compatibleLevels),
          isNull(employees.educationalLevel)
        )
      ) as any;
    }
    teachersList = await db.query.employees.findMany({
      where: empWhere,
      orderBy: (employees, { asc }) => [asc(employees.nom)],
    });
  }

  return (
    <TeacherAttendanceDetail
      teacher={teacher}
      teachersList={teachersList}
      initialSlots={slots}
      initialStats={stats}
      filterType={filter}
      date={date}
      isAdmin={!isTeacher}
    />
  );
}
