"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  Droplets,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  GraduationCap,
  Info,
  Lightbulb,
  Plus,
  Printer,
  ShieldCheck,
  School,
  Upload,
  Users,
  UserRoundCheck,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCanevasStats, getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";

const ICON_MAP: Record<string, any> = {
  School,
  Building2,
  GraduationCap,
  Users,
  UserRoundCheck,
  BarChart3,
  Droplets,
  Lightbulb,
  AlertTriangle
};

interface KpiData {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
}

const academicYearsData: Record<string, { kpis: KpiData[]; publicValue: number; privateValue: number }> = {
  "2025 - 2026": {
    publicValue: 612,
    privateValue: 194,
    kpis: [
      { label: "Établissements", value: "806", sub: "Toutes structures", icon: School, color: "indigo" },
      { label: "Écoles publiques", value: "612", sub: "Secteur public", icon: Building2, color: "emerald" },
      { label: "Écoles privées", value: "194", sub: "Secteur privé", icon: Building2, color: "violet" },
      { label: "Total élèves", value: "142 416", sub: "Primaire + préscolaire", icon: GraduationCap, color: "blue" },
      { label: "Total filles", value: "70 258", sub: "49,3% des effectifs", icon: Users, color: "pink" },
      { label: "Total garçons", value: "72 158", sub: "50,7% des effectifs", icon: Users, color: "cyan" },
      { label: "Enseignants", value: "4 382", sub: "Tous statuts", icon: UserRoundCheck, color: "amber" },
      { label: "Salles de classe", value: "3 946", sub: "Toutes catégories", icon: Building2, color: "slate" },
      { label: "Salles utilisées", value: "3 621", sub: "91,8% exploitées", icon: BarChart3, color: "emerald" },
      { label: "Sans point d’eau", value: "83", sub: "Alerte infrastructure", icon: Droplets, color: "rose" },
      { label: "Sans électricité", value: "126", sub: "Besoin prioritaire", icon: Lightbulb, color: "orange" },
      { label: "Besoins critiques", value: "214", sub: "À traiter", icon: AlertTriangle, color: "rose" },
      { label: "Complétude", value: "87%", sub: "Données validées", icon: BarChart3, color: "indigo" },
    ]
  },
  "2024 - 2025": {
    publicValue: 590,
    privateValue: 182,
    kpis: [
      { label: "Établissements", value: "772", sub: "Toutes structures", icon: School, color: "indigo" },
      { label: "Écoles publiques", value: "590", sub: "Secteur public", icon: Building2, color: "emerald" },
      { label: "Écoles privées", value: "182", sub: "Secteur privé", icon: Building2, color: "violet" },
      { label: "Total élèves", value: "135 120", sub: "Primaire + préscolaire", icon: GraduationCap, color: "blue" },
      { label: "Total filles", value: "66 210", sub: "49,0% des effectifs", icon: Users, color: "pink" },
      { label: "Total garçons", value: "68 910", sub: "51,0% des effectifs", icon: Users, color: "cyan" },
      { label: "Enseignants", value: "4 120", sub: "Tous statuts", icon: UserRoundCheck, color: "amber" },
      { label: "Salles de classe", value: "3 810", sub: "Toutes catégories", icon: Building2, color: "slate" },
      { label: "Salles utilisées", value: "3 502", sub: "91,9% exploitées", icon: BarChart3, color: "emerald" },
      { label: "Sans point d’eau", value: "95", sub: "Alerte infrastructure", icon: Droplets, color: "rose" },
      { label: "Sans électricité", value: "140", sub: "Besoin prioritaire", icon: Lightbulb, color: "orange" },
      { label: "Besoins critiques", value: "245", sub: "À traiter", icon: AlertTriangle, color: "rose" },
      { label: "Complétude", value: "100%", sub: "Données validées", icon: BarChart3, color: "indigo" },
    ]
  }
};

const communeData = [
  { name: "NY I", value: 236 },
  { name: "NY II", value: 158 },
  { name: "NY III", value: 118 },
  { name: "NY IV", value: 185 },
  { name: "NY V", value: 109 },
];

