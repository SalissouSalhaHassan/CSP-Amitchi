export const dynamic = "force-dynamic";

import React from "react";
import { getClasses, getSessions, getSubjects } from "@/domains/academics/actions/academics.actions";
import ExamsDashboardClient from "./exams-dashboard-client";

// Ensure this page is dynamically rendered to get fresh database results
export const revalidate = 0;

export default async function ExamsPage() {
  let initialClasses: any[] = [];
  let initialSessions: any[] = [];
  let initialSubjects: any[] = [];

  try {
    const classesRes = await getClasses() as any;
    initialClasses = (classesRes?.data?.data || classesRes?.data || []) as any[];
  } catch (e) {
    console.error("Failed to pre-fetch classes for exams dashboard:", e);
  }

  try {
    const sessionsRes = await getSessions() as any;
    initialSessions = (sessionsRes?.data?.data || sessionsRes?.data || []) as any[];
  } catch (e) {
    console.error("Failed to pre-fetch sessions for exams dashboard:", e);
  }

  try {
    const subjectsRes = await getSubjects() as any;
    initialSubjects = (subjectsRes?.data?.data || subjectsRes?.data || []) as any[];
  } catch (e) {
    console.error("Failed to pre-fetch subjects for exams dashboard:", e);
  }

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <ExamsDashboardClient
        initialClasses={initialClasses}
        initialSessions={initialSessions}
        initialSubjects={initialSubjects}
      />
    </div>
  );
}
