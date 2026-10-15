export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initRessourcesTable, getRessources } from "@/domains/pedagogie/actions/ressources.actions";
import RessourcesClient from "./RessourcesClient";

import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Bibliothèque de ressources pédagogiques | Pédagogie | Edut",
  description: "Fichiers PDF, vidéos, présentations et exercices scolaires",
};

export default async function RessourcesPage() {
  // 1. Initialize table
  await initRessourcesTable();

  // 2. Fetch current user context
  const currentUser = await getCurrentUser();

  const role = getPedagogieRole(currentUser);
  if (role === "parent" || role === "guest" || role === "consultation") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 border border-slate-150 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
            <X size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Accès non autorisé</h2>
          <p className="text-slate-500 text-sm font-medium">
            Vous ne disposez pas des permissions nécessaires pour accéder à la Bibliothèque de ressources.
          </p>
        </div>
      </div>
    );
  }

  // 3. Parallel fetch of reference data
  const [classesRes, subjectsRes, employeesRes, ressourcesRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getRessources(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const resources = (ressourcesRes as any).data || [];

  return (
    <RessourcesClient
      currentUser={currentUser}
      initialResources={resources}
      classes={classes}
      subjects={subjects}
      employees={employees}
    />
  );
}
