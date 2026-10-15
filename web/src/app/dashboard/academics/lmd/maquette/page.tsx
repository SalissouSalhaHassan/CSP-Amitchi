import React from "react";
import { getUniversityPrograms, getFaculties } from "@/domains/academics/actions/lmd.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { readDb } from "@/infrastructure/database";
import { schoolSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { or, eq, isNull, asc } from "drizzle-orm";
import MaquetteClient from "./maquette-client";

export const dynamic = "force-dynamic";

export default async function UniversityMaquettePage() {
  const schoolId = await getActiveSchoolId();

  const programsRes = await getUniversityPrograms(schoolId);
  const facultiesRes = await getFaculties(schoolId);

  const subjects = await readDb.query.schoolSubjects.findMany({
    where: or(eq(schoolSubjects.schoolId, schoolId), isNull(schoolSubjects.schoolId)),
    orderBy: [asc(schoolSubjects.subjectName)],
  });

  const teachers = await readDb.query.employees.findMany({
    where: or(eq(employees.schoolId, schoolId), isNull(employees.schoolId)),
    orderBy: [asc(employees.nom)],
  });

  return (
    <MaquetteClient
      initialPrograms={programsRes.success ? (programsRes.data || []) : []}
      initialFaculties={facultiesRes.success ? (facultiesRes.data || []) : []}
      subjects={subjects}
      teachers={teachers}
    />
  );
}