const levels = [
  { name: "CI", total: 24645, girls: 11403 },
  { name: "CP", total: 26672, girls: 11740 },
  { name: "CE1", total: 21319, girls: 10846 },
  { name: "CE2", total: 20587, girls: 10293 },
  { name: "CM1", total: 19036, girls: 9893 },
  { name: "CM2", total: 17157, girls: 9083 },
];

const alerts = [
  { title: "Écoles sans point d’eau", count: 83, level: "Critique", color: "rose" },
  { title: "Écoles sans électricité", count: 126, level: "Élevé", color: "amber" },
  { title: "Données incomplètes", count: 57, level: "À corriger", color: "indigo" },
  { title: "Besoins critiques", count: 214, level: "Prioritaire", color: "rose" },
  { title: "Incohérences effectifs", count: 19, level: "Contrôle", color: "orange" },
];

function getGradient(color: string) {
  const map: Record<string, string> = {
    indigo: "from-indigo-500 via-purple-500 to-indigo-600",
    emerald: "from-emerald-400 via-teal-500 to-emerald-600",
    violet: "from-violet-500 via-purple-500 to-fuchsia-600",
    blue: "from-blue-500 via-indigo-500 to-cyan-500",
    pink: "from-pink-500 via-rose-400 to-purple-500",
    cyan: "from-cyan-400 via-blue-500 to-teal-500",
    amber: "from-amber-400 via-orange-500 to-yellow-500",
    slate: "from-slate-400 via-slate-500 to-zinc-600",
    rose: "from-rose-500 via-pink-500 to-red-600",
    orange: "from-orange-500 via-amber-500 to-rose-500",
  };
  return map[color] || map.indigo;
}

function colorClasses(color: string) {
  const map: Record<string, string> = {
    indigo: "border-indigo-200/60 bg-indigo-50/80 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-400",
    emerald: "border-emerald-200/60 bg-emerald-50/80 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400",
    violet: "border-violet-200/60 bg-violet-50/80 text-violet-600 dark:border-violet-500/30 dark:bg-violet-950/60 dark:text-violet-400",
    blue: "border-blue-200/60 bg-blue-50/80 text-blue-600 dark:border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-400",
    pink: "border-pink-200/60 bg-pink-50/80 text-pink-600 dark:border-pink-500/30 dark:bg-pink-950/60 dark:text-pink-400",
    cyan: "border-cyan-200/60 bg-cyan-50/80 text-cyan-600 dark:border-cyan-500/30 dark:bg-cyan-950/60 dark:text-cyan-400",
    amber: "border-amber-200/60 bg-amber-50/80 text-amber-600 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-400",
    slate: "border-slate-200/60 bg-slate-50/80 text-slate-600 dark:border-slate-700/40 dark:bg-slate-900/60 dark:text-slate-400",
    rose: "border-rose-200/60 bg-rose-50/80 text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/60 dark:text-rose-400",
    orange: "border-orange-200/60 bg-orange-50/80 text-orange-600 dark:border-orange-500/30 dark:bg-orange-950/60 dark:text-orange-400",
  };
  return map[color] || map.slate;
}

