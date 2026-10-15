"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  Calendar,
  User,
  School,
  CheckCircle2,
  Loader2,
  XCircle,
  Printer,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportHistoryRow {
  id: string;
  date: string;
  type: string;
  user: string;
  schools: number;
  sections: string;
  status: "success" | "pending" | "error";
  fileName: string;
}

const initialHistory: ExportHistoryRow[] = [
  {
    id: "EXP-001",
    date: "28/06/2026 11:20",
    type: "Excel Clean Format",
    user: "Administrateur",
    schools: 806,
    sections: "Primaire, Préscolaire",
    status: "success",
    fileName: "Canevas_National_Clean_2026.xlsx",
  },
  {
    id: "EXP-002",
    date: "27/06/2026 15:45",
    type: "PDF Administratif",
    user: "Direction Directe",
    schools: 612,
    sections: "Public uniquement",
    status: "success",
    fileName: "Rapport_Administratif_IEFA_2026.pdf",
  },
  {
    id: "EXP-003",
    date: "26/06/2026 09:12",
    type: "Excel Original Format",
    user: "Administrateur",
    schools: 806,
    sections: "Toutes sections",
    status: "pending",
    fileName: "Canevas_Raw_Backup_2026.xlsx",
  },
  {
    id: "EXP-004",
    date: "24/06/2026 16:30",
    type: "JSON Backup",
    user: "Système (Auto)",
    schools: 806,
    sections: "Base de données brute",
    status: "error",
    fileName: "Database_Dump_Failed.json",
  },
];

