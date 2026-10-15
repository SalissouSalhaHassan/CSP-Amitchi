export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import {
  getPedagogieClassOverview,
  getPedagogieOverview,
  getPedagogieSubjectOverview,
} from "@/domains/pedagogie/actions/analytics.actions";
import PedagogieDashboardClient from "./PedagogieDashboardClient";

import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Pédagogie & Enseignement | Edut",
  description: "Tableau de bord pédagogique - suivi progression, devoirs, ressources et rapports",
};

export default async function PedagogiePage() {
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
            Vous ne disposez pas des permissions nécessaires pour accéder au Tableau de bord pédagogique.
          </p>
        </div>
      </div>
    );
  }

  const [
    classesRes,
    subjectsRes,
    employeesRes,
    studentsRes,
    assignmentsRes,
    overviewRes,
    classOverviewRes,
    subjectOverviewRes,
  ] = await Promise.all([
    getClasses(true).catch((err) => ({ error: err?.message, data: [] })),
    getSubjects().catch((err) => ({ error: err?.message, data: [] })),
    getEmployees().catch((err) => ({ error: err?.message, data: [] })),
    getStudents().catch((err) => ({ error: err?.message, data: [] })),
    getAssignments().catch((err) => ({ error: err?.message, data: [] })),
    getPedagogieOverview().catch((err) => ({ success: false, error: err?.message, data: null })),
    getPedagogieClassOverview().catch((err) => ({ success: false, error: err?.message, data: [] })),
    getPedagogieSubjectOverview().catch((err) => ({ success: false, error: err?.message, data: [] })),
  ]);

  const extractArray = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  };

  const classes = extractArray(classesRes);
  const subjects = extractArray(subjectsRes);
  const employees = extractArray(employeesRes);
  const students = extractArray(studentsRes);
  const assignments = extractArray(assignmentsRes);
  const overview = (overviewRes as any)?.data || null;
  const classOverview = Array.isArray((classOverviewRes as any)?.data) ? (classOverviewRes as any).data : [];
  const subjectOverview = Array.isArray((subjectOverviewRes as any)?.data) ? (subjectOverviewRes as any).data : [];

  const teachers = employees.filter((employee: any) =>
    (employee?.poste || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee?.fonction || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee?.role?.roleName || "").toLowerCase().match(/profess|enseign/)
  );

  return (
    <PedagogieDashboardClient
      currentUser={currentUser}
      classes={classes}
      subjects={subjects}
      teachers={teachers.length > 0 ? teachers : employees}
      students={students}
      assignments={assignments}
      overview={overview}
      classOverview={classOverview}
      subjectOverview={subjectOverview}
    />
  );
}
