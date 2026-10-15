export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { initRemediationTable, getRemediationPlans, getAtRiskStudents } from "@/domains/pedagogie/actions/remediation.actions";
import RemediationClient from "./RemediationClient";
import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Plan de remédiation pédagogique | Pédagogie | Edut",
  description: "Accompagnement personnalisé des élèves en difficulté d'apprentissage",
};

export default async function RemediationPage() {
  // 1. Provision table
  await initRemediationTable();

  const currentUser = await getCurrentUser();

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
            Vous ne disposez pas des permissions nécessaires pour accéder à la Remédiation pédagogique.
          </p>
        </div>
      </div>
    );
  }

  const [classesRes, subjectsRes, employeesRes, studentsRes, plansRes, atRiskRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getRemediationPlans(),
    getAtRiskStudents(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];
  const plans = (plansRes as any).data || [];
  const atRisk = (atRiskRes as any).data || [];

  return (
    <RemediationClient
      currentUser={currentUser}
      initialPlans={plans}
      classes={classes}
      subjects={subjects}
      employees={employees}
      students={students}
      atRiskStudents={atRisk}
    />
  );
}