export default function CanevasExportPage() {
  const [history, setHistory] = useState<ExportHistoryRow[]>(initialHistory);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const triggerExport = (typeId: string, typeName: string, format: string) => {
    setIsExporting(typeId);
    toast.info(`Préparation du fichier de type ${typeName}...`);

    setTimeout(() => {
      setIsExporting(null);
      
      const newExport: ExportHistoryRow = {
        id: `EXP-00${history.length + 1}`,
        date: new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        type: typeName,
        user: "Administrateur",
        schools: 806,
        sections: "Toutes sections",
        status: "success",
        fileName: `Canevas_Export_${Date.now()}.${format}`,
      };

      setHistory([newExport, ...history]);
      toast.success(`${typeName} exporté avec succès !`);

      generateAndDownloadFile(newExport.fileName, typeName);
    }, 1800);
  };

  const generateAndDownloadFile = (fileName: string, typeName: string) => {
    const format = fileName.split('.').pop() || "txt";
    let blob: Blob;

    if (format === "xlsx" || format === "xls") {
      const worksheet = XLSX.utils.json_to_sheet([
        { "ID Export": fileName.split('_')[2]?.split('.')[0] || "1", "Nom du Document": typeName, "Date": new Date().toLocaleDateString(), "Structures Concernees": 806 }
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Export Info");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    } else if (format === "pdf") {
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 210 >>
stream
BT
/F1 16 Tf
70 780 Td
(Edut Pro - Canevas Export) Tj
ET
BT
/F1 12 Tf
70 740 Td
(Fichier: ${fileName}) Tj
ET
BT
/F2 11 Tf
70 715 Td
(Exportation: ${typeName}) Tj
ET
BT
/F2 10 Tf
70 680 Td
(Ce document PDF officiel a ete genere par la plateforme avec succes.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000059 00000 n 
0000000116 00000 n 
0000000282 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
498
%%EOF`;
      blob = new Blob([pdfContent], { type: "application/pdf" });
    } else if (format === "csv") {
      blob = new Blob([`ID,Type,Date,Ecoles\nEXP,${typeName},${new Date().toLocaleDateString()},806`], { type: "text/csv;charset=utf-8;" });
    } else if (format === "json") {
      blob = new Blob([JSON.stringify({ id: "EXP", type: typeName, date: new Date().toLocaleDateString(), schools: 806 }, null, 2)], { type: "application/json" });
    } else {
      blob = new Blob([`Type: ${typeName}\nFichier: ${fileName}`], { type: "text/plain" });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHistoryFile = (fileName: string, typeName: string) => {
    toast.success(`Téléchargement de ${fileName}...`);
    generateAndDownloadFile(fileName, typeName);
  };

  const deleteHistory = (id: string) => {
    if (confirm("Voulez-vous supprimer cette ligne de l'historique ?")) {
      setHistory(history.filter(h => h.id !== id));
      toast.success("Enregistrement historique supprimé.");
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0 print:text-black">
      
      {/* ─── OFFICIAL PRINT HEADER ─── */}
      <div className="hidden print:block w-full border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-start text-xs font-bold uppercase">
          <div className="text-center space-y-1">
            <p>République du Niger</p>
            <p>Ministère de l'Éducation Nationale</p>
            <p>Secrétariat Général</p>
            <p>Direction des Statistiques</p>
          </div>
          <div className="text-center space-y-1">
            <p>Année Scolaire: 2025 - 2026</p>
            <p>Type de document: Historique des Exportations</p>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <h1 className="text-2xl font-black uppercase tracking-wide decoration-double underline decoration-1">
            Registre d'Exportation des Données
          </h1>
          <p className="text-sm font-bold text-slate-700 mt-2">Historique centralisé des exports canevas</p>
        </div>
      </div>

      {/* ─── WEB HEADER ─── */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Download size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Export des Canevas</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Exportez vos données brutes ou propres dans divers formats</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
              <Printer size={15} /> Imprimer registre
            </button>
          </div>
        </div>
      </header>

      {/* ─── EXPORT OPTIONS CARDS ─── */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 print:hidden">
        {[
          {
            id: "excel_raw",
            name: "Excel Format Original",
            desc: "Format identique au canevas brut importé, fiches conservées.",
            icon: FileSpreadsheet,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            format: "xlsx",
          },
          {
            id: "excel_clean",
            name: "Excel Tableau Propre",
            desc: "Tableau plat, structuré, prêt pour traitement informatique.",
            icon: FileSpreadsheet,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            format: "xlsx",
          },
          {
            id: "pdf_admin",
            name: "PDF Administratif",
            desc: "Rapport officiel mis en page sous format A4 normalisé.",
            icon: FileText,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "border-rose-100",
            format: "pdf",
          },
          {
            id: "csv_flat",
            name: "Format CSV",
            desc: "Fichier délimité par des virgules pour import de bases de données.",
            icon: Download,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            format: "csv",
          },
          {
            id: "json_dump",
            name: "Format JSON Backup",
            desc: "Export complet structuré de l'arbre de données canevas.",
            icon: FileJson,
            color: "text-violet-600",
            bg: "bg-violet-50",
            border: "border-violet-100",
            format: "json",
          },
        ].map((card) => {
          const Icon = card.icon;
          const loading = isExporting === card.id;
          return (
            <div 
              key={card.id} 
              className={cn(
                "rounded-[26px] border bg-white p-5 shadow-sm transition hover:shadow-lg flex flex-col justify-between min-h-[220px]",
                card.border
              )}
            >
              <div>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", card.bg, card.color)}>
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-sm font-black text-slate-900 leading-snug">{card.name}</h3>
                <p className="mt-2 text-xs font-semibold text-slate-400 leading-normal">{card.desc}</p>
              </div>

              <button 
                onClick={() => triggerExport(card.id, card.name, card.format)}
                disabled={isExporting !== null}
                className={cn(
                  "mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-40",
                  card.bg, card.color
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    Générer <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </section>

      {/* ─── HISTORICAL EXPORTS TABLE ─── */}
      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h2 className="text-lg font-black text-slate-950">Historique des exportations</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Registre et téléchargement de toutes les sauvegardes exportées</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Info size={14} className="text-indigo-600" />
            <span>Fichiers conservés pendant 30 jours</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm print:border print:border-slate-300">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-black">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Date export</th>
                <th className="px-5 py-4">Type export</th>
                <th className="px-5 py-4">Utilisateur</th>
                <th className="px-5 py-4">Nombre d'écoles</th>
                <th className="px-5 py-4">Sections incluses</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {history.map((row) => (
                <tr key={row.id} className="text-sm font-bold text-slate-700 hover:bg-slate-50/40 transition-colors print:text-black">
                  <td className="px-5 py-4 text-indigo-600 font-black">{row.id}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-normal print:text-black">
                      <Calendar size={13} className="print:hidden" /> {row.date}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-950 font-black">{row.type}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-normal print:text-black">
                      <User size={13} className="print:hidden" /> {row.user}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-900 font-black">
                    <span className="flex items-center gap-1.5">
                      <School size={13} className="text-slate-400 print:hidden" /> {row.schools}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-500 print:text-black">{row.sections}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      row.status === "success" && "bg-emerald-50 border-emerald-100 text-emerald-700",
                      row.status === "pending" && "bg-amber-50 border-amber-100 text-amber-700",
                      row.status === "error" && "bg-rose-50 border-rose-100 text-rose-700"
                    )}>
                      {row.status === "success" && <CheckCircle2 size={10} className="print:hidden" />}
                      {row.status === "pending" && <Loader2 size={10} className="animate-spin print:hidden" />}
                      {row.status === "error" && <XCircle size={10} className="print:hidden" />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 print:hidden">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadHistoryFile(row.fileName, row.type)}
                        disabled={row.status !== "success"}
                        title="Télécharger"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => deleteHistory(row.id)}
                        title="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── PRINT FOOTER & SIGNATURES ─── */}
      <div className="hidden print:block w-full mt-24 pt-8 border-t border-dashed border-slate-400">
        <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold">
          <div>
            <p className="underline mb-12">Signature de l'Agent d'Extraction</p>
            <div className="h-20 w-44 border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature</div>
          </div>
          <div>
            <p className="underline mb-12">Cachet Administratif</p>
            <div className="h-20 w-44 border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Cachet & Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}
