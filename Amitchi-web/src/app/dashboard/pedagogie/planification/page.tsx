export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects, getSessions, getPeriods } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initPlanificationTable, getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import PlanificationClient from "./PlanificationClient";

import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Planification pédagogique | Pédagogie | Edut",
  description: "Gestion des planifications pédagogiques annuelles, mensuelles et hebdomadaires",
};

export default async function PlanificationPage() {
  // 1. Initialize table
  await initPlanificationTable();

  // 2. Fetch current user context
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
            Vous ne disposez pas des permissions nécessaires pour accéder à la Planification pédagogique.
          </p>
        </div>
      </div>
    );
  }

  // 3. Parallel fetch of reference data
  const [classesRes, subjectsRes, employeesRes, plansRes, sessionsRes, periodsRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getPlanifications(),
    getSessions(),
    getPeriods(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const plans = (plansRes as any).data || [];
  const sessions = (sessionsRes as any).data || sessionsRes || [];
  const periods = (periodsRes as any).data || periodsRes || [];

  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  return (
    <PlanificationClient
      currentUser={currentUser}
      initialPlans={plans}
      classes={classes}
      subjects={subjects}
      employees={employees}
      sessions={sessions}
      activeSessionName={activeSessionName}
      periods={periods}
    />
  );
}
