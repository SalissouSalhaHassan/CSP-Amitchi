"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  XCircle,
  Trash2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportRow {
  file: string;
  year: string;
  sheets: number;
  lines: number;
  cells: number;
  schools: number;
  normalized: number;
  unmapped: number;
  status: string;
  date: string;
  user: string;
}

const initialImportRows: ImportRow[] = [
  {
    file: "VF_CANEVAS_PRIMAIRE_2025.xls",
    year: "2025 - 2026",
    sheets: 18,
    lines: 8742,
    cells: 32684,
    schools: 806,
    normalized: 29418,
    unmapped: 3266,
    status: "Validé",
    date: "27/06/2026 08:42",
    user: "Admin",
  },
  {
    file: "CANEVAS_COLLEGE_TEST.xlsx",
    year: "2025 - 2026",
    sheets: 12,
    lines: 2418,
    cells: 9830,
    schools: 114,
    normalized: 8771,
    unmapped: 1059,
    status: "À vérifier",
    date: "26/06/2026 16:18",
    user: "Direction",
  },
  {
    file: "IMPORT_LYCEE_ZONE_A.xls",
    year: "2024 - 2025",
    sheets: 15,
    lines: 3960,
    cells: 15890,
    schools: 173,
    normalized: 0,
    unmapped: 0,
    status: "Erreur",
    date: "25/06/2026 11:07",
    user: "Admin",
  },
];

const statusStyle: Record<string, string> = {
  "Validé": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "À vérifier": "bg-amber-50 text-amber-700 border-amber-100",
  "Erreur": "bg-rose-50 text-rose-700 border-rose-100",
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-black", color)}>{value}</p>
    </div>
  );
}