function BarMiniChart() {
  const max = Math.max(...communeData.map((d) => d.value));
  return (
    <div className="space-y-3">
      {communeData.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">{item.name}</span>
            <span className="text-xs font-black text-indigo-600">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ publicValue, privateValue, labelWord = "écoles" }: { publicValue: number; privateValue: number; labelWord?: string }) {
  const total = publicValue + privateValue;
  const publicPct = total ? publicValue / total : 0;
  const circle = 2 * Math.PI * 42;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0">
        <circle cx="55" cy="55" r="42" fill="none" stroke="#f1f5f9" strokeWidth="16" />
        <circle cx="55" cy="55" r="42" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${circle * publicPct} ${circle}`} strokeDashoffset={circle / 4} strokeLinecap="round" />
        <circle cx="55" cy="55" r="42" fill="none" stroke="#7c3aed" strokeWidth="16" strokeDasharray={`${circle * (1 - publicPct)} ${circle}`} strokeDashoffset={circle / 4 - circle * publicPct} strokeLinecap="round" />
        <text x="55" y="52" textAnchor="middle" className="fill-slate-900 text-lg font-black">{total.toLocaleString()}</text>
        <text x="55" y="67" textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">{labelWord}</text>
      </svg>
      <div className="flex-1 space-y-3">
        <LegendDot color="bg-emerald-500" label="Public / G." value={publicValue} />
        <LegendDot color="bg-violet-500" label="Privé / F." value={privateValue} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-xs font-black text-slate-600">{label}</span>
      <span className="ml-auto text-xs font-black text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}

function LevelChart({ levelsData }: { levelsData?: Array<{ name: string; total: number; girls: number }> }) {
  const data = levelsData || levels;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="grid h-full grid-cols-6 items-end gap-3 pt-6">
      {data.map((level) => (
        <div key={level.name} className="flex h-64 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            <div className="w-5 rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(8, (level.total / max) * 100)}%` }} />
            <div className="w-5 rounded-t-lg bg-pink-400" style={{ height: `${Math.max(8, (level.girls / max) * 100)}%` }} />
          </div>
          <span className="text-xs font-black text-slate-600">{level.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function CanevasDashboardPage() {
  const [selectedYear, setSelectedYear] = useState("2025 - 2026");
  
  // Real database stats
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Unified references from DB
  const [canevasReferences, setCanevasReferences] = useState<{ cycle: any[]; commune: any[]; type: any[] }>({ cycle: [], commune: [], type: [] });
  const [educationalLevels, setEducationalLevels] = useState<any[]>([]);

  // Derived unified lists
  const DEFAULT_CYCLES = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
  const DEFAULT_COMMUNES = ["Niamey I", "Niamey II", "Niamey III", "Niamey IV", "Niamey V"];

  const cyclesList = Array.from(new Set([
    ...DEFAULT_CYCLES,
    ...(educationalLevels || []).map((l: any) => l.levelName || l.name || l).filter(Boolean),
    ...(canevasReferences.cycle || []).map((c: any) => c.value || c).filter(Boolean),
  ]));

  const communesList = Array.from(new Set([
    ...DEFAULT_COMMUNES,
    ...(canevasReferences.commune || []).map((c: any) => c.value || c).filter(Boolean),
  ]));

  // Modal for new canevas
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCycle, setNewCycle] = useState("Primaire");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    async function loadAll() {
      try {
        const [statsRes, refRes, levelsRes] = await Promise.all([
          getCanevasStats().catch(() => null),
          getCanevasReferenceLists().catch(() => null),
          getEducationalLevels(true).catch(() => null),
        ]);
        if (statsRes?.data) setStats(statsRes.data);
        if (refRes) {
          const d = (refRes as any)?.data || refRes;
          if (d) setCanevasReferences({ cycle: d.cycle || [], commune: d.commune || [], type: d.type || [] });
        }
        if (levelsRes) {
          const d = (levelsRes as any)?.data || levelsRes;
          if (Array.isArray(d)) setEducationalLevels(d);
        }
      } catch (e) {
        console.error("Failed to load Canevas data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const activeData = stats || academicYearsData[selectedYear] || academicYearsData["2025 - 2026"];

  const handleExportPdf = () => {
    try {
      toast.success("Génération du rapport PDF du Tableau de bord...");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const editionDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

      // Page 1: Header
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 32, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 32, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("GESTION DES CANEVAS SCOLAIRES", 15, 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("TABLEAU DE BORD CENTRAL", 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Année scolaire : ${selectedYear}`, 15, 29);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS DOCUMENT", pageWidth - 80, 17);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'édition : ${editionDate}`, pageWidth - 80, 22);
      doc.text("Édité par : Admin Super", pageWidth - 80, 27);
      doc.text("Réf : RPT-CNV-2026-0001", pageWidth - 80, 31);

      let currentY = 48;

      // KPIs Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("SYNTHÈSE DES INDICATEURS CLÉS (KPIS)", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const kpisList = activeData.kpis || [];
      const kpiHeaders = ["Indicateur", "Valeur", "Détail", "Secteur / Cible"];
      const kpiRows = kpisList.map((k: any) => [k.label, String(k.value), k.sub || "-", "Toutes structures"]);

      autoTable(doc, {
        startY: currentY,
        head: [kpiHeaders],
        body: kpiRows,
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
        margin: { left: 10, right: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Signatures
      if (currentY + 25 > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(10, currentY, pageWidth - 10, currentY);
      currentY += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CONTRÔLE & SIGNATURES", 10, currentY);
      currentY += 6;

      let colWidth = (pageWidth - 20) / 3;
      doc.text("LE CLIENT (Inspecteur / IEFA)", 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY + 2, colWidth - 10, 14, "S");

      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.rect(colWidth + 15, currentY + 2, colWidth - 10, 14, "DF");
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text("EDUT PRO SCOLAIRE", colWidth + 22, currentY + 8);
      doc.text("Rapport Certifié", colWidth + 24, currentY + 12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("LA DIRECTION GENERALE", colWidth * 2 + 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(colWidth * 2 + 15, currentY + 2, colWidth - 10, 14, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Edut Pro - Gestion des Canevas Scolaires", 10, pageHeight - 6);
      doc.text("Page 1 / 1", pageWidth - 20, pageHeight - 6);

      doc.save(`Tableau_De_Bord_Canevas_${Date.now()}.pdf`);
      toast.success("Rapport PDF du Tableau de bord exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  const handleCreateCanevas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    toast.success(`Canevas "${newName}" (${newCycle}) créé avec succès !`);
    setIsNewOpen(false);
    setNewName("");
    setNewDesc("");
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            overflow: visible !important;
            box-shadow: none !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
      
      <header className="rounded-[30px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#121420]/90 backdrop-blur-xl p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Tableau de bord</h1>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">Vue globale des données importées ou saisies</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="2025 - 2026">Année scolaire 2025 - 2026</option>
              <option value="2024 - 2025">Année scolaire 2024 - 2025</option>
            </select>
            <Link href="/dashboard/canevas/import" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors">
              <Upload size={16} /> Importer Excel
            </Link>
            <Link href="/dashboard/canevas/etablissements" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
              <School size={16} /> Établissements
            </Link>
            <Link href="/dashboard/canevas/reporting" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222638] active:scale-95 transition-all">
              <BarChart3 size={16} /> Reporting
            </Link>
            <Link href="/dashboard/canevas/export" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222638] active:scale-95 transition-all">
              <Download size={16} /> Exporter
            </Link>
            <button 
              onClick={handleExportPdf}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222638] active:scale-95 transition-all cursor-pointer"
            >
              <FileText size={16} className="text-rose-500" /> PDF
            </button>
            <button 
              onClick={() => setIsNewOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222638] active:scale-95 transition-all"
            >
              <Plus size={16} /> Nouveau Canevas
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222638] active:scale-95 transition-all cursor-pointer">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {activeData.kpis.map((kpi: any) => {
          const Icon = typeof kpi.icon === "string" ? (ICON_MAP[kpi.icon] || School) : kpi.icon;
          return (
            <Link
              href={kpi.label.includes("tablissements") ? "/dashboard/canevas/etablissements" : "/dashboard/canevas"}
              key={kpi.label}
              className="group relative overflow-hidden rounded-[24px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50"
            >
              <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity", getGradient(kpi.color))} />
              <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-transform group-hover:scale-105", colorClasses(kpi.color))}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">{kpi.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{kpi.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{kpi.sub}</p>
            </Link>
          );
        })}
      </section>

      {/* Access links */}
      <section className="rounded-[30px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white">Accès rapide aux nouvelles interfaces</h2>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Fiche établissement, saisies détaillées, mapping Excel et contrôle qualité</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/canevas/etablissements" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20">
              <School size={16} /> Établissements
            </Link>
            <Link href="/dashboard/canevas/reporting" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              <BarChart3 size={16} /> Centre de Reporting
            </Link>
            <Link href="/dashboard/canevas/export" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
              <Download size={16} /> Exporter Canevas
            </Link>
            <Link href="/dashboard/canevas/import" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d2d] px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              <Upload size={16} /> Importer Excel
            </Link>
          </div>
        </div>
      </section>

      {/* Graphs and Alert Panels */}
      {(() => {
        const girlsVal = parseInt((activeData.kpis.find((k: any) => k.label.toLowerCase().includes("filles"))?.value || "70258").replace(/\s/g, ""), 10);
        const boysVal = parseInt((activeData.kpis.find((k: any) => k.label.toLowerCase().includes("garçons"))?.value || "72158").replace(/\s/g, ""), 10);
        const totalStudentsVal = parseInt((activeData.kpis.find((k: any) => k.label.toLowerCase().includes("élèves"))?.value || "142416").replace(/\s/g, ""), 10);

        return (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-3">
                <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Établissements par commune</h2>
                  <p className="mb-5 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Répartition géographique</p>
                  <BarMiniChart />
                </div>
                <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Public vs Privé</h2>
                  <p className="mb-4 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Répartition des statuts</p>
                  <Donut 
                    publicValue={activeData.publicSchools ?? activeData.publicValue} 
                    privateValue={activeData.privateSchools ?? activeData.privateValue} 
                  />
                </div>
                <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Filles / Garçons</h2>
                  <p className="mb-4 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Composition globale</p>
                  <Donut 
                    publicValue={boysVal} 
                    privateValue={girlsVal} 
                    labelWord="élèves" 
                  />
                </div>
              </div>
              <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">Effectifs par niveau</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Barres indigo: total, barres roses: filles</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-black text-slate-500 dark:text-slate-400">
                    <LegendDot color="bg-indigo-500" label="Total" value={totalStudentsVal} />
                    <LegendDot color="bg-pink-400" label="Filles" value={girlsVal} />
                  </div>
                </div>
                <LevelChart levelsData={activeData.levels} />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Besoins par type</h2>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Salles de classe", 74, "bg-rose-500"],
                      ["Tables bancs", 62, "bg-amber-500"],
                      ["Enseignants", 48, "bg-indigo-500"],
                      ["Armoires", 30, "bg-emerald-500"],
                    ].map(([label, value, color]) => (
                      <div key={String(label)}>
                        <div className="mb-1 flex justify-between text-xs font-black">
                          <span>{label}</span><span>{value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100"><div className={cn("h-2 rounded-full", String(color))} style={{ width: `${Number(value)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Infrastructures par état</h2>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Fonctionnelles", 78, "bg-emerald-500"],
                      ["À réparer", 14, "bg-amber-500"],
                      ["Critiques", 8, "bg-rose-500"],
                    ].map(([label, value, color]) => (
                      <div key={String(label)}>
                        <div className="mb-1 flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                          <span>{label}</span><span>{value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-2 rounded-full", String(color))} style={{ width: `${Number(value)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>


        <aside className="space-y-5">
          <div className="rounded-[26px] border border-slate-200/70 dark:border-slate-800/80 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Alertes</h2>
              <AlertTriangle className="text-amber-500" size={18} />
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-[#181b29]/80 p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", alert.color === "rose" && "bg-rose-500", alert.color === "amber" && "bg-amber-500", alert.color === "indigo" && "bg-indigo-500", alert.color === "orange" && "bg-orange-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{alert.title}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{alert.count} établissements concernés</p>
                    </div>
                    <span className="rounded-full bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-xs">{alert.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-indigo-100 dark:border-indigo-900/40 bg-white/95 dark:bg-[#131622]/90 backdrop-blur-xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Qualité des données</h2>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Complétude globale des canevas</p>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{selectedYear === "2024 - 2025" ? "100%" : "87%"}</span>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-400">Bon niveau</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500" style={{ width: selectedYear === "2024 - 2025" ? "100%" : "87%" }} />
            </div>
          </div>
        </aside>
      </section>
        );
      })()}

      {/* ─── MODAL: NEW CANEVAS TEMPLATE ─── */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setIsNewOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Nouveau Canevas</h3>
            
            <form onSubmit={handleCreateCanevas} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Désignation du canevas *</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Canevas Lycée 2025-2026" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Cycle scolaire</label>
                <select value={newCycle} onChange={e => setNewCycle(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                  {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Description / Notes</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Données d'infrastructure de Niamey" rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsNewOpen(false)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PRINT LAYOUT FOR TABLEAU DE BORD ─── */}
      <div className="hidden print:block bg-white text-black font-sans w-full p-0 m-0 space-y-6">
        
        {/* PAGE 1: SYNTHÈSE DES INDICATEURS */}
        <div className="flex flex-col justify-between py-4 px-2 space-y-6" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                  EP
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-600">GESTION DES CANEVAS SCOLAIRES</p>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">TABLEAU DE BORD CENTRAL</h1>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Synthèse globale des données enregistrées</p>
                </div>
              </div>
              
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-bold text-slate-700 shrink-0 w-auto space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Date d'édition :</span>
                  <span className="text-slate-800 font-black">{new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Année scolaire :</span>
                  <span className="text-slate-800 font-black">{selectedYear}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Édité par :</span>
                  <span className="text-slate-800 font-black">Admin Super</span>
                </div>
              </div>
            </div>

            {/* KPI Grid (13 Cards) */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Indicateurs Clés de Performance (KPIs)
              </h3>
              <div className="grid grid-cols-4 gap-2.5 w-full">
                {activeData.kpis.map((kpi: any, idx: number) => {
                  const Icon = typeof kpi.icon === "string" ? (ICON_MAP[kpi.icon] || School) : kpi.icon;
                  return (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-none">
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate">{kpi.label}</span>
                        <span className="text-lg font-black text-slate-950 block">{kpi.value}</span>
                        <span className="text-[8px] font-bold text-slate-500 block truncate">{kpi.sub}</span>
                      </div>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", colorClasses(kpi.color))}>
                        <Icon size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sectorial & Geographic Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-indigo-700">Répartition Sectorielle</h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase block font-black">Écoles Publiques</span>
                    <span className="text-lg font-black text-emerald-600">{activeData.publicSchools ?? activeData.publicValue ?? 612}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase block font-black">Écoles Privées</span>
                    <span className="text-lg font-black text-violet-600">{activeData.privateSchools ?? activeData.privateValue ?? 194}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-indigo-700">Répartition par Commune</h4>
                <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-bold">
                  {(communesList.length > 0 ? communesList : communeData.map(c => c.name)).slice(0, 10).map((name) => {
                    const found = communeData.find(c => c.name === name || name.includes(c.name.replace("NY ", "Niamey ")));
                    return (
                      <div key={name} className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-400 uppercase block font-black">{name.length > 8 ? name.substring(0, 8) + "…" : name}</span>
                        <span className="text-sm font-black text-indigo-600">{found?.value ?? (activeData?.communeStats?.[name] ?? "—")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex justify-between items-center gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                  <Info size={13} /> Certificat de Rapport Central
                </p>
                <p className="text-xs font-bold leading-relaxed text-slate-500 max-w-2xl">
                  Ce tableau de bord consolidé est généré automatiquement par le système Edut Pro à partir des données validées du canevas scolaire {selectedYear}.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400">VÉRIFICATION</p>
                  <p className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">RPT-CNV-2026-0001</p>
                </div>
                <div className="w-12 h-12 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center text-[7px] font-mono text-slate-400 select-none">
                  [QR CODE]
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Stamp */}
          <div className="space-y-4 pt-6 border-t border-slate-200 mt-auto">
            <div className="grid grid-cols-3 gap-6 items-center text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client</p>
                <div className="mt-2 h-16 w-36 border border-dashed border-slate-300 rounded-xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-1.5">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                  <span className="text-[6px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                  <span className="text-[6px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                  <span className="text-[7px] text-indigo-500 mt-0.5">★</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction</p>
                <div className="mt-2 h-16 w-36 border border-dashed border-slate-300 rounded-xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
            </div>
            
            {/* Footer Page 1 */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-3 mt-4">
              <span>Edut Pro - Tableau de bord Canevas</span>
              <span className="text-indigo-600 italic">Merci pour votre confiance</span>
              <span>Page 1 / 2</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: EFFECTIFS ET INFRASTRUCTURES */}
        <div className="flex flex-col justify-between py-4 px-2 space-y-6">
          <div className="space-y-6">
            {/* Header Page 2 */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                  EP
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-600">GESTION DES CANEVAS SCOLAIRES</p>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">DETAILS NIVEAUX & INFRASTRUCTURES</h1>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Ventilation des effectifs et analyse des besoins</p>
                </div>
              </div>
              
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-bold text-slate-700 shrink-0 w-auto space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Date d'édition :</span>
                  <span className="text-slate-800 font-black">{new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Année scolaire :</span>
                  <span className="text-slate-800 font-black">{selectedYear}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-normal">Édité par :</span>
                  <span className="text-slate-800 font-black">Admin Super</span>
                </div>
              </div>
            </div>

            {/* Table: Effectifs par Niveau */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Répartition des Effectifs par Niveau
              </h3>
              
              <div className="rounded-xl border border-slate-200 w-full overflow-visible">
                <table className="w-full border-collapse text-left text-xs table-fixed">
                  <thead>
                    <tr className="bg-indigo-600 font-black uppercase tracking-wider text-white text-[10px]">
                      <th className="px-3 py-2.5">Niveau</th>
                      <th className="px-3 py-2.5 text-right">Garçons</th>
                      <th className="px-3 py-2.5 text-right">Filles</th>
                      <th className="px-3 py-2.5 text-right">Total Élèves</th>
                      <th className="px-3 py-2.5 text-right">% Filles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {levels.map((lvl) => {
                      const boys = lvl.total - lvl.girls;
                      const pctF = ((lvl.girls / lvl.total) * 100).toFixed(1);
                      return (
                        <tr key={lvl.name} className="odd:bg-white even:bg-slate-50/60">
                          <td className="px-3 py-2 font-black text-indigo-700">{lvl.name}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">{boys.toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right font-semibold text-pink-600">{lvl.girls.toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right font-black text-slate-900">{lvl.total.toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-600">{pctF}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Besoins & State Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-rose-700">Besoins Prioritaires</h4>
                <div className="space-y-1.5 text-xs font-bold">
                  {[
                    ["Salles de classe", "74 % des besoins"],
                    ["Tables bancs", "62 % des besoins"],
                    ["Enseignants", "48 % des besoins"],
                    ["Armoires", "30 % des besoins"],
                  ].map(([label, sub]) => (
                    <div key={label} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-800 font-bold">{label}</span>
                      <span className="text-rose-600 font-black text-[11px]">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-emerald-700">État des Infrastructures</h4>
                <div className="space-y-1.5 text-xs font-bold">
                  {[
                    ["Salles Fonctionnelles", "78 % exploitées", "text-emerald-600"],
                    ["À Réparer", "14 % des salles", "text-amber-600"],
                    ["État Critique", "8 % des salles", "text-rose-600"],
                    ["Sans Électricité", "126 structures", "text-orange-600"],
                  ].map(([label, sub, col]) => (
                    <div key={label} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-800 font-bold">{label}</span>
                      <span className={cn("font-black text-[11px]", col)}>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Stamp */}
          <div className="space-y-4 pt-6 border-t border-slate-200 mt-auto">
            <div className="grid grid-cols-3 gap-6 items-center text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client</p>
                <div className="mt-2 h-16 w-36 border border-dashed border-slate-300 rounded-xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-1.5">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                  <span className="text-[6px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                  <span className="text-[6px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                  <span className="text-[7px] text-indigo-500 mt-0.5">★</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction</p>
                <div className="mt-2 h-16 w-36 border border-dashed border-slate-300 rounded-xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
              </div>
            </div>
            
            {/* Footer Page 2 */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-3 mt-4">
              <span>Edut Pro - Tableau de bord Canevas</span>
              <span className="text-indigo-600 italic">Merci pour votre confiance</span>
              <span>Page 2 / 2</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
