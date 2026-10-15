"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileText,
  Info,
  Layers,
  X,
} from "lucide-react";

interface BookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: number;
    title: string;
    author?: string | null;
    category?: string | null;
    fileUrl?: string | null;
    fileType?: string | null;
    description?: string | null;
    isbn?: string | null;
    shelfLocation?: string | null;
  } | null;
}

export default function BookReaderModal({
  isOpen,
  onClose,
  book,
}: BookReaderModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!book) return null;

  const fileUrl = book.fileUrl || "";
  const isPdf =
    book.fileType?.toUpperCase() === "PDF" || fileUrl.toLowerCase().endsWith(".pdf");

  const handleCopyLink = () => {
    if (!fileUrl) return;
    navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`p-0 overflow-hidden bg-white dark:bg-[#0E1017] border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 flex flex-col ${
          isFullscreen
            ? "!w-[98vw] !max-w-[98vw] !h-[96vh] rounded-2xl"
            : "!w-[92vw] !max-w-6xl !h-[88vh] rounded-[2.5rem]"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-black text-slate-950 dark:text-white truncate">
                  {book.title}
                </DialogTitle>
                <span className="rounded-md bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 shrink-0">
                  {book.fileType || "PDF"}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                {book.author || "Auteur inconnu"} •{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {book.category || "Centre Documentaire"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showMetadata
                  ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title="Informations du document"
            >
              <Info size={16} />
              <span className="hidden sm:inline">Détails</span>
            </button>

            {fileUrl && (
              <>
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1"
                  title="Copier le lien"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>

                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={16} />
                </a>

                <a
                  href={fileUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                  title="Télécharger le fichier"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Télécharger</span>
                </a>
              </>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Reader Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Viewer Area */}
          <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
            {fileUrl ? (
              <iframe
                src={fileUrl}
                title={book.title}
                className="w-full h-full border-none bg-white"
              />
            ) : (
              <div className="text-center p-8 max-w-md">
                <FileText size={48} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-lg font-black text-white">Lien de lecture non configuré</h3>
                <p className="mt-2 text-xs text-slate-400 font-medium">
                  Cette ressource n&apos;a pas encore de fichier ou de lien numérique associé. Vous pouvez en ajouter un en modifiant la fiche de la ressource.
                </p>
              </div>
            )}
          </div>

          {/* Collapsible Metadata Drawer */}
          {showMetadata && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1017] p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Fiche Documentaire
                </p>
                <button
                  onClick={() => setShowMetadata(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titre</p>
                <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">{book.title}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auteur / Source</p>
                <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">{book.author || "Non renseigné"}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie</p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">
                  {book.category || "Général"}
                </span>
              </div>

              {book.isbn && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ISBN / Référence</p>
                  <p className="mt-0.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{book.isbn}</p>
                </div>
              )}

              {book.shelfLocation && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emplacement</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">{book.shelfLocation}</p>
                </div>
              )}

              {book.description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Résumé</p>
                  <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    {book.description}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="rounded-2xl p-4 bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs font-black uppercase tracking-wider">Accès Libre</p>
                  </div>
                  <p className="text-[11px] font-medium leading-normal">
                    Ce document numérique est consultable en accès illimité par les étudiants et enseignants de l&apos;établissement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
