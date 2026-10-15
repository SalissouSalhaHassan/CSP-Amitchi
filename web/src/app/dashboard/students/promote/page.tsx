export const dynamic = "force-dynamic";

import { getStudents } from "@/domains/students/actions/students.actions";
import { getClasses, getSessions } from "@/domains/academics/actions/academics.actions";
import { db } from "@/infrastructure/database";
import { studentTermSummaries, studentResults } from "@/infrastructure/database/schema/academics";
import { inArray } from "drizzle-orm";
import PromoteClient from "./promote-client";

export default async function StudentPromotionPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ class?: string; session?: string }> 
}) {
  const params = await searchParams;
  const [studentsRes, classesRes, sessionsRes] = await Promise.all([
    getStudents(),
    getClasses(true),
    getSessions()
  ]);

  const allStudents = (studentsRes as any)?.data || (studentsRes.data as any)?.data || studentsRes.data || [];
  const classes = (classesRes.data as any)?.data || classesRes.data || [];
  const sessions = (sessionsRes.data as any)?.data || sessionsRes.data || [];

  const studentIds = allStudents.map((s: any) => s.id);
  
  // 1. Fetch saved term summaries
  let summaries: any[] = [];
  if (studentIds.length > 0) {
    try {
      summaries = await db
        .select({
          studentId: studentTermSummaries.studentId,
          average: studentTermSummaries.average,
          sessionId: studentTermSummaries.sessionId,
          term: studentTermSummaries.term,
        })
        .from(studentTermSummaries)
        .where(inArray(studentTermSummaries.studentId, studentIds));
    } catch (err) {
      console.error("⚠️ Failed to fetch student summaries:", err);
    }
  }

  // 2. Fetch raw student results to calculate averages dynamically if summaries are not saved/finalized yet
  let rawResults: any[] = [];
  if (studentIds.length > 0) {
    try {
      rawResults = await db
        .select({
          studentId: studentResults.studentId,
          sessionId: studentResults.sessionId,
          term: studentResults.term,
          classWorkScore: studentResults.classWorkScore,
          examScore: studentResults.examScore,
          coefficient: studentResults.coefficient,
        })
        .from(studentResults)
        .where(inArray(studentResults.studentId, studentIds));
    } catch (err) {
      console.error("⚠️ Failed to fetch raw student results:", err);
    }
  }

  // Map sessionName to sessionId
  const sessionNameToIdMap: Record<string, number> = {};
  sessions.forEach((s: any) => {
    if (s.sessionName && s.id) {
      sessionNameToIdMap[s.sessionName.trim().toLowerCase()] = s.id;
    }
  });

  // Combine student details with their real averages (using summaries + raw fallback)
  const studentsWithRealAverages = allStudents.map((s: any) => {
    const studentSessionName = s.session ? s.session.trim().toLowerCase() : "";
    const studentSessionId = sessionNameToIdMap[studentSessionName];
    
    // We will collect term averages for each term/period in the student's current session
    const termAveragesMap: Record<string, number> = {};

    // First, populate from saved database summaries
    const studentSummaries = summaries.filter((sum: any) => 
      sum.studentId === s.id && 
      (!studentSessionId || sum.sessionId === studentSessionId)
    );
    
    studentSummaries.forEach((sum: any) => {
      if (sum.term) {
        termAveragesMap[sum.term] = Number(sum.average) || 0;
      }
    });

    // Second, calculate averages from raw results for any term that does not have a saved summary
    const studentResultsList = rawResults.filter((r: any) => 
      r.studentId === s.id && 
      (!studentSessionId || r.sessionId === studentSessionId)
    );

    const resultsByTerm: Record<string, any[]> = {};
    studentResultsList.forEach((r: any) => {
      if (r.term) {
        if (!resultsByTerm[r.term]) resultsByTerm[r.term] = [];
        resultsByTerm[r.term].push(r);
      }
    });

    Object.keys(resultsByTerm).forEach((term) => {
      if (termAveragesMap[term] === undefined) {
        let totalWeighted = 0;
        let totalCoef = 0;
        resultsByTerm[term].forEach((r: any) => {
          const cw = Number(r.classWorkScore) || 0;
          const ex = Number(r.examScore) || 0;
          const coef = Number(r.coefficient) || 1;
          totalWeighted += ((cw + ex) / 2) * coef;
          totalCoef += coef;
        });
        if (totalCoef > 0) {
          termAveragesMap[term] = totalWeighted / totalCoef;
        }
      }
    });

    // Calculate final annual average as the average of all recorded term averages
    const avgs = Object.values(termAveragesMap);
    const sum = avgs.reduce((a, b) => a + b, 0);
    const average = avgs.length > 0 ? sum / avgs.length : 10.0;

    return {
      ...s,
      moyenne: average,
    };
  });

  return (
    <PromoteClient 
      students={studentsWithRealAverages}
      classes={classes}
      sessions={sessions}
      initialClass={params.class}
      initialSession={params.session}
    />
  );
}
