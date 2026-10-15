export const dynamic = "force-dynamic";

import { getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getPedagogicalUnits } from "@/domains/academics/actions/pedagogical-units.actions";
import PedagogicalUnitsClient from "./units-client";

export default async function PedagogicalUnitsPage() {
  const unitsRes = await getPedagogicalUnits();
  const employeesRes = await getEmployees();
  const subjectsRes = await getSubjects();

  const units: any[] = (unitsRes as any).data || [];
  const employees: any[] = ((employeesRes as any).data?.data || (employeesRes as any).data || []) as any[];
  const subjects: any[] = ((subjectsRes as any).data?.data || (subjectsRes as any).data || []) as any[];

  return (
    <div className="p-4 min-h-[calc(100vh-60px)] bg-slate-50/50">
      <PedagogicalUnitsClient 
        initialUnits={units}
        teachers={employees}
        subjects={subjects}
      />
    </div>
  );
}
