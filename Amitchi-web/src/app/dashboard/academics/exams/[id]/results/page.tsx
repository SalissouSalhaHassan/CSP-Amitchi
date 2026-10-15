export const dynamic = "force-dynamic";

import { db } from "@/infrastructure/database";
import { exams } from "@/infrastructure/database/schema/academics";
import { eq } from "drizzle-orm";
import { getExamResults } from "@/domains/academics/actions/exams.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import ResultsEntryGrid from "@/domains/academics/components/ResultsEntryGrid";
import { Award, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const examId = Number(resolvedParams.id);

  if (!examId || isNaN(examId)) notFound();
  
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
    with: {
      class: true,
      subject: true,
    }
  });

  if (!exam) notFound();

  const studentsRes = await getStudents();
  const students: any[] = ((studentsRes as any).data?.data || (studentsRes as any).data || []) as any[];
  // Filter students by class if necessary (currently getStudents gets all)
  const filteredStudents = students.filter(s => s.classe === exam.class?.className);

  const resultsRes = await getExamResults(examId);
  const initialResults: any[] = ((resultsRes as any).data?.data || (resultsRes as any).data || []) as any[];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-6">
        <Link href="/dashboard/academics/exams" className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest">Saisie des résultats</span>
             <span className="text-slate-300">/</span>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{exam.class?.className} - {exam.subject?.subjectName}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mt-1">{exam.examName}</h1>
        </div>
      </div>

      <ResultsEntryGrid 
        examId={examId} 
        maxMarks={exam.maxMarks || 20} 
        students={filteredStudents as any} 
        initialResults={initialResults} 
      />
    </div>
  );
}
