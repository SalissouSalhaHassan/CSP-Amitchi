"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Save, Search, TrendingUp, Calculator, Loader2, CheckCircle2, RefreshCw,
  Printer, Award, AlertTriangle, Users, Sparkles, Filter, ChevronDown, Check,
  ArrowUpDown, FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DevoirEntryGridProps {
  students: any[];
  onSave: (data: any) => void;
  loading?: boolean;
  subjectName?: string;
  className?: string;
  coefficient?: number;
  term?: string;
}

export default function DevoirEntryGrid({ 
  students: initialStudents, 
  onSave,
  loading = false,
  subjectName = "Matière",
  className = "Classe",
  coefficient = 1,
  term = "Trimestre"
}: DevoirEntryGridProps) {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "evaluated" | "pending" | "danger">("all");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeDsCol, setActiveDsCol] = useState<number | null>(null);
  const [batchValue, setBatchValue] = useState("");

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    setData(initialStudents.map(s => {
      const res = s.existingResult;
      const devArray = Array.isArray(s.devoirs) ? s.devoirs : [];
      
      const d1 = res?.devoir1 ?? devArray[0];
      const d2 = res?.devoir2 ?? devArray[1];
      const d3 = res?.devoir3 ?? devArray[2];
      const d4 = res?.devoir4 ?? devArray[3];
      const d5 = res?.devoir5 ?? devArray[4];
      const moy = res?.moyenneDevoirs ?? s.moyenneDevoirs ?? 0;

      return {
        studentId: s.id,
        matricule: s.numAdmission || "N/A",
        name: s.nomEtudiant || "Sans Nom",
        devoirs: [
          d1 != null && d1 !== "" ? String(d1) : "",
          d2 != null && d2 !== "" ? String(d2) : "",
          d3 != null && d3 !== "" ? String(d3) : "",
          d4 != null && d4 !== "" ? String(d4) : "",
          d5 != null && d5 !== "" ? String(d5) : "",
        ],
        moyenneDevoirs: Number(moy) || 0,
      };
    }));
  }, [initialStudents]);

  const processedData = useMemo(() => {
    return data.map(row => {
      const vals = row.devoirs
        .map((v: string) => parseFloat(v))
        .filter((v: number) => !isNaN(v));
      
      const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      return { ...row, moyenneDevoirs: Number(avg.toFixed(2)) };
    });
  }, [data]);

  // Real-time Class Statistics
  const stats = useMemo(() => {
    const evaluatedRows = processedData.filter(r => r.devoirs.some((d: string) => d !== "" && !isNaN(parseFloat(d))));
    const totalCount = processedData.length;
    const evaluatedCount = evaluatedRows.length;
    
    if (evaluatedCount === 0) {
      return { avg: 0, max: 0, min: 0, passRate: 0, totalCount, evaluatedCount, topStudent: "-" };
    }

    const averages = evaluatedRows.map(r => r.moyenneDevoirs);
    const sum = averages.reduce((a, b) => a + b, 0);
    const avg = sum / evaluatedCount;
    const max = Math.max(...averages);
    const min = Math.min(...averages);
    const passCount = evaluatedRows.filter(r => r.moyenneDevoirs >= 10).length;
    const passRate = (passCount / evaluatedCount) * 100;
    
    const top = evaluatedRows.find(r => r.moyenneDevoirs === max);

    return {
      avg: Number(avg.toFixed(2)),
      max: Number(max.toFixed(2)),
      min: Number(min.toFixed(2)),
      passRate: Number(passRate.toFixed(1)),
      totalCount,
      evaluatedCount,
      topStudent: top ? top.name : "-"
    };
  }, [processedData]);

  const handleDevoirInput = (id: number, index: number, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (num > 20) return;

    setData(prev => prev.map(row => {
      if (row.studentId === id) {
        const newDevoirs = [...row.devoirs];
        newDevoirs[index] = value;
        return { ...row, devoirs: newDevoirs };
      }
      return row;
    }));
  };

  // Keyboard navigation between cells (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter)
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    const totalRows = filteredData.length;
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      if (rowIndex < totalRows - 1) {
        const targetId = filteredData[rowIndex + 1].studentId;
        inputRefs.current[`${targetId}-${colIndex}`]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIndex > 0) {
        const targetId = filteredData[rowIndex - 1].studentId;
        inputRefs.current[`${targetId}-${colIndex}`]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      if (colIndex < 4) {
        e.preventDefault();
        const currentId = filteredData[rowIndex].studentId;
        inputRefs.current[`${currentId}-${colIndex + 1}`]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      if (colIndex > 0) {
        e.preventDefault();
        const currentId = filteredData[rowIndex].studentId;
        inputRefs.current[`${currentId}-${colIndex - 1}`]?.focus();
      }
    }
  };

  // Batch action (apply note or clear to specific DS column)
  const applyBatchToColumn = (colIdx: number, val: string) => {
    setData(prev => prev.map(row => {
      const newDevoirs = [...row.devoirs];
      newDevoirs[colIdx] = val;
      return { ...row, devoirs: newDevoirs };
    }));
    setShowBatchModal(false);
    setBatchValue("");
  };

  const fillEmptyWithZero = (colIdx: number) => {
    setData(prev => prev.map(row => {
      const newDevoirs = [...row.devoirs];
      if (newDevoirs[colIdx] === "") {
        newDevoirs[colIdx] = "0";
      }
      return { ...row, devoirs: newDevoirs };
    }));
  };

  const filteredData = useMemo(() => {
    return processedData.filter(r => {
      const name = r.name || "";
      const matricule = r.matricule || "";
      const searchTerm = search.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(searchTerm) || matricule.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;

      const hasGrade = r.devoirs.some((d: string) => d !== "");
      if (filterStatus === "evaluated") return hasGrade;
      if (filterStatus === "pending") return !hasGrade;
      if (filterStatus === "danger") return hasGrade && r.moyenneDevoirs < 10;
      return true;
    });
  }, [processedData, search, filterStatus]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule as any).default || autoTableModule;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, m = 14;
      const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

      // ─── Header Decorative Bands ───
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, W, 6, "F");
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 6, 90, 2, "F");

      // ─── Title & Academic Metadata ───
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("PROCÈS-VERBAL DES DEVOIRS SURVEILLÉS (DS)", W / 2, 18, { align: "center" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`RELEVÉ OFFICIEL DES ÉVALUATIONS CONTINUES • ${term.toUpperCase()}`, W / 2, 23.5, { align: "center" });

      // ─── Info Box (Classe, Matière, Coeff, Date) ───
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(m, 27, W - 2 * m, 18, 2, 2, "FD");

      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      
      // Column 1
      doc.setFont("helvetica", "bold");
      doc.text("Classe :", m + 4, 33);
      doc.setFont("helvetica", "normal");
      doc.text(className, m + 20, 33);

      doc.setFont("helvetica", "bold");
      doc.text("Matière :", m + 4, 40);
      doc.setFont("helvetica", "normal");
      doc.text(subjectName, m + 20, 40);

      // Column 2
      doc.setFont("helvetica", "bold");
      doc.text("Coefficient :", W / 2 - 12, 33);
      doc.setFont("helvetica", "normal");
      doc.text(String(coefficient), W / 2 + 10, 33);

      doc.setFont("helvetica", "bold");
      doc.text("Période :", W / 2 - 12, 40);
      doc.setFont("helvetica", "normal");
      doc.text(term, W / 2 + 10, 40);

      // Column 3
      doc.setFont("helvetica", "bold");
      doc.text("Date d'édition :", W - m - 45, 33);
      doc.setFont("helvetica", "normal");
      doc.text(dateStr, W - m - 20, 33);

      doc.setFont("helvetica", "bold");
      doc.text("Moyenne Classe :", W - m - 45, 40);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text(`${stats.avg.toFixed(2)} / 20`, W - m - 16, 40);

      // ─── Mini Analytics Grid Bar ───
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(m, 48, W - 2 * m, 8, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      const evalPct = stats.totalCount > 0 ? Math.round((stats.evaluatedCount / stats.totalCount) * 100) : 0;
      const statLine = `Effectif : ${stats.totalCount}  |  Évalués : ${stats.evaluatedCount} (${evalPct}%)  |  Taux Réussite : ${stats.passRate}%  |  Max : ${stats.max.toFixed(2)} (${stats.topStudent})  |  Min : ${stats.min.toFixed(2)}`;
      doc.text(statLine, W / 2, 53, { align: "center" });

      // ─── Table Data ───
      const tableBody = filteredData.map((row, idx) => {
        const isEvaluated = row.devoirs.some((d: string) => d !== "");
        const d1 = row.devoirs[0] !== "" ? row.devoirs[0] : "-";
        const d2 = row.devoirs[1] !== "" ? row.devoirs[1] : "-";
        const d3 = row.devoirs[2] !== "" ? row.devoirs[2] : "-";
        const d4 = row.devoirs[3] !== "" ? row.devoirs[3] : "-";
        const d5 = row.devoirs[4] !== "" ? row.devoirs[4] : "-";
        const moy = isEvaluated ? row.moyenneDevoirs.toFixed(2) : "-";
        const statut = !isEvaluated ? "En attente" : row.moyenneDevoirs >= 10 ? "Admis" : "Faible";
        return [
          String(idx + 1),
          row.matricule,
          row.name,
          d1,
          d2,
          d3,
          d4,
          d5,
          moy,
          statut
        ];
      });

      autoTable(doc, {
        startY: 59,
        head: [["#", "Matricule", "Nom & Prénom", "DS 1", "DS 2", "DS 3", "DS 4", "DS 5", "Moy. DS", "Statut"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 24, fontStyle: "bold" },
          2: { cellWidth: 54 },
          3: { cellWidth: 14, halign: "center" },
          4: { cellWidth: 14, halign: "center" },
          5: { cellWidth: 14, halign: "center" },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 14, halign: "center" },
          8: { cellWidth: 16, halign: "center", fontStyle: "bold" },
          9: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        },
        didParseCell: function (data: any) {
          if (data.section === "body") {
            if (data.column.index === 8) {
              const val = parseFloat(data.cell.raw);
              if (!isNaN(val)) {
                if (val >= 10) {
                  data.cell.styles.textColor = [5, 150, 105]; // emerald
                } else {
                  data.cell.styles.textColor = [225, 29, 72]; // rose
                }
              }
            }
            if (data.column.index === 9) {
              if (data.cell.raw === "Admis") {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (data.cell.raw === "Faible") {
                data.cell.styles.textColor = [225, 29, 72];
              }
            }
          }
        },
        margin: { left: m, right: m, bottom: 35 },
      });

      // ─── Signatures Box on Last Page ───
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        
        if (p === pageCount) {
          const finalY = (doc as any).lastAutoTable.finalY || 180;
          const sigY = Math.min(finalY + 8, 245);
          
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);

          doc.text("L'Enseignant Titulaire :", m + 6, sigY);
          doc.setFont("helvetica", "normal");
          doc.text("Date & Signature", m + 6, sigY + 4);
          doc.setDrawColor(148, 163, 184);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(m + 6, sigY + 22, m + 60, sigY + 22);

          doc.setFont("helvetica", "bold");
          doc.text("Visa de la Direction des Études :", W - m - 60, sigY);
          doc.setFont("helvetica", "normal");
          doc.text("Cachet officiel & Approbation", W - m - 60, sigY + 4);
          doc.line(W - m - 60, sigY + 22, W - m - 6, sigY + 22);
          doc.setLineDashPattern([], 0);
        }

        // Footer Pagination & Timestamp
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text(`Document officiel Edut • Généré le ${dateStr}`, m, 290);
        doc.text(`Page ${p} / ${pageCount}`, W - m, 290, { align: "right" });
      }

      const cleanClass = className.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanSubject = subjectName.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanTerm = term.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `PV_Devoirs_${cleanClass}_${cleanSubject}_${cleanTerm}.pdf`;

      doc.save(fileName);
    } catch (err: any) {
      console.error("PDF export error:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 relative">
      
      {/* ─── Top Real-Time Analytics Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Users className="size-3.5 text-indigo-500" /> Effectif
          </span>
          <div className="mt-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">{stats.totalCount}</span>
            <span className="text-[11px] text-slate-400 font-medium ml-1">élèves</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" /> Évalués
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.evaluatedCount}</span>
            <span className="text-[11px] text-slate-400">({stats.totalCount > 0 ? Math.round((stats.evaluatedCount / stats.totalCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Calculator className="size-3.5 text-amber-500" /> Moyenne DS
          </span>
          <div className="mt-2">
            <span className={`text-xl font-black ${stats.avg >= 10 ? "text-amber-500" : "text-rose-500"}`}>
              {stats.avg.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-bold ml-1">/ 20</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-teal-500" /> Réussite
          </span>
          <div className="mt-2">
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">{stats.passRate}%</span>
            <span className="text-[11px] text-slate-400 font-medium ml-1">(&ge;10/20)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Award className="size-3.5 text-indigo-500" /> Note Max
          </span>
          <div className="mt-2">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.max.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{stats.topStudent}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-rose-500" /> Note Min
          </span>
          <div className="mt-2">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.min.toFixed(2)}</span>
            <span className="text-[11px] text-slate-400 font-bold ml-1">/ 20</span>
          </div>
        </div>
      </div>

      {/* ─── Search, Filter and Actions Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Search size={16} />
            </div>
            <Input 
              placeholder="Rechercher élève ou matricule..." 
              value={search}
              disabled={loading}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-medium focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === "all" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Tous ({processedData.length})
            </button>
            <button
              onClick={() => setFilterStatus("evaluated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === "evaluated" ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Évalués ({stats.evaluatedCount})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === "pending" ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              En attente ({stats.totalCount - stats.evaluatedCount})
            </button>
            <button
              onClick={() => setFilterStatus("danger")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === "danger" ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              &lt; 10/20
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExportingPdf || loading}
            className="h-10 px-4 rounded-xl border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition"
          >
            {isExportingPdf ? (
              <Loader2 size={15} className="animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet size={15} />
            )}
            <span>Exporter PDF (PV)</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs flex items-center gap-2"
          >
            <Printer size={15} />
            <span>Imprimer PV</span>
          </Button>

          <Button 
            onClick={() => onSave(processedData)}
            disabled={loading}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Enregistrer &amp; Synchroniser</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Printable Official PV Header (Hidden on screen, shown in @media print) ─── */}
      <div className="hidden print:block mb-6 p-6 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider">Procès-Verbal des Devoirs Surveillés (DS)</h1>
            <p className="text-xs text-slate-600 font-bold mt-1">
              Classe : <span className="text-black font-black">{className}</span> • Matière : <span className="text-black font-black">{subjectName}</span> • Coeff : <span className="text-black font-black">{coefficient}</span> • Période : <span className="text-black font-black">{term}</span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Moyenne Classe : <span className="font-black text-sm">{stats.avg.toFixed(2)} / 20</span></p>
            <p className="text-slate-600">Taux de Réussite : <span className="font-bold">{stats.passRate}%</span></p>
          </div>
        </div>
      </div>

      {/* ─── Main Grades Table ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl dark:shadow-none overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="bg-slate-900 text-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-800">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
              <div>
                <p className="font-black text-sm">Synchronisation des Devoirs en cours...</p>
                <p className="text-xs text-slate-400 font-medium">Mise à jour immédiate des moyennes et des bulletins.</p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wider w-[120px]">MATRICULE</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wider w-[280px]">NOM &amp; PRÉNOM</th>
                {[1, 2, 3, 4, 5].map((num, i) => (
                  <th key={num} className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-wider w-[110px]">
                    <div className="flex items-center justify-center gap-1">
                      <span>DS {num}</span>
                    </div>
                  </th>
                ))}
                <th className="px-5 py-4 text-center text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 w-[140px]">
                  MOYENNE DS
                </th>
                <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-wider w-[100px]">
                  STATUT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Aucun élève trouvé avec les filtres actuels.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rIdx) => {
                  const isEvaluated = row.devoirs.some((d: string) => d !== "");
                  const isPass = row.moyenneDevoirs >= 10;
                  return (
                    <tr 
                      key={row.studentId} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
                          {row.matricule}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {row.name}
                        </p>
                      </td>
                      {row.devoirs.map((val: string, colIdx: number) => {
                        const numVal = parseFloat(val);
                        const isValPass = !isNaN(numVal) && numVal >= 10;
                        const isValFail = !isNaN(numVal) && numVal < 10;
                        return (
                          <td key={colIdx} className="px-2 py-2 text-center">
                            <Input 
                              ref={el => { inputRefs.current[`${row.studentId}-${colIdx}`] = el; }}
                              value={val}
                              disabled={loading}
                              onChange={(e) => handleDevoirInput(row.studentId, colIdx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rIdx, colIdx)}
                              placeholder="--"
                              className={`w-20 h-9 text-center text-xs rounded-lg font-black transition-all mx-auto ${
                                val === "" 
                                  ? "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-400" 
                                  : isValPass 
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300"
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-5 py-3.5 text-center bg-amber-50/40 dark:bg-amber-950/20 font-mono">
                        <span className={`text-sm font-black ${
                          !isEvaluated ? "text-slate-400" : isPass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isEvaluated ? row.moyenneDevoirs.toFixed(2) : "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {!isEvaluated ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            En attente
                          </span>
                        ) : isPass ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Admis
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                            Faible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Bottom Footer Bar ───────────────────────────────────────────────── */}
        <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Synchronisation Automatique</p>
              <p className="text-xs text-slate-300 font-medium">Les moyennes DS alimentent directement les notes de classe et les bulletins officiels.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Raccourcis : Utilisez les flèches ↑ ↓ ← → ou Entrée pour naviguer
            </span>
            <Button 
              onClick={() => onSave(processedData)}
              disabled={loading}
              className="h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Enregistrer &amp; Synchroniser</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Printable Signature Box for Official PV ─────────────────────────── */}
      <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-slate-300 text-xs">
        <div>
          <p className="font-bold">L&apos;Enseignant Titulaire :</p>
          <p className="text-slate-500 mt-1">Date et Signature :</p>
          <div className="h-20 border-b border-dashed border-slate-400 mt-2"></div>
        </div>
        <div className="text-right">
          <p className="font-bold">Visa de la Direction des Études :</p>
          <p className="text-slate-500 mt-1">Cachet officiel &amp; Approbation :</p>
          <div className="h-20 border-b border-dashed border-slate-400 mt-2"></div>
        </div>
      </div>

    </div>
  );
}
