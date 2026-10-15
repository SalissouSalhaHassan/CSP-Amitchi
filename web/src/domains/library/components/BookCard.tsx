"use client";

import {
  Book,
  Bookmark,
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  Repeat,
} from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import BookDialog from "./BookDialog";
import IssueBookDialog from "./IssueBookDialog";
import { deleteLibraryBook } from "../actions/library.actions";

interface BookCardProps {
  book: any;
  onOpenDetails: (book: any) => void;
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

export default function BookCard({
  book,
  onOpenDetails,
  onOpenReader,
}: BookCardProps) {
  const isDigital = book.isDigital === "true" || !!book.fileUrl;
  const available = Number(book.availableQuantity || 0);
  const total = Number(book.totalQuantity || 0);
  const ratio = total ? Math.round((available / total) * 100) : 0;
  const palette = getCategoryPalette(book.category);

  return (
    <div className="group rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-5 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      <div className="space-y-4">
        {/* Cover Header */}
        <div
          onClick={() => onOpenDetails(book)}
          className={`h-40 rounded-2xl bg-gradient-to-br ${palette.gradient} p-4 text-white cursor-pointer relative overflow-hidden shadow-inner flex flex-col justify-between group-hover:scale-[1.02] transition-transform duration-300 border-l-4 border-white/20`}
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 backdrop-blur-xs">
              {isDigital ? `💻 ${book.fileType || "PDF"}` : "📖 FONDS"}
            </span>
            <Bookmark size={14} className="text-white/80" />
          </div>

          <div className="z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 line-clamp-1">
              {book.category || "Ouvrage"}
            </p>
            <h3 className="text-sm font-black leading-snug line-clamp-2 text-white mt-0.5">
              {book.title}
            </h3>
          </div>

          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
        </div>

        {/* Content Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${palette.bg} ${palette.text} truncate max-w-[150px]`}
            >
              {book.category || "Général"}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <MapPin size={10} />
              {book.shelfLocation || (isDigital ? "Cloud" : "Rayon")}
            </span>
          </div>

          <h4
            onClick={() => onOpenDetails(book)}
            className="text-sm font-black text-slate-900 dark:text-white line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          >
            {book.title}
          </h4>

          <p className="text-xs font-bold text-slate-400 dark:text-slate-400 line-clamp-1">
            {book.author || "Auteur inconnu"}
          </p>

          {book.description && (
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {book.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Availability & Action Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        {/* Availability Bar */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Disponibilité
          </span>
          {isDigital ? (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
              ∞ Accès Illimité
            </span>
          ) : (
            <span
              className={`text-xs font-black ${
                available <= 0
                  ? "text-rose-600 dark:text-rose-400"
                  : available <= 2
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {available} / {total} ex.
            </span>
          )}
        </div>

        {!isDigital && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                available <= 0
                  ? "bg-rose-500"
                  : available <= 2
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(ratio, 100)}%` }}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => onOpenDetails(book)}
            className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Eye size={13} />
            <span>Fiche</span>
          </button>

          {isDigital && book.fileUrl && onOpenReader && (
            <button
              onClick={() => onOpenReader(book)}
              className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all"
            >
              <Book size={13} />
              <span>Consulter</span>
            </button>
          )}

          {!isDigital && available > 0 && (
            <IssueBookDialog
              bookId={book.id}
              bookTitle={book.title}
              trigger={
                <button className="flex-1 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-500/20 transition-all">
                  <Repeat size={13} />
                  <span>Prêter</span>
                </button>
              }
            />
          )}

          <ActionMenu
            title="Gérer le document"
            onDelete={deleteLibraryBook.bind(null, book.id)}
            editDialog={<BookDialog mode="edit" initialData={book} />}
          />
        </div>
      </div>
    </div>
  );
}
