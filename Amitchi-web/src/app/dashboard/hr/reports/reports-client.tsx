"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BarChart3, Calendar, Search, Printer, ChevronLeft, ChevronRight,
  TrendingUp, BookOpen, Clock, Users, Eye, ClipboardCheck, ArrowUpRight, ArrowLeft, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportsClientProps {
  teachers: any[];
  globalStats: {
    totalTeachers: number;
    totalScheduled: number;
    totalAttended: number;
    totalAbsent: number;
    overallRate: number;
  };
  filterType: "day" | "week" | "month" | "year";
  date: string;
}

export default function ReportsClient({
  teachers,
  globalStats,
  filterType,
  date,
}: ReportsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleDateChange = (newDate: string) => {
    router.push(`?date=${newDate}&filter=${filterType}`);
  };

  const handleFilterChange = (newFilter: "day" | "week" | "month" | "year") => {
    router.push(`?date=${date}&filter=${newFilter}`);
  };

  const shiftDate = (amount: number) => {
    const d = new Date(date);
    if (filterType === "day") {
      d.setDate(d.getDate() + amount);
    } else if (filterType === "week") {
      d.setDate(d.getDate() + amount * 7);
    } else if (filterType === "month") {
      d.setMonth(d.getMonth() + amount);
    } else {
      d.setFullYear(d.getFullYear() + amount);
    }
    handleDateChange(d.toISOString().split("T")[0]);
  };

  const filteredTeachers = teachers.filter((t) =>
    t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.departement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportPDF = () => {
    try {
      toast.success("Génération du rapport PDF officiel...");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header block
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("RESSOURCES HUMAINES & PAYROLL", 15, 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT DE PERFORMANCE ET D'ASSIDUITÉ", 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Période : ${getFilterLabel()}`, 15, 29);
      doc.text("Année scolaire : 2025 - 2026", 15, 34);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS DOCUMENT", pageWidth - 80, 17);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'édition : ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 80, 22);
      doc.text("Édité par : Admin Super", pageWidth - 80, 27);
      doc.text("Réf Rapport : RPT-HR-2026-0001", pageWidth - 80, 32);

      // KPI boxes
      let currentY = 52;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("RÉSUMÉ DES INDICATEURS CLÉS", 10, currentY);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const kpiItems = [
        { label: "Enseignants Actifs", value: globalStats.totalTeachers },
        { label: "Heures Programmées", value: `${globalStats.totalScheduled}h` },
        { label: "Heures Assurées", value: `${globalStats.totalAttended}h` },
        { label: "Taux de Présence", value: `${globalStats.overallRate}%` }
      ];

      const boxWidth = (pageWidth - 20 - 12) / 4;
      kpiItems.forEach((kpi, idx) => {
        const startX = 10 + idx * (boxWidth + 4);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.rect(startX, currentY, boxWidth, 20, "DF");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label.toUpperCase(), startX + 3, currentY + 5);

        doc.setFontSize(12);
        doc.setTextColor(37, 99, 235);
        doc.text(String(kpi.value), startX + 3, currentY + 12);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Données RH validées", startX + 3, currentY + 17);
      });

      currentY += 26;

      // Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("SUIVI DÉTAILLÉ DE L'ASSIDUITÉ", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 6;

      const tableHeaders = ["N°", "Code ID", "Enseignant", "Département", "Heures Programmées", "Heures Assurées", "Absences", "Taux de Présence"];
      const tableBody = filteredTeachers.map((t, idx) => [
        idx + 1,
        t.empId,
        t.nom,
        t.departement,
        `${t.scheduled}h`,
        `${t.attended}h`,
        `${t.absent}h`,
        `${t.rate}%`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85]
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("Edut Pro - Gestion Scolaire", 10, pageHeight - 8);
          doc.text("CONFIDENTIEL - Suivi d'assiduité du personnel", pageWidth / 2 - 35, pageHeight - 8);
          doc.text(`Page ${pageCount}`, pageWidth - 20, pageHeight - 8);
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // Signatures
      if (currentY + 30 > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(10, currentY, pageWidth - 10, currentY);
      currentY += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CONTRÔLE & SIGNATURES", 10, currentY);
      currentY += 8;

      const columnWidth = (pageWidth - 20) / 3;

      doc.text("LE CLIENT (Inspecteur / IEFA)", 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY + 3, columnWidth - 10, 16, "S");

      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.rect(columnWidth + 15, currentY + 3, columnWidth - 10, 16, "DF");
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text("SYSTEME DE GESTION", columnWidth + 20, currentY + 9);
      doc.text("EDUT PRO SCOLAIRE", columnWidth + 22, currentY + 13);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("LA DIRECTION GENERALE", columnWidth * 2 + 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(columnWidth * 2 + 15, currentY + 3, columnWidth - 10, 16, "S");

      doc.save(`Rapport_RH_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    }
  };

  const getFilterLabel = () => {
    const d = new Date(date);
    if (filterType === "day") {
      return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (filterType === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `Semaine du ${mon.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sun.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (filterType === "month") {
      return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    return `Année Académique ${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 lg:p-10 space-y-8 print:p-0 print:bg-white animate-in fade-in duration-500">
      {/* Print-only layout stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape !important;
            margin: 10mm !important;
          }
          nav, aside, header, footer, button, .no-print, input, select, .breadcrumbs {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 20px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="space-y-8 print:hidden">
        {/* Header (Hidden in Print) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-[#131622]/90 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <Link 
            href="/dashboard/hr" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2 block"
          >
            <ArrowLeft size={14} /> Retour à l'Annuaire
          </Link>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Centre de Rapports (RH)</h1>
            <span className="text-lg font-bold text-slate-400 font-arabic">مركز التقارير</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Vue d'ensemble de l'assiduité, présence et heures de cours assurées par vos enseignants.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hr/attendance/qrcodes"
            className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 shadow-sm text-sm transition-all"
          >
            <Printer size={16} />
            Gérer les QR Codes
          </Link>
          <button
            onClick={handleExportPDF}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none hover:shadow-indigo-200 transition-all text-sm"
          >
            <BarChart3 size={16} /> Exporter le Rapport
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Enseignants Actifs", value: globalStats.totalTeachers, color: "text-slate-700 dark:text-slate-200", bg: "bg-slate-50 dark:bg-slate-900", desc: "Effectif total" },
          { label: "Séances Programmées", value: globalStats.totalScheduled, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/50", desc: "Total heures" },
          { label: "Séances Assurées", value: globalStats.totalAttended, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50", desc: "Professeur présent" },
          { label: "Séances Absentes", value: globalStats.totalAbsent, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/50", desc: "Professeur absent" },
          { label: "Assiduité Globale", value: `${globalStats.overallRate}%`, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50/50 dark:bg-indigo-950/40", desc: "Taux moyen", isRate: true },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-[#131622]/90 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest leading-none">{s.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-3xl font-black leading-tight", s.color)}>{s.value}</span>
            </div>
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-none no-print">{s.desc}</span>
          </div>
        ))}
      </div>

      {/* Filters (Hidden in Print) */}
      <div className="bg-white dark:bg-[#131622]/90 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        {/* Filter Selection */}
        <div className="flex bg-slate-100/75 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800 w-full lg:w-auto h-12">
          {[
            { val: "day", label: "Jour" },
            { val: "week", label: "Semaine" },
            { val: "month", label: "Mois" },
            { val: "year", label: "Année" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange(tab.val as any)}
              className={cn(
                "flex-1 lg:flex-none px-6 h-full rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                filterType === tab.val
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {getFilterLabel()}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          
          <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) handleDateChange(e.target.value);
              }}
              className="outline-none text-xs font-bold text-slate-600 dark:text-slate-200 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-[#131622]/90 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden print-area">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
          <div className="relative w-full md:w-[380px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              placeholder="Rechercher par enseignant ou département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-11 bg-slate-50/50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-400">
            Affichage de {filteredTeachers.length} sur {teachers.length} enseignants
          </div>
        </div>

        <table className="w-full text-left border-collapse print-table">
          <thead>
            <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest w-1/4">
                Enseignant <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">الأستاذ</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                Département <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">القسم</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Heures Prog. <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">المبرمجة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Heures Assurées <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">المحاضرة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Absences <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">الغياب</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Taux de Présence <span className="text-slate-300 dark:text-slate-600 ml-1 font-arabic">معدل الحضور</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-right no-print">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 font-bold flex items-center justify-center text-sm uppercase shrink-0">
                        {t.nom.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">{t.nom}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-0.5">ID: {t.empId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2.5 py-1 bg-indigo-50/60 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-black uppercase tracking-wider rounded-xl">
                      {t.departement}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t.scheduled}h
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t.attended}h
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                    {t.absent}h
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-black",
                        t.rate >= 90 ? "text-emerald-600 dark:text-emerald-400" : t.rate >= 75 ? "text-amber-500 dark:text-amber-400" : "text-rose-500 dark:text-rose-400"
                      )}>
                        {t.rate}%
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden no-print">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            t.rate >= 90 ? "bg-emerald-500" : t.rate >= 75 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${t.rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right no-print">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/hr/attendance/teacher/${t.id}?date=${date}&filter=${filterType}`}
                        className="h-8 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={12} />
                        Détails
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Users size={64} />
                    <p className="text-lg font-bold">Aucun enseignant trouvé</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      </div>

      {/* ─── PRINT LAYOUT (Visible only on print) ─── */}
      <div className="hidden print:block bg-white text-black font-sans w-full space-y-8">
        
        {/* PAGE 1: RÉSUMÉ GÉNÉRAL */}
        <div className="min-h-screen flex flex-col justify-between py-10 px-8 border-b-2 border-slate-200" style={{ pageBreakAfter: "always" }}>
          <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                  EP
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">RESSOURCES HUMAINES & PAYROLL</p>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">RAPPORT D'ASSIDUITÉ RH</h1>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Suivi de présence et performance du personnel</p>
                </div>
              </div>
              
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 min-w-[280px] space-y-1 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date d'édition :</span>
                  <span className="text-slate-800">{new Date().toLocaleDateString("fr-FR")} {new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Année scolaire :</span>
                  <span className="text-slate-800">2025 - 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Période :</span>
                  <span className="text-slate-800">{getFilterLabel()}</span>
                </div>
              </div>
            </div>

            {/* General Summary */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Résumé Général
              </h3>
              <div className="grid gap-4 grid-cols-4">
                {[
                  { label: "Enseignants Actifs", value: globalStats.totalTeachers },
                  { label: "Heures Programmées", value: `${globalStats.totalScheduled}h` },
                  { label: "Heures Assurées", value: `${globalStats.totalAttended}h` },
                  { label: "Assiduité Globale", value: `${globalStats.overallRate}%` },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{item.label}</span>
                      <span className="text-2xl font-black text-slate-950 mt-1 block">{item.value}</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Performance validée</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 flex justify-between items-center gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                  <Info size={13} /> À propos de ce rapport
                </p>
                <p className="text-xs font-bold leading-relaxed text-slate-500 max-w-2xl">
                  Ce rapport RH synthétise l'assiduité, les absences et les heures effectives de cours assurées par le personnel enseignant de l'établissement.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400">VÉRIFICATION D'AUTHENTICITÉ</p>
                  <p className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">RPT-HR-2026-0001</p>
                </div>
                <div className="w-14 h-14 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center text-[8px] font-mono text-slate-400 select-none">
                  [QR CODE]
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Stamp */}
          <div className="space-y-6 pt-10 border-t border-slate-100 mt-auto">
            <div className="grid grid-cols-3 gap-6 items-center text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client</p>
                <div className="mt-2 h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                  <span className="text-[8px] text-indigo-500 mt-1">★</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction</p>
                <div className="mt-2 h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
            </div>
            
            {/* Footer Page 1 */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-4 mt-6">
              <span>Edut Pro - Gestion Scolaire</span>
              <span className="text-indigo-600 italic">Merci pour votre confiance</span>
              <span>Page 1 / 2</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: TABLEAU D'ASSIDUITÉ */}
        <div className="min-h-screen flex flex-col justify-between py-10 px-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                  EP
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">RESSOURCES HUMAINES & PAYROLL</p>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">RAPPORT D'ASSIDUITÉ RH</h1>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Suivi de présence et performance du personnel</p>
                </div>
              </div>
              
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 min-w-[280px] space-y-1 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date d'édition :</span>
                  <span className="text-slate-800">{new Date().toLocaleDateString("fr-FR")} {new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Année scolaire :</span>
                  <span className="text-slate-800">2025 - 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Période :</span>
                  <span className="text-slate-800">{getFilterLabel()}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Tableau d'Assiduité des Enseignants
              </h3>
              
              <div className="overflow-x-auto rounded-[24px] border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-indigo-600 font-black uppercase tracking-widest text-white">
                      <th className="px-4 py-3">N°</th>
                      <th className="px-4 py-3">ID Enseignant</th>
                      <th className="px-4 py-3">Nom complet</th>
                      <th className="px-4 py-3">Département</th>
                      <th className="px-4 py-3 text-center">Heures Programmées</th>
                      <th className="px-4 py-3 text-center">Heures Assurées</th>
                      <th className="px-4 py-3 text-center">Absences</th>
                      <th className="px-4 py-3 text-center">Taux Présence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {filteredTeachers.map((t, index) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/30">
                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-mono font-black">{t.empId}</td>
                        <td className="px-4 py-3 text-slate-900 uppercase">{t.nom}</td>
                        <td className="px-4 py-3">{t.departement}</td>
                        <td className="px-4 py-3 text-center">{t.scheduled}h</td>
                        <td className="px-4 py-3 text-center text-emerald-600">{t.attended}h</td>
                        <td className="px-4 py-3 text-center text-rose-600">{t.absent}h</td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600">{t.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recap Summary */}
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/50 p-4 flex gap-6 items-center justify-between text-[11px] font-black text-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Récapitulatif</span>
                <div className="flex gap-6">
                  <span>Enseignants : <span className="text-slate-900">{filteredTeachers.length}</span></span>
                  <span>Total Heures Prog : <span className="text-slate-900">{globalStats.totalScheduled}h</span></span>
                  <span>Total Heures Assurées : <span className="text-slate-900">{globalStats.totalAttended}h</span></span>
                  <span>Taux Global : <span className="text-slate-900">{globalStats.overallRate}%</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Stamp */}
          <div className="space-y-6 pt-10 border-t border-slate-100 mt-auto">
            <div className="grid grid-cols-3 gap-6 items-center text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client</p>
                <div className="mt-2 h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                  <span className="text-[8px] text-indigo-500 mt-1">★</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction</p>
                <div className="mt-2 h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
            </div>
            
            {/* Footer Page 2 */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-4 mt-6">
              <span>Edut Pro - Gestion Scolaire</span>
              <span className="text-indigo-600 italic">Merci pour votre confiance</span>
              <span>Page 2 / 2</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
