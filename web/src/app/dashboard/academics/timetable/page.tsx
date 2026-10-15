export const dynamic = "force-dynamic";

import { getClasses, getSessions, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getPedagogicalUnits } from "@/domains/academics/actions/pedagogical-units.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import IntelligentTimetable from "./timetable-intelligent";
import StudentTimetablePortal from "./components/StudentTimetablePortal";

export default async function TimetablePage() {
  const user = await getCurrentUser();
  const roleType = user ? await getUserRoleType(user) : null;
  const isStudent = roleType === "eleve" || Boolean(user?.studentId) || Boolean((user as any)?.student_id);

  if (isStudent) {
    return (
      <div className="w-full min-h-[calc(100vh-65px)] p-4 md:p-6 bg-[#0B0D14] rounded-3xl overflow-hidden">
        <StudentTimetablePortal currentUser={user} />
      </div>
    );
  }

  const classesRes = await getClasses(false);
  const sessionsRes = await getSessions();
  const employeesRes = await getEmployees();
  const subjectsRes = await getSubjects();
  const unitsRes = await getPedagogicalUnits();

  const classes: any[] = ((classesRes as any).data?.data || (classesRes as any).data || []) as any[];
  const sessions: any[] = ((sessionsRes as any).data?.data || (sessionsRes as any).data || []) as any[];
  const employees: any[] = ((employeesRes as any).data?.data || (employeesRes as any).data || []) as any[];
  const subjects: any[] = ((subjectsRes as any).data?.data || (subjectsRes as any).data || []) as any[];
  const units: any[] = (unitsRes as any).data || [];
  
  const currentSession = sessions.find(s => s.isActive) || sessions[0] || { id: 0, sessionName: "N/A" };

  return (
    <div className="w-full min-h-[calc(100vh-65px)] p-1 md:p-2 bg-[#0B0D14] rounded-2xl overflow-hidden">
      <IntelligentTimetable 
        classes={classes}
        teachers={employees}
        subjects={subjects}
        currentSession={currentSession}
        pedagogicalUnits={units}
      />
    </div>
  );
}
