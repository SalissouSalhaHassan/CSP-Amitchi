export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import { getSeances } from "@/domains/pedagogie/actions/cahier-textes.actions";
import ProgressionClient from "./ProgressionClient";

export const metadata = {
  title: "Suivi de progression pédagogique | Pédagogie | Edut",
  description: "Matières, chapitres et leçons prévues vs réalisées par classe et enseignant",
};

export default async function ProgressionPage() {
  const currentUser = await getCurrentUser();

  const [classesRes, subjectsRes, employeesRes, plansRes, seancesRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getPlanifications(),
    getSeances(),
  ]);

  const classes = (classesRes as any).data || (Array.isArray(classesRes) ? classesRes : []);
  const subjects = (subjectsRes as any).data || (Array.isArray(subjectsRes) ? subjectsRes : []);
  const employees = (employeesRes as any).data || (Array.isArray(employeesRes) ? employeesRes : []);
  const plans = (plansRes as any).data || [];
  const seances = (seancesRes as any).data || [];

  return (
    <ProgressionClient
      currentUser={currentUser}
      classes={classes}
      subjects={subjects}
      employees={employees}
      plans={plans}
      seances={seances}
    />
  );
}
