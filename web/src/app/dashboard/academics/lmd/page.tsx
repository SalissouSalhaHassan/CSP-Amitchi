import React from "react";
import { getFaculties, getUniversityPrograms } from "@/domains/academics/actions/lmd.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { readDb } from "@/infrastructure/database";
import { schoolSections, schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { or, eq, isNull } from "drizzle-orm";
import LmdHubClient from "./lmd-hub-client";

export const dynamic = "force-dynamic";

export default async function UniversityLmdHubPage() {
  const schoolId = await getActiveSchoolId();

  const [facultiesRes, programsRes, realSections, realClasses, realSessions] = await Promise.all([
    getFaculties(schoolId),
    getUniversityPrograms(schoolId),
    readDb.query.schoolSections.findMany({
      where: or(eq(schoolSections.schoolId, schoolId), isNull(schoolSections.schoolId)),
    }),
    readDb.query.schoolClasses.findMany({
      where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
    }),
    readDb.query.schoolSessions.findMany({
      where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
    }),
  ]);

  const faculties = facultiesRes.success ? (facultiesRes.data || []) : [];
  const programs = programsRes.success ? (programsRes.data || []) : [];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <LmdHubClient
        initialFaculties={faculties}
        initialPrograms={programs}
        realSectionsCount={realSections.length}
        realClassesCount={realClasses.length}
        realSessionsCount={realSessions.length}
      />
    </div>
  );
}
