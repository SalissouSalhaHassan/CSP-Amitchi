export const dynamic = "force-dynamic";

import { getEmployees, getEmployeeAttendance } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import EmployeeAttendanceClient from "./employee-attendance-client";

export default async function EmployeeAttendancePage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const date = searchParams.date || new Date().toISOString().split("T")[0];

  const [employeesRes, attendanceRes, currentUser] = await Promise.all([
    getEmployees(),
    getEmployeeAttendance(date),
    getCurrentUser(),
  ]);

  const employees = ((employeesRes as any).data?.data || (employeesRes as any).data || []) as any[];
  const attendance = ((attendanceRes as any).data?.data || (attendanceRes as any).data || []) as any[];

  const canEdit = !!(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit)
  );

  return (
    <EmployeeAttendanceClient
      employees={employees}
      initialAttendance={attendance}
      date={date}
      canEdit={canEdit}
    />
  );
}
