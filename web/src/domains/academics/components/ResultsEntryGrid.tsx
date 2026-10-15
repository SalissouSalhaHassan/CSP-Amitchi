"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBatchExamResults } from "@/domains/academics/actions/exams.actions";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { localDb } from "@/infrastructure/local-db/dexie";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
}

interface ResultsEntryGridProps {
  examId: number;
  maxMarks: number;
  students: Student[];
  initialResults?: any[];
}

function ResultStatusBadge({ status }: { status: "pending" | "conflict" | "synced" | null }) {
  if (status === "pending") {
    return <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">En attente</span>;
  }
  if (status === "conflict") {
    return <span className="ml-2 px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest rounded-full">Conflit</span>;
  }
  if (status === "synced") {
    return <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-full">Synchronisé</span>;
  }
  return null;
}

export default function ResultsEntryGrid({ examId, maxMarks, students, initialResults = [] }: ResultsEntryGridProps) {
  const { mutate } = useOfflineMutation<{ id?: number; examId: number; studentId: number; marksObtained: number; remarks: string; originalMarksObtained?: number | null; originalRemarks?: string | null }>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outboxStatuses, setOutboxStatuses] = useState<Record<number, "pending" | "conflict" | "synced" | null>>({});
  const [results, setResults] = useState<Record<number, { marks: string; remark: string }>>(
    students.reduce((acc, s) => {
      const existing = initialResults.find(r => r.studentId === s.id);
      acc[s.id] = {
        marks: existing?.marksObtained?.toString() || "",
        remark: existing?.remarks || "",
      };
      return acc;
    }, {} as any)
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadLocalResultsAndStatuses() {
      try {
        // Load local offline-edited results
        const cached = await localDb.examResults.where("examId").equals(examId).toArray();
        if (cached && cached.length > 0) {
          setResults(prev => {
            const updated = { ...prev };
            for (const r of cached) {
              updated[r.studentId] = {
                marks: r.marksObtained?.toString() || "",
                remark: r.remarks || "",
              };
            }
            return updated;
          });
        }

        // Load outbox sync statuses
        const items = await localDb.outbox
          .where("targetTable")
          .equals("examResults")
          .toArray();

        const statuses: Record<number, "pending" | "conflict" | "synced" | null> = {};
        for (const item of items) {
          if (item.payload.examId === examId) {
            const studId = item.payload.studentId;
            if (item.status === "conflict") {
              statuses[studId] = "conflict";
            } else if (item.status === "synced") {
              statuses[studId] = "synced";
            } else {
              statuses[studId] = "pending";
            }
          }
        }
        setOutboxStatuses(statuses);
      } catch (e) {
        console.warn("Failed to load local results/statuses:", e);
      }
    }
    loadLocalResultsAndStatuses();
  }, [examId, success, loading]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updateMarks = (studentId: number, marks: string) => {
    // Only allow numbers and decimal point
    if (marks !== "" && !/^\d*\.?\d*$/.test(marks)) return;
    
    // Check if marks > maxMarks
    const num = parseFloat(marks);
    if (num > maxMarks) return;

    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks }
    }));
  };

  const updateRemark = (studentId: number, remark: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remark }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const cached = await localDb.examResults.where("examId").equals(examId).toArray();

      const rows = Object.entries(results)
        .filter(([_, val]) => val.marks !== "")
        .map(([id, val]) => {
          const studentId = Number(id);
          const serverResult = initialResults.find(r => r.studentId === studentId);
          const localResult = cached.find(r => r.studentId === studentId);

          return {
            id: localResult?.id,
            examId,
            studentId,
            marksObtained: parseFloat(val.marks),
            remarks: val.remark,
            originalMarksObtained: serverResult ? serverResult.marksObtained : null,
            originalRemarks: serverResult ? serverResult.remarks : null,
          };
        });

      let result: { success: boolean; error?: string } = { success: true };
      for (const row of rows) {
        const rowResult = await mutate(row, {
          targetTable: "examResults",
          idempotencyKey: `examResults:${examId}:${row.studentId}`,
          entityId: `${examId}:${row.studentId}`,
          onlineAction: async (payload) => saveBatchExamResults({
            examId: payload.examId,
            results: [
              {
                studentId: payload.studentId,
                marksObtained: payload.marksObtained,
                remarks: payload.remarks,
                originalMarksObtained: payload.originalMarksObtained,
                originalRemarks: payload.originalRemarks,
              },
            ],
          } as any),
        });

        if (!rowResult.success) {
          result = { success: false, error: rowResult.error };
          break;
        }
      }

      setLoading(false);
      if (result.success) {
        setSuccess(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSuccess(false), 3000);
      } else {
        alert("Erreur: " + result.error);
      }
    } catch (err: any) {
      setLoading(false);
      alert("Erreur: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Saisie des notes</p>
          <h2 className="text-xl font-black text-slate-900 mt-1">Échelle de notation: <span className="text-primary">0 - {maxMarks}</span></h2>
        </div>
        <div className="flex items-center gap-4">
          {success && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 size={20} /> Notes enregistrées !
            </div>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="rounded-2xl px-10 h-14 bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-xl transition-all flex items-center gap-2"
          >
            {loading ? "Enregistrement..." : <><Save size={20} /> Enregistrer les Notes</>}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Élève</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Note / {maxMarks}</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Appréciation / Observation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((s) => (
              <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{s.nomEtudiant}</p>
                    <ResultStatusBadge status={outboxStatuses[s.id] || (initialResults.find(r => r.studentId === s.id) ? "synced" : null)} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Mat: {s.numAdmission || "N/A"}</p>
                </td>
                <td className="px-10 py-6 text-center">
                  <div className="relative inline-block w-24">
                    <Input
                      value={results[s.id].marks}
                      onChange={(e) => updateMarks(s.id, e.target.value)}
                      className={`text-center font-black text-xl h-14 rounded-2xl border-2 transition-all ${
                        results[s.id].marks === "" 
                          ? "border-slate-100 bg-slate-50" 
                          : parseFloat(results[s.id].marks) < (maxMarks / 2)
                            ? "border-rose-100 bg-rose-50 text-rose-600 focus:ring-rose-200"
                            : "border-emerald-100 bg-emerald-50 text-emerald-600 focus:ring-emerald-200"
                      }`}
                      placeholder="--"
                    />
                  </div>
                </td>
                <td className="px-10 py-6">
                  <Input
                    placeholder="ex: Très bon travail, à encourager..."
                    value={results[s.id].remark}
                    onChange={(e) => updateRemark(s.id, e.target.value)}
                    className="rounded-2xl border-slate-100 h-14 font-medium focus:ring-primary/20 transition-all"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
