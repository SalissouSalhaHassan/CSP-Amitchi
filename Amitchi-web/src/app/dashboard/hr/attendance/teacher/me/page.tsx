export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getTeacherEmployee } from "@/domains/auth/services/rbac";
import { redirect } from "next/navigation";

export default async function TeacherAttendanceMePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const teacher = await getTeacherEmployee(currentUser);
  if (!teacher) {
    redirect("/dashboard?error=teacher_profile_not_found");
  }

  redirect(`/dashboard/hr/attendance/teacher/${teacher.id}`);
}
