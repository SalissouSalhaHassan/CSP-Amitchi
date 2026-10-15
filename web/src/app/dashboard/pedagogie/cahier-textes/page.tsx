export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initCahierTextesTable, getSeances, getTimetableSlots } from "@/domains/pedagogie/actions/cahier-textes.actions";
import { getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import CahierTextesClient from "./CahierTextesClient";

import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Cahier de textes numérique | Pédagogie | Edut",
  description: "Gestion numérique du cahier de textes par classe, matière et enseignant",
};

export default async function CahierTextesPage() {
  // 1. Init table on first access
  await initCahierTextesTable();

  // 2. Fetch current user
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
            Vous ne disposez pas des permissions nécessaires pour accéder au Cahier de textes numérique.
          </p>
        </div>
      </div>
    );
  }

  // 3. Fetch reference data in parallel
  const [classesRes, subjectsRes, employeesRes, seancesRes, slotsRes, plansRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getSeances(),
    getTimetableSlots(),
    getPlanifications(),
  ]);

  const classes   = (classesRes   as any).data?.data || (classesRes   as any).data || classesRes   || [];
  const subjects  = (subjectsRes  as any).data?.data || (subjectsRes  as any).data || subjectsRes  || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const seances   = (seancesRes   as any).data || [];
  const slots     = (slotsRes     as any).data || [];
  const plans     = (plansRes     as any).data || [];

  return (
    <CahierTextesClient
      currentUser={currentUser}
      initialSeances={seances}
      classes={classes}
      subjects={subjects}
      employees={employees}
      timetableSlots={slots}
      planifications={plans}
    />
  );
}