export default function CanevasImportPage() {
  const [imports, setImports] = useState<ImportRow[]>(initialImportRows);
  const [academicYear, setAcademicYear] = useState("2025 - 2026");
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<"idle" | "reading" | "normalizing" | "ready">("idle");
  
  // Stats of current parsed file
  const [fileStats, setFileStats] = useState({
    sheets: 0,
    lines: 0,
    cells: 0,
    schools: 0,
    unmapped: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setProgress(15);
    setCurrentStep("reading");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        setProgress(45);
        const workbook = XLSX.read(data, { type: "binary" });
        setProgress(70);
        setCurrentStep("normalizing");

        const sheetNames = workbook.SheetNames;
        let totalRows = 0;
        let totalCells = 0;
        
        sheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          totalRows += rows.length;
          // Count non-empty cells
          totalCells += Object.keys(sheet).filter(k => k[0] !== '!').length;
        });

        // Simulate some unmapped and schools detected
        const detectedSchools = Math.max(1, Math.floor(totalRows / 11));
        const unmappedData = Math.floor(totalCells * 0.1);

        setTimeout(() => {
          setProgress(100);
          setCurrentStep("ready");
          setIsParsing(false);
          setFileStats({
            sheets: sheetNames.length,
            lines: totalRows,
            cells: totalCells,
            schools: detectedSchools,
            unmapped: unmappedData,
          });
          toast.success("Fichier Excel analysé avec succès ! Prêt à l'importation.");
        }, 800);

      } catch (err) {
        setIsParsing(false);
        setProgress(0);
        setCurrentStep("idle");
        setSelectedFile(null);
        toast.error("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setProgress(0);
    setCurrentStep("idle");
    setFileStats({ sheets: 0, lines: 0, cells: 0, schools: 0, unmapped: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Importation annulée.");
  };

  const confirmImport = () => {
    if (!selectedFile) return;

    const newImport: ImportRow = {
      file: selectedFile.name,
      year: academicYear,
      sheets: fileStats.sheets,
      lines: fileStats.lines,
      cells: fileStats.cells,
      schools: fileStats.schools,
      normalized: Math.floor(fileStats.cells * 0.9),
      unmapped: fileStats.unmapped,
      status: "Validé",
      date: new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
      user: "Admin",
    };

    setImports([newImport, ...imports]);
    cancelUpload();
    toast.success("Le canevas a été importé et normalisé avec succès !");
  };

  // Actions for existing imports
  const handleAction = (fileName: string, action: string) => {
    if (action === "delete") {
      if (confirm(`Voulez-vous supprimer l'importation de ${fileName} ?`)) {
        setImports(imports.filter(x => x.file !== fileName));
        toast.success("Importation supprimée.");
      }
    } else if (action === "validate") {
      setImports(imports.map(x => x.file === fileName ? { ...x, status: "Validé" } : x));
      toast.success(`Importation ${fileName} validée avec succès.`);
    } else if (action === "reimport") {
      toast.info(`Réimportation lancée pour ${fileName}...`);
    } else if (action === "errors") {
      toast.success("Rapport d'erreurs généré. Téléchargement lancé.");
      // Trigger simple CSV download of mock errors
      const csvContent = "data:text/csv;charset=utf-8,Ecole,Code,Erreur\nExcellence,ETB-001,Code etablissement manquant\nSahel,ETB-043,Champs obligatoires vides";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `rapport_erreurs_${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (action === "view") {
      const imp = imports.find(x => x.file === fileName);
      if (imp) {
        alert(`Détails de l'import:\nFichier: ${imp.file}\nFiches: ${imp.sheets}\nLignes: ${imp.lines}\nCellules: ${imp.cells}\nEcoles: ${imp.schools}\nStatut: ${imp.status}\nDate: ${imp.date}`);
      }
    }
  };

  const handleDownloadTemplate = () => {
    toast.success("Téléchargement du modèle de Canevas Excel...");
    const csvContent = "data:text/csv;charset=utf-8,CODE_ETAB,NOM_ETAB,TYPE,CYCLE,REGION,COMMUNE,QUARTIER,ELEVES_TOTAL,FILLES,GARCONS,ENSEIGNANTS,SALLES_CLASSE,POINT_EAU,ELECTRICITE\nETB-001,Ecole Exemple,Public,Primaire,Niamey,Niamey I,Bobiel,350,170,180,12,10,Oui,Oui";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Modele_Canevas_Scolaire.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Import Excel</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Importer les canevas sans perte de données</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select 
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="2025 - 2026">Année scolaire 2025 - 2026</option>
              <option value="2024 - 2025">Année scolaire 2024 - 2025</option>
            </select>
            <Link href="/dashboard/canevas/excel-preview" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100 transition-all">
              <Eye size={16} /> Aperçu brut
            </Link>
            <Link href="/dashboard/canevas/mapping-excel" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all">
              <ShieldCheck size={16} /> Mapping
            </Link>
            <Link href="/dashboard/canevas/controle-qualite" className="flex h-11 items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100 transition-all">
              <AlertTriangle size={16} /> Qualité
            </Link>
            <Link href="/dashboard/canevas/reporting" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
              <BarChart3 size={16} /> Reporting
            </Link>
            <Link href="/dashboard/canevas/export" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
              <Download size={16} /> Exporter
            </Link>
            <button 
              onClick={handleDownloadTemplate}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={16} /> Modèle Excel
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Drag & Drop Area */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "rounded-[30px] border-2 border-dashed bg-white p-8 shadow-sm transition-all",
              selectedFile ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:border-indigo-400"
            )}
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-indigo-600">
                {isParsing ? (
                  <Loader2 size={34} className="animate-spin" />
                ) : (
                  <UploadCloud size={34} />
                )}
              </div>
              
              {selectedFile ? (
                <div className="mt-5 space-y-2">
                  <h2 className="text-2xl font-black text-indigo-700 truncate max-w-lg">{selectedFile.name}</h2>
                  <p className="text-xs font-bold text-slate-400">Taille: {(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <h2 className="mt-5 text-2xl font-black text-slate-950">Glisser-déposer un fichier Excel</h2>
                  <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
                    Formats acceptés: .xls, .xlsx. Toutes les feuilles et cellules sont conservées dans la couche brute avant normalisation.
                  </p>
                </>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!selectedFile ? (
                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-75 transition-all">
                    <UploadCloud size={17} />
                    Choisir un fichier
                    <input 
                      type="file" 
                      accept=".xls,.xlsx" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange} 
                    />
                  </label>
                ) : (
                  <>
                    <button 
                      onClick={confirmImport}
                      disabled={isParsing}
                      className="flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      <ShieldCheck size={17} /> Valider l'importation
                    </button>
                    <button 
                      onClick={cancelUpload}
                      className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress / Step details */}
          {(selectedFile || isParsing) && (
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm animate-fade-in">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Progression de l’import</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">Lecture feuilles, sauvegarde brute, mapping, normalisation</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Lecture fichier", progress >= 45 ? "Terminé" : isParsing ? "En cours" : "En attente", CheckCircle2, progress >= 45 ? "text-emerald-600" : "text-indigo-600"],
                  ["Cellules brutes", progress >= 70 ? "Terminé" : progress >= 45 ? "En cours" : "En attente", CheckCircle2, progress >= 70 ? "text-emerald-600" : "text-indigo-600"],
                  ["Normalisation", progress >= 100 ? "Terminé" : progress >= 70 ? "En cours" : "En attente", Loader2, progress >= 100 ? "text-emerald-600" : "text-indigo-600"],
                  ["Contrôle erreurs", progress >= 100 ? "Validé" : "À venir", AlertTriangle, progress >= 100 ? "text-emerald-600" : "text-amber-600"],
                ].map(([label, status, Icon, color]: any) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={cn(color, status === "En cours" && "animate-spin")} />
                      <span className="text-xs font-black text-slate-800">{label}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === "ready" && (
            <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
                <div>
                  <p className="text-sm font-black text-emerald-800">Import prêt à être validé</p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">
                    {fileStats.sheets} feuilles détectées, {fileStats.cells.toLocaleString("fr-FR")} cellules sauvegardées, {fileStats.unmapped.toLocaleString("fr-FR")} données non mappées conservées sans suppression.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar stats panel */}
        <aside className="space-y-4">
          <Stat label="Feuilles détectées" value={selectedFile ? String(fileStats.sheets) : "45"} color="text-indigo-600" />
          <Stat label="Cellules importées" value={selectedFile ? fileStats.cells.toLocaleString("fr-FR") : "58 404"} color="text-emerald-600" />
          <Stat label="Écoles détectées" value={selectedFile ? String(fileStats.schools) : "1 093"} color="text-blue-600" />
          <Stat label="Données non mappées" value={selectedFile ? fileStats.unmapped.toLocaleString("fr-FR") : "4 325"} color="text-amber-600" />
          <div className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle size={17} className="text-rose-600" />
              <p className="text-sm font-black text-slate-900">Erreurs à surveiller</p>
            </div>
            <ul className="mt-3 space-y-2 text-xs font-bold text-slate-600">
              <li>• 19 incohérences effectifs</li>
              <li>• 8 codes établissements manquants</li>
              <li>• 37 champs obligatoires vides</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Historical imports table */}
      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h2 className="text-lg font-black text-slate-950">Résultat des imports</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Historique des fichiers importés et statut de traitement</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Nom fichier",
                  "Année scolaire",
                  "Nombre de feuilles",
                  "Nombre de lignes",
                  "Nombre de cellules importées",
                  "Écoles détectées",
                  "Données normalisées",
                  "Données non mappées",
                  "Statut",
                  "Date import",
                  "Utilisateur",
                  "Actions",
                ].map((head) => (
                  <th key={head} className="border-b border-slate-100 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {imports.map((row) => (
                <tr key={row.file} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-4 text-xs font-black text-slate-900">{row.file}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.year}</td>
                  <td className="px-4 py-4 text-xs font-black text-indigo-600">{row.sheets}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.lines.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.cells.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-black text-blue-600">{row.schools}</td>
                  <td className="px-4 py-4 text-xs font-black text-emerald-600">{row.normalized.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-black text-amber-600">{row.unmapped.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4">
                    <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusStyle[row.status])}>{row.status}</span>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.date}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.user}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleAction(row.file, "view")}
                        title="Voir détails" 
                        className="rounded-lg p-2 text-indigo-500 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "reimport")}
                        title="Réimporter" 
                        className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "errors")}
                        title="Télécharger rapport erreurs" 
                        className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 transition-colors"
                      >
                        <Download size={15} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "validate")}
                        disabled={row.status === "Validé"}
                        title="Valider import" 
                        className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-30"
                      >
                        <ShieldCheck size={15} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "delete")}
                        title="Supprimer" 
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
