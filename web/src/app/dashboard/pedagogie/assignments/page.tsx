import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getTeacherAssignments } from "@/domains/academics/actions/teacher-assignments.actions";
import { db } from "@/infrastructure/database";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import AssignmentsClient from "./AssignmentsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [
    classesRes,
    subjectsRes,
    employeesRes,
    assignmentsRes,
    sessions
  ] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getTeacherAssignments(),
    db.query.schoolSessions.findMany()
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const assignments = (assignmentsRes as any).data || [];

  const teachers = employees.filter((employee: any) =>
    (employee.nom || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee.poste || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee.fonction || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee.role?.roleName || "").toLowerCase().match(/profess|enseign/)
  );

  return (
    <AssignmentsClient
      classes={classes}
      subjects={subjects}
      teachers={teachers.length > 0 ? teachers : employees}
      sessions={sessions}
      initialAssignments={assignments}
    />
  );
}
