export const dynamic = "force-dynamic";

import { getHRReportCenterData } from "@/domains/hr/actions/teacher-attendance.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { redirect } from "next/navigation";
import ReportsClient from "./reports-client";

export default async function HRReportsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ date?: string; filter?: "day" | "week" | "month" | "year" }>;
}) {
  const searchParams = await searchParamsPromise;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const roleType = await getUserRoleType(currentUser);
  if (roleType === "teacher") {
    redirect("/dashboard?error=unauthorized");
  }

  const date = searchParams.date || new Date().toISOString().split("T")[0];
  const filter = searchParams.filter || "month";

  const data = await getHRReportCenterData(filter, date);
  const teachers = (data as any).data?.teachers || (data as any).teachers || [];
  const stats = (data as any).data?.stats || (data as any).stats || {
    totalTeachers: 0,
    totalScheduled: 0,
    totalAttended: 0,
    totalAbsent: 0,
    overallRate: 100,
  };

  return (
    <ReportsClient
      teachers={teachers}
      globalStats={stats}
      filterType={filter}
      date={date}
    />
  );
}
