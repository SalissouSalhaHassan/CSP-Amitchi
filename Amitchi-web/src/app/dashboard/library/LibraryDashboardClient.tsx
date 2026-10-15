"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Book,
  Bookmark,
  CalendarClock,
  Download,
  Eye,
  FileSpreadsheet,
  LayoutGrid,
  List,
  MapPin,
  Printer,
  Repeat,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import BookDialog from "@/domains/library/components/BookDialog";
import IssueBookDialog from "@/domains/library/components/IssueBookDialog";
import ReturnBookDialog from "@/domains/library/components/ReturnBookDialog";
import BookCard from "@/domains/library/components/BookCard";
import BookDetailsModal from "@/domains/library/components/BookDetailsModal";
import BookReaderModal from "@/domains/library/components/BookReaderModal";
import {
  deleteLibraryBook,
  seedSampleLibraryResources,
} from "@/domains/library/actions/library.actions";

interface LibraryDashboardClientProps {
  books: any[];
  issues: any[];
}

function isIssueActive(issue: any) {
  return issue.status !== "Retourné";
}

function isIssueOverdue(issue: any) {
  return (
    isIssueActive(issue) &&
    issue.dueDate &&
    new Date(issue.dueDate) < new Date()
  );
}

function borrowerName(issue: any) {
  return (
    issue.student?.nomEtudiant ||
    issue.employee?.nom ||
    issue.employee?.nomPrenom ||
    "Emprunteur inconnu"
  );
}

