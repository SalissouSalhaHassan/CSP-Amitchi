export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects, getSessions, getPeriods } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getSeances } from "@/domains/pedagogie/actions/cahier-textes.actions";
import { getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import { getRemediationPlans } from "@/domains/pedagogie/actions/remediation.actions";
import { getInspectionVisits } from "@/domains/pedagogie/actions/inspection.actions";
import { db } from "@/infrastructure/database";
import RapportsClient from "./RapportsClient";
import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";
import { teacherClassSubjects } from "@/infrastructure/database/schema/academics";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Centre de rapports pédagogiques | Pédagogie | Edut",
  description: "Génération et export de rapports détaillés sur les cahiers de textes, les programmes, les devoirs et les inspections",
};

export default async function RapportsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const role = getPedagogieRole(currentUser);
  if (role === "eleve" || role === "parent" || role === "guest" || role === "consultation") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 border border-slate-150 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
            <X size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Accès non autorisé</h2>
          <p className="text-slate-500 text-sm font-medium">
            L’accès au Centre de rapports pédagogiques est réservé aux personnels autorisés.
          </p>
        </div>
      </div>
    );
  }

  const [
    classesRes, subjectsRes, employeesRes, studentsRes,
    seancesRes, plansRes, assignmentsRes, remediationsRes, inspectionsRes,
    sessionsRes, periodsRes
  ] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getSeances(),
    getPlanifications(),
    getAssignments(),
    getRemediationPlans(),
    getInspectionVisits(),
    getSessions(),
    getPeriods(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];

  const seances = (seancesRes as any).data || [];
  const plans = (plansRes as any).data || [];
  const assignments = (assignmentsRes as any).data || [];
  const remediations = (remediationsRes as any).data || [];
  const inspections = (inspectionsRes as any).data || [];
  const sessions = (sessionsRes as any).data || sessionsRes || [];
  const periods = (periodsRes as any).data || periodsRes || [];

  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  // Fetch all submissions for Devoir reporting
  const submissions = await db.query.lmsSubmissions.findMany({
    with: {
      student: true,
      assignment: {
        with: {
          class: true,
          subject: true,
        }
      }
    }
  });

  // Filter data for teacher role
  let filteredClasses = classes;
  let filteredSubjects = subjects;
  let filteredEmployees = employees;
  let filteredStudents = students;
  let filteredSeances = seances;
  let filteredPlans = plans;
  let filteredAssignments = assignments;
  let filteredRemediations = remediations;
  let filteredInspections = inspections;
  let filteredSubmissions = submissions;

  if (role === "enseignant") {
    const emp = employees.find((e: any) => e.email === currentUser.email || e.email === currentUser.utilisateur);
    if (emp) {
      const assignmentsList = await db.query.teacherClassSubjects.findMany({
        where: eq(teacherClassSubjects.employeeId, emp.id)
      });
      
      const teacherClassIds = new Set(assignmentsList.map(a => a.classId).filter(Boolean));
      const teacherSubjectIds = new Set(assignmentsList.map(a => a.subjectId).filter(Boolean));
      
      filteredClasses = classes.filter((c: any) => teacherClassIds.has(c.id));
      filteredSubjects = subjects.filter((s: any) => teacherSubjectIds.has(s.id));
      filteredEmployees = employees.filter((e: any) => e.id === emp.id);
      
      const targetClassNames = new Set(filteredClasses.map((c: any) => c.className.trim()));
      filteredStudents = students.filter((s: any) => s.classe && targetClassNames.has(s.classe.trim()));
      
      filteredSeances = seances.filter((s: any) => s.employeeId === emp.id);
      filteredPlans = plans.filter((p: any) => p.employeeId === emp.id);
      filteredAssignments = assignments.filter((a: any) => teacherClassIds.has(a.classId));
      filteredSubmissions = submissions.filter((sub: any) => sub.assignment?.classId && teacherClassIds.has(sub.assignment.classId));
      filteredRemediations = remediations.filter((r: any) => r.employeeId === emp.id);
      filteredInspections = inspections.filter((i: any) => i.employeeId === emp.id);
    } else {
      filteredClasses = [];
      filteredSubjects = [];
      filteredEmployees = [];
      filteredStudents = [];
      filteredSeances = [];
      filteredPlans = [];
      filteredAssignments = [];
      filteredSubmissions = [];
      filteredRemediations = [];
      filteredInspections = [];
    }
  }

  return (
    <RapportsClient
      currentUser={currentUser}
      classes={filteredClasses}
      subjects={filteredSubjects}
      employees={filteredEmployees}
      students={filteredStudents}
      seances={filteredSeances}
      plans={filteredPlans}
      assignments={filteredAssignments}
      submissions={filteredSubmissions}
      remediations={filteredRemediations}
      inspections={filteredInspections}
      sessions={sessions}
      activeSessionName={activeSessionName}
      periods={periods}
    />
  );
}
