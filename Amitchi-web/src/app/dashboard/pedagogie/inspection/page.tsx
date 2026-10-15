export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initInspectionTable, getInspectionVisits } from "@/domains/pedagogie/actions/inspection.actions";
import InspectionClient from "./InspectionClient";
import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Inspection pédagogique | Pédagogie | Edut",
  description: "Suivi des visites de classe, observations et rapports d'inspection pédagogique",
};

export default async function InspectionPage() {
  // 1. Provision table
  await initInspectionTable();

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
            Vous ne disposez pas des permissions nécessaires pour accéder à l’Inspection pédagogique.
          </p>
        </div>
      </div>
    );
  }

  const [classesRes, subjectsRes, employeesRes, visitsRes, auditRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getInspectionVisits(),
    import("@/domains/pedagogie/actions/teacher-audit.actions").then((m) => m.getTeachersPerformanceAudit()),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const visits = (visitsRes as any).data || [];
  const auditData = auditRes.success ? auditRes.data : null;

  return (
    <InspectionClient
      currentUser={currentUser}
      initialVisits={visits}
      classes={classes}
      subjects={subjects}
      employees={employees}
      auditData={auditData}
    />
  );
}
