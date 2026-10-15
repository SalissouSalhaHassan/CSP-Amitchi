"use client";

import { useRef } from "react";
import { CardSize, Orientation, CardSide } from "./types";
import { Undo, Redo, ZoomIn, ZoomOut, Download, Upload, Save, Printer, IdCard, Sparkles, Grid, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardTopToolbarProps {
  cardType: CardSize;
  onCardTypeChange: (size: CardSize) => void;
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
  activeSide: CardSide;
  onSideChange: (side: CardSide) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: "pdf" | "png" | "jpeg" | "json") => void;
  onImportJSON: (json: any) => void;
  onSave: () => void;
  saving?: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onBatchPrintClick: () => void;
  students?: any[];
  previewStudentId?: number | null;
  onPreviewStudentChange?: (id: number) => void;
}

export default function CardTopToolbar({
  cardType,
  onCardTypeChange,
  orientation,
  onOrientationChange,
  activeSide,
  onSideChange,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onImportJSON,
  onSave,
  saving,
  templateName,
  onTemplateNameChange,
  onBatchPrintClick,
  students,
  previewStudentId,
  onPreviewStudentChange,
}: CardTopToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportJSON(json);
      } catch (err) {
        alert("Fichier JSON non valide");
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-16 bg-white dark:bg-[#131622] border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-30 shadow-sm select-none text-slate-900 dark:text-white">
      {/* Template Name & Side Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none">
            <IdCard size={20} />
          </div>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              className="text-sm font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-600 focus:outline-none transition px-1"
              placeholder="Nom du modèle de carte..."
            />
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 px-1">Studio de cartes ID (WYSIWYG)</p>
          </div>
        </div>

        {/* Recto / Verso Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onSideChange("recto")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              activeSide === "recto" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Recto (Face)
          </button>
          <button
            onClick={() => onSideChange("verso")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              activeSide === "verso" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Verso (Dos)
          </button>
        </div>

        {/* Live Student Data Preview Selector */}
        {students && students.length > 0 && onPreviewStudentChange && (
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-1 rounded-xl">
            <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Aperçu élève :</span>
            <Select value={String(previewStudentId || students[0]?.id)} onValueChange={(val) => onPreviewStudentChange(Number(val))}>
              <SelectTrigger className="h-7 w-36 rounded-lg border-none bg-white dark:bg-slate-900 font-bold text-xs shadow-sm text-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((st) => (
                  <SelectItem key={st.id} value={String(st.id)}>
                    {st.nomEtudiant} {st.prenomEtudiant} ({st.classe || "N/A"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Card Configuration & Controls */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
        <Select value={cardType} onValueChange={(v) => onCardTypeChange(v as CardSize)}>
          <SelectTrigger className="h-8 w-28 rounded-xl border-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CR80">CR80 (PVC)</SelectItem>
            <SelectItem value="CR100">CR100 (Grand)</SelectItem>
            <SelectItem value="Badge">Badge (90x60)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orientation} onValueChange={(v) => onOrientationChange(v as Orientation)}>
          <SelectTrigger className="h-8 w-28 rounded-xl border-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="landscape">Paysage (Landscape)</SelectItem>
            <SelectItem value="portrait">Portrait (Vertical)</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <Button size="icon" variant="ghost" disabled={!canUndo} onClick={onUndo} className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800" title="Annuler (Ctrl+Z)">
          <Undo size={14} />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRedo} onClick={onRedo} className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800" title="Rétablir (Ctrl+Y)">
          <Redo size={14} />
        </Button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onZoomChange(Math.max(25, zoom - 25))} className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-10 text-center">{zoom}%</span>
          <Button size="icon" variant="ghost" onClick={() => onZoomChange(Math.min(200, zoom + 25))} className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
            <ZoomIn size={14} />
          </Button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <Button size="icon" variant="ghost" onClick={onToggleGrid} className={`h-8 w-8 rounded-xl ${showGrid ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"}`} title="Grille">
          <Grid size={14} />
        </Button>
      </div>

      {/* Export & Actions */}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />

        <Button onClick={onBatchPrintClick} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5">
          <Printer size={14} /> Impression par lots d'élèves
        </Button>

        <Select onValueChange={(fmt) => onExport(fmt as any)}>
          <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-sm">
            <Download size={13} className="mr-1 text-slate-500 dark:text-slate-400" />
            <SelectValue placeholder="Exporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">Exporter PDF</SelectItem>
            <SelectItem value="png">Exporter PNG</SelectItem>
            <SelectItem value="jpeg">Exporter JPEG</SelectItem>
            <SelectItem value="json">Exporter JSON</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onSave} disabled={saving} className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-1.5">
          <Save size={14} /> {saving ? "Enregistrement..." : "Enregistrer le modèle"}
        </Button>
      </div>
    </header>
  );
}
