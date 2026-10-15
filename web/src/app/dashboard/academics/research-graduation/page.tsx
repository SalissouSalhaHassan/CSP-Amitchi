export const dynamic = "force-dynamic";

import { getGraduationProjects, getGraduationStats, getDefenseRooms } from "@/domains/academics/actions/graduation.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import GraduationClient from "./GraduationClient";

export default async function ResearchGraduationPage() {
  const [projectsRes, statsRes, roomsRes, employeesRes] = await Promise.all([
    getGraduationProjects() as any,
    getGraduationStats() as any,
    getDefenseRooms() as any,
    getEmployees() as any,
  ]);

  const projects = projectsRes?.data?.data || projectsRes?.data || [];
  const stats = statsRes?.data?.data || statsRes?.data || {
    activeCount: 0, studentsCount: 0, supervisorsCount: 0,
    defensesPlanned: 0, pendingCount: 0, validatedCount: 0,
    distinguishedCount: 0, publicationsCount: 0, successRate: 0, avgGrade: 0,
  };
  const rooms = roomsRes?.data?.data || roomsRes?.data || [];
  const employees = employeesRes?.data?.data || employeesRes?.data || [];

  const teachers = employees.map((emp: any) => ({
    id: emp.id,
    nom: emp.nom || `${emp.prenom || ""} ${emp.nomFamille || ""}`.trim() || "Employé",
    poste: emp.poste,
    departement: emp.departement,
    email: emp.email,
    mobile: emp.mobile,
  }));

  return (
    <GraduationClient
      initialProjects={projects}
      teachers={teachers}
      initialStats={stats}
      defenseRooms={rooms}
    />
  );
}
