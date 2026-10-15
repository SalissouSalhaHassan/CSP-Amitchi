"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Book,
  Bookmark,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Layers,
  MapPin,
  Printer,
  QrCode,
  Repeat,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import IssueBookDialog from "./IssueBookDialog";
import BookDialog from "./BookDialog";

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: any | null;
  issues?: any[];
  onOpenReader?: (book: any) => void;
}

const CATEGORY_PALETTES: Record<string, { bg: string; text: string; gradient: string }> = {
  "Sciences Juridiques & Politiques": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-600 via-yellow-700 to-amber-900" },
  "Informatique & IA": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", gradient: "from-cyan-600 via-blue-700 to-indigo-900" },
  "Informatique": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", gradient: "from-cyan-600 via-blue-700 to-indigo-900" },
  "Mathématiques": { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", gradient: "from-indigo-600 via-purple-700 to-slate-900" },
  "Histoire & Sociologie": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-600 via-amber-700 to-stone-900" },
  "Histoire": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-600 via-amber-700 to-stone-900" },
  "Économie & Gestion": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-600 via-teal-700 to-slate-900" },
  "Médecine & Santé": { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", gradient: "from-rose-600 via-pink-700 to-rose-950" },
  "Sciences": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-600 via-sky-700 to-slate-900" },
  "Littérature": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", gradient: "from-purple-600 via-violet-700 to-slate-900" },
};

function getCategoryPalette(category?: string | null) {
  if (!category) return { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", gradient: "from-indigo-600 to-slate-900" };
  return (
    CATEGORY_PALETTES[category] || {
      bg: "bg-indigo-500/10",
      text: "text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-600 to-slate-900",
    }
  );
}

export default function BookDetailsModal({
  isOpen,
  onClose,
  book,
  issues = [],
  onOpenReader,
}: BookDetailsModalProps) {
  const [showQr, setShowQr] = useState(false);

  if (!book) return null;

  const isDigital = book.isDigital === "true" || !!book.fileUrl;
  const available = Number(book.availableQuantity || 0);
  const total = Number(book.totalQuantity || 0);
  const palette = getCategoryPalette(book.category);

  // Issues specifically for this book
  const bookIssues = issues.filter((i) => i.bookId === book.id || i.book?.id === book.id);
  const activeBookIssues = bookIssues.filter((i) => i.status !== "Retourné");

  const qrPayload = JSON.stringify({
    type: "edut_library_book",
    id: book.id,
    title: book.title,
    isbn: book.isbn,
    shelf: book.shelfLocation,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Book size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Fiche Documentaire
              </p>
              <DialogTitle className="text-xl font-black text-slate-950 dark:text-white">
                Détails de la Ressource
              </DialogTitle>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Top Hero Banner with 3D Book Spine Effect */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            {/* Book Cover Aesthetic */}
            <div
              className={`h-60 rounded-2xl bg-gradient-to-br ${palette.gradient} p-4 text-white shadow-xl shadow-slate-900/10 flex flex-col justify-between relative overflow-hidden group border-l-4 border-white/20`}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/30 backdrop-blur-xs">
                  {isDigital ? "E-BOOK" : "FONDS"}
                </span>
                <Bookmark size={14} className="text-white/80" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 line-clamp-1">
                  {book.category || "Ouvrage"}
                </p>
                <p className="text-sm font-black leading-snug line-clamp-3 text-white mt-1">
                  {book.title}
                </p>
                <p className="text-[10px] font-semibold text-white/80 mt-2 line-clamp-1">
                  {book.author || "Auteur"}
                </p>
              </div>
            </div>

            {/* Info and Badges */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${palette.bg} ${palette.text}`}
                  >
                    {book.category || "Général"}
                  </span>
                  {isDigital ? (
                    <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1 text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-1">
                      💻 Numérique ({book.fileType || "PDF"})
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1">
                      📖 Fonds Physique
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-slate-950 dark:text-white leading-tight">
                  {book.title}
                </h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                  Par {book.author || "Auteur non spécifié"}
                </p>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Rayon / Cote
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={12} className="text-indigo-500 shrink-0" />
                    {book.shelfLocation || (isDigital ? "Serveur Cloud" : "N/A")}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    ISBN / Réf
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {book.isbn || "Non renseigné"}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Disponibilité
                  </p>
                  {isDigital ? (
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ∞ Illimité
                    </p>
                  ) : (
                    <p
                      className={`text-xs font-black mt-0.5 ${
                        available <= 0
                          ? "text-rose-600 dark:text-rose-400"
                          : available <= 2
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {available} / {total} ex.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {book.fileUrl && onOpenReader && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReader(book);
                    }}
                    className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Book size={15} /> Lire le Document
                  </button>
                )}

                {!isDigital && available > 0 && (
                  <IssueBookDialog
                    bookId={book.id}
                    bookTitle={book.title}
                    trigger={
                      <button className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-500/20">
                        <Repeat size={15} /> Prêter un exemplaire
                      </button>
                    }
                  />
                )}

                <button
                  onClick={() => setShowQr(!showQr)}
                  className={`h-11 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    showQr
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-800"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <QrCode size={15} />
                  <span>{showQr ? "Masquer QR" : "QR Code"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Shelf Label Panel */}
          {showQr && (
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-white rounded-2xl shadow-md shrink-0 border border-slate-200">
                <QRCodeSVG value={qrPayload} size={130} level="M" />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Étiquette de Rayonnage & Inventaire
                </p>
                <h4 className="text-sm font-black text-slate-950 dark:text-white">
                  Code QR pour consultation & prêt rapide
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Ce QR code contient les identifiants uniques de l&apos;ouvrage ({book.isbn || `REF-${book.id}`}). Il peut être imprimé et collé sur la tranche ou couverture du livre pour l&apos;enregistrement rapide par caméra mobile.
                </p>
                <button
                  onClick={() => window.print()}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800"
                >
                  <Printer size={14} /> Imprimer l&apos;étiquette
                </button>
              </div>
            </div>
          )}

          {/* Description & Abstract */}
          {book.description && (
            <div className="space-y-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Résumé & Présentation Documentaire
              </p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {book.description}
              </p>
            </div>
          )}

          {/* Loan History Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  Historique des Emprunts pour cet ouvrage
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {bookIssues.length} mouvement(s)
              </span>
            </div>

            {bookIssues.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Emprunteur</th>
                      <th className="px-4 py-3">Date Prêt</th>
                      <th className="px-4 py-3">Échéance</th>
                      <th className="px-4 py-3 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {bookIssues.map((issue) => {
                      const isOverdue =
                        issue.status !== "Retourné" &&
                        issue.dueDate &&
                        new Date(issue.dueDate) < new Date();
                      const borrower =
                        issue.student?.nomEtudiant ||
                        issue.employee?.nom ||
                        issue.employee?.nomPrenom ||
                        "Emprunteur";
                      return (
                        <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {borrower}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {issue.issueDate
                              ? new Date(issue.issueDate).toLocaleDateString("fr-FR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {issue.dueDate
                              ? new Date(issue.dueDate).toLocaleDateString("fr-FR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                                isOverdue
                                  ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400"
                                  : issue.status === "Retourné"
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {isOverdue ? "En retard" : issue.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold">
                Aucun emprunt enregistré pour cette ressource.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