function exportCsv(rows: any[]) {
  const headers = [
    "Titre",
    "Auteur",
    "Type",
    "Format",
    "Catégorie",
    "ISBN",
    "Rayon",
    "Disponible",
    "Total",
    "Lien Fichier",
    "Résumé",
  ];
  const body = rows.map((book) => [
    book.title,
    book.author || "",
    book.isDigital === "true" || !!book.fileUrl ? "Numérique" : "Physique",
    book.fileType || "PDF",
    book.category || "",
    book.isbn || "",
    book.shelfLocation || "",
    book.availableQuantity ?? 0,
    book.totalQuantity ?? 0,
    book.fileUrl || "",
    book.description || "",
  ]);
  const csv = [headers, ...body]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bibliotheque_catalogue_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LibraryDashboardClient({
  books,
  issues,
}: LibraryDashboardClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [formatFilter, setFormatFilter] = useState<"all" | "digital" | "physical">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [issueFilter, setIssueFilter] = useState("active");
  const [isSeeding, setIsSeeding] = useState(false);

  // Modals state
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<any | null>(null);
  const [selectedBookForReader, setSelectedBookForReader] = useState<any | null>(null);

  const categories = useMemo(() => {
    return Array.from(
      new Set(books.map((book) => book.category).filter(Boolean))
    ).sort();
  }, [books]);

  const activeIssues = useMemo(() => issues.filter(isIssueActive), [issues]);
  const overdueIssues = useMemo(
    () => activeIssues.filter(isIssueOverdue),
    [activeIssues]
  );
  const returnedIssues = useMemo(
    () => issues.filter((issue) => issue.status === "Retourné"),
    [issues]
  );

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return books.filter((book) => {
      const isDig = book.isDigital === "true" || !!book.fileUrl;

      const matchesSearch =
        !term ||
        [
          book.title,
          book.author,
          book.isbn,
          book.category,
          book.shelfLocation,
          book.description,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesCategory = category === "all" || book.category === category;

      const matchesFormat =
        formatFilter === "all" ||
        (formatFilter === "digital" && isDig) ||
        (formatFilter === "physical" && !isDig);

      const matchesAvailability =
        availability === "all" ||
        (availability === "available" &&
          (isDig || Number(book.availableQuantity || 0) > 0)) ||
        (availability === "unavailable" &&
          !isDig &&
          Number(book.availableQuantity || 0) <= 0) ||
        (availability === "low" &&
          !isDig &&
          Number(book.availableQuantity || 0) > 0 &&
          Number(book.availableQuantity || 0) <= 2);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesFormat &&
        matchesAvailability
      );
    });
  }, [books, search, category, formatFilter, availability]);

  const visibleIssues = useMemo(() => {
    if (issueFilter === "overdue") return overdueIssues;
    if (issueFilter === "returned") return returnedIssues;
    if (issueFilter === "all") return issues;
    return activeIssues;
  }, [activeIssues, issueFilter, issues, overdueIssues, returnedIssues]);

  const stats = useMemo(() => {
    const totalCopies = books.reduce(
      (acc, book) => acc + Number(book.totalQuantity || 0),
      0
    );
    const availableCopies = books.reduce(
      (acc, book) => acc + Number(book.availableQuantity || 0),
      0
    );
    const borrowedCopies = Math.max(
      totalCopies - availableCopies,
      activeIssues.length
    );
    const circulationRate = totalCopies
      ? Math.round((borrowedCopies / totalCopies) * 100)
      : 0;
    const lowStock = books.filter(
      (book) =>
        book.isDigital !== "true" &&
        !book.fileUrl &&
        Number(book.availableQuantity || 0) > 0 &&
        Number(book.availableQuantity || 0) <= 2
    ).length;
    const digitalCount = books.filter(
      (book) => book.isDigital === "true" || !!book.fileUrl
    ).length;

    return [
      {
        label: "Ressources Totales",
        value: books.length,
        helper: `${digitalCount} numériques (PDF/E-Books)`,
        icon: Book,
        tone: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
      },
      {
        label: "Numérique (E-Books)",
        value: digitalCount,
        helper: "Accès illimité en ligne",
        icon: Bookmark,
        tone: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
      },
      {
        label: "Emprunts Physiques",
        value: activeIssues.length,
        helper: `${returnedIssues.length} retours enregistrés`,
        icon: Repeat,
        tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      {
        label: "En retard",
        value: overdueIssues.length,
        helper: "À relancer rapidement",
        icon: AlertCircle,
        tone: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
      },
      {
        label: "Rotation",
        value: `${circulationRate}%`,
        helper: "Taux de circulation",
        icon: TrendingUp,
        tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      {
        label: "Stock faible",
        value: lowStock,
        helper: "Disponibilité limitée",
        icon: CalendarClock,
        tone: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400",
      },
    ];
  }, [activeIssues.length, books, overdueIssues.length, returnedIssues.length]);

  const handleSeedSamples = async () => {
    setIsSeeding(true);
    try {
      await seedSampleLibraryResources();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-700 print:bg-white print:p-0">
      {/* Top Header Card */}
      <div className="flex flex-col gap-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-6 shadow-sm dark:shadow-none lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-start gap-4">
          <div className="rounded-3xl bg-slate-950 dark:bg-slate-900 border border-transparent dark:border-slate-800 p-4 text-white shadow-xl shadow-slate-200 dark:shadow-none">
            <Book size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
              Centre documentaire & Bibliothèque Numérique
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Bibliothèque Numérique & Centre Documentaire
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              Catalogue hybride, consultation en ligne (PDF / E-Books), emprunts et gestion des fonds documentaires.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportCsv(filteredBooks)}
            className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <FileSpreadsheet size={16} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer size={16} /> Imprimer
          </button>
          <BookDialog mode="add" />
        </div>
      </div>

      {/* Print-Only Header */}
      <section className="hidden print:block border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-black uppercase">
          Inventaire Officiel de la Bibliothèque & Centre Documentaire
        </h1>
        <p className="text-sm font-bold text-slate-600">
          Date d&apos;impression: {new Date().toLocaleDateString("fr-FR")} • {filteredBooks.length} ouvrage(s) listé(s)
        </p>
      </section>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-5 shadow-sm dark:shadow-none print:break-inside-avoid print:shadow-none"
          >
            <div className={`mb-4 inline-flex rounded-2xl p-3 ${stat.tone}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {stat.label}
            </p>
            <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {stat.helper}
            </p>
          </div>
        ))}
      </div>

      {/* Overdue Alert Banner */}
      {overdueIssues.length > 0 && (
        <div className="rounded-[2rem] border border-rose-100 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 p-5 text-rose-800 dark:text-rose-300 print:break-inside-avoid">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-black uppercase tracking-widest text-xs">
                Alertes de retard ({overdueIssues.length} emprunt(s))
              </p>
              <p className="mt-1 text-sm font-bold">
                Des emprunts ont dépassé la date de retour prévue. Vous pouvez filtrer l&apos;onglet « Retards » dans le panneau de droite pour relancer les étudiants et appliquer les pénalités si nécessaire.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Welcome & Starter Pack Banner */}
      {books.length === 0 && (
        <div className="rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/20 dark:via-[#131622] dark:to-indigo-950/10 p-8 sm:p-10 shadow-sm print:hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Démarrage Rapide du Centre Documentaire</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              Bienvenue dans votre Bibliothèque Numérique & Hybride
            </h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              Votre catalogue ne contient pas encore de ressources. Vous pouvez ajouter manuellement vos premiers livres physiques et e-books, ou charger directement un ensemble de ressources documentaires académiques fondamentales (Droit, Informatique & IA, Mathématiques, Histoire de l&apos;Afrique, Économie, Médecine & Santé).
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSeedSamples}
                disabled={isSeeding}
                className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
              >
                <Sparkles size={16} />
                <span>
                  {isSeeding
                    ? "Chargement en cours..."
                    : "⚡ Charger les exemples académiques (6 ouvrages)"}
                </span>
              </button>
              <BookDialog
                mode="add"
                trigger={
                  <button className="h-12 px-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    + Ajouter un livre manuellement
                  </button>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        {/* Left Column: Catalogue */}
        <section className="space-y-6">
          {/* Filters & Mode Toolbar */}
          <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-5 shadow-sm dark:shadow-none print:hidden space-y-4">
            {/* Top row: Search & Selects */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px_auto]">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher titre, auteur, ISBN, catégorie, rayon, mot-clé..."
                  className="h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 transition-colors"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">Toutes les disciplines</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">Toutes disponibilités</option>
                <option value="available">Disponible</option>
                <option value="low">Stock faible (≤ 2)</option>
                <option value="unavailable">Épuisé / Emprunté</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-xl transition-all ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="Vue Grille (Cartes Documentaires)"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2.5 rounded-xl transition-all ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="Vue Tableau (Inventaire)"
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Bottom row: Format Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                Format:
              </span>
              {[
                { id: "all", label: "Tous les fonds" },
                { id: "digital", label: "💻 Numérique (E-Books & PDFs)" },
                { id: "physical", label: "📖 Fonds Physiques" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormatFilter(fmt.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
                    formatFilter === fmt.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}

              <span className="ml-auto text-xs font-bold text-slate-400">
                {filteredBooks.length} ouvrage(s) trouvé(s)
              </span>
            </div>
          </div>

          {/* Catalogue Presentation Area */}
          {viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpenDetails={(b) => setSelectedBookForDetails(b)}
                  onOpenReader={(b) => setSelectedBookForReader(b)}
                />
              ))}

              {filteredBooks.length === 0 && (
                <div className="col-span-full py-20 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20">
                  <Bookmark
                    size={42}
                    className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                  />
                  <h3 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Aucun livre ne correspond à votre recherche
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Essayez de réinitialiser vos filtres ou de modifier votre terme de recherche.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">
                    Catalogue des fonds documentaires
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    {filteredBooks.length} résultat(s) affiché(s)
                  </p>
                </div>
                <Download
                  className="text-slate-300 dark:text-slate-600 print:hidden cursor-pointer hover:text-slate-900"
                  size={20}
                  onClick={() => exportCsv(filteredBooks)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Livre / Auteur</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4">ISBN</th>
                      <th className="px-6 py-4">Rayon</th>
                      <th className="px-6 py-4 text-center">Disponibilité</th>
                      <th className="px-6 py-4 text-right print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBooks.map((book) => {
                      const available = Number(book.availableQuantity || 0);
                      const total = Number(book.totalQuantity || 0);
                      const ratio = total
                        ? Math.round((available / total) * 100)
                        : 0;
                      const isDig = book.isDigital === "true" || !!book.fileUrl;

                      return (
                        <tr
                          key={book.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <p
                                onClick={() => setSelectedBookForDetails(book)}
                                className="font-black text-slate-950 dark:text-white hover:text-indigo-600 cursor-pointer"
                              >
                                {book.title}
                              </p>
                              {isDig ? (
                                <span className="rounded-md bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase">
                                  💻 Numérique ({book.fileType || "PDF"})
                                </span>
                              ) : (
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                  📖 Physique
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {book.author || "Auteur inconnu"}
                            </p>
                            {book.description && (
                              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                                {book.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                              {book.category || "Non classé"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                            {book.isbn || "-"}
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <MapPin size={12} />
                              {book.shelfLocation || (isDig ? "Cloud" : "N/A")}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            {isDig ? (
                              <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                                ∞ Accès Illimité
                              </span>
                            ) : (
                              <>
                                <p
                                  className={`text-lg font-black ${
                                    available <= 0
                                      ? "text-rose-600 dark:text-rose-400"
                                      : available <= 2
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {available}
                                  <span className="text-xs text-slate-400">
                                    {" "}
                                    / {total}
                                  </span>
                                </p>
                                <div className="mx-auto mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className={`h-full ${
                                      available <= 0
                                        ? "bg-rose-500"
                                        : available <= 2
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(ratio, 100)}%` }}
                                  />
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedBookForDetails(book)}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                              >
                                <Eye size={13} /> Fiche
                              </button>

                              {isDig && book.fileUrl && (
                                <button
                                  onClick={() => setSelectedBookForReader(book)}
                                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1"
                                >
                                  <Book size={13} /> Lire
                                </button>
                              )}

                              {!isDig && available > 0 && (
                                <IssueBookDialog
                                  bookId={book.id}
                                  bookTitle={book.title}
                                  trigger={
                                    <button className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 text-xs font-black text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 flex items-center gap-1">
                                      <Repeat size={13} /> Prêter
                                    </button>
                                  }
                                />
                              )}

                              <ActionMenu
                                title="Gérer la ressource"
                                onDelete={deleteLibraryBook.bind(null, book.id)}
                                editDialog={
                                  <BookDialog mode="edit" initialData={book} />
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredBooks.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-16 text-center text-sm font-black uppercase tracking-widest text-slate-300 dark:text-slate-600"
                        >
                          Aucun livre trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Loan Movements Tracking */}
        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] p-5 shadow-sm dark:shadow-none print:break-inside-avoid print:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  Suivi des emprunts
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  {visibleIssues.length} mouvement(s)
                </p>
              </div>
              <Users className="text-slate-300 dark:text-slate-600" size={20} />
            </div>

            <div className="mb-4 grid grid-cols-4 gap-1.5 print:hidden">
              {[
                ["active", "Actifs"],
                ["overdue", "Retards"],
                ["returned", "Retours"],
                ["all", "Tous"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setIssueFilter(value)}
                  className={`rounded-xl py-2 text-[11px] font-black uppercase tracking-wider text-center transition-all ${
                    issueFilter === value
                      ? "bg-slate-950 dark:bg-slate-800 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
              {visibleIssues.map((issue) => {
                const overdue = isIssueOverdue(issue);
                return (
                  <div
                    key={issue.id}
                    className={`rounded-3xl border p-4 transition-all ${
                      overdue
                        ? "border-rose-100 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/10"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black leading-tight text-slate-950 dark:text-white">
                          {issue.book?.title || "Livre"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          Emprunté par: {borrowerName(issue)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          overdue
                            ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400"
                            : issue.status === "Retourné"
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {overdue ? "Retard" : issue.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Échéance
                        </p>
                        <p
                          className={`text-xs font-black ${
                            overdue
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {issue.dueDate
                            ? new Date(issue.dueDate).toLocaleDateString("fr-FR")
                            : "-"}
                        </p>
                      </div>

                      {issue.status !== "Retourné" && (
                        <ReturnBookDialog
                          issueId={issue.id}
                          bookTitle={issue.book?.title || "Livre"}
                          borrowerName={borrowerName(issue)}
                          isOverdue={overdue}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleIssues.length === 0 && (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 py-14 text-center">
                  <Bookmark
                    className="mx-auto mb-3 text-slate-200 dark:text-slate-700"
                    size={38}
                  />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Aucun mouvement
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Book Reader Modal */}
      <BookReaderModal
        isOpen={!!selectedBookForReader}
        onClose={() => setSelectedBookForReader(null)}
        book={selectedBookForReader}
      />

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={!!selectedBookForDetails}
        onClose={() => setSelectedBookForDetails(null)}
        book={selectedBookForDetails}
        issues={issues}
        onOpenReader={(b) => setSelectedBookForReader(b)}
      />
    </div>
  );
}
