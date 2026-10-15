"use client";

import React, { useState, useMemo } from "react";
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  CreditCard, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Loader2,
  DollarSign,
  ArrowUpRight,
  PieChart,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createExpense, deleteExpense } from "@/domains/finance/actions/finance.actions";

interface ExpensesClientProps {
  initialExpenses: any[];
  categories: any[];
}

export default function ExpensesClient({ initialExpenses, categories }: ExpensesClientProps) {
  const [expenseList, setExpenseList] = useState<any[]>(initialExpenses || []);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // New Expense Form State
  const [formData, setFormData] = useState({
    reference: `DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    categoryId: categories[0]?.id ? String(categories[0].id) : "",
    amount: "",
    dateExpense: new Date().toISOString().split("T")[0],
    paymentMode: "Espèces",
    description: "",
  });

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenseList.filter((e) => {
      const matchSearch = 
        !search ||
        e.reference?.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.recordedBy?.toLowerCase().includes(search.toLowerCase());

      const matchCategory = 
        categoryFilter === "all" || e.categoryId?.toString() === categoryFilter;

      const matchMode = 
        paymentModeFilter === "all" || e.paymentMode === paymentModeFilter;

      return matchSearch && matchCategory && matchMode;
    });
  }, [expenseList, search, categoryFilter, paymentModeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const count = filteredExpenses.length;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTotal = filteredExpenses
      .filter((e) => {
        if (!e.dateExpense) return false;
        const d = new Date(e.dateExpense);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const average = count > 0 ? Math.round(total / count) : 0;

    return { total, count, monthTotal, average };
  }, [filteredExpenses]);

  // Submit New Expense
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Veuillez saisir un montant valide.");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Veuillez sélectionner une catégorie de dépense.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Enregistrement de la dépense...");

    try {
      const payload = {
        reference: formData.reference,
        categoryId: parseInt(formData.categoryId),
        amount: parseFloat(formData.amount),
        dateExpense: formData.dateExpense,
        paymentMode: formData.paymentMode,
        description: formData.description || "",
      };

      const res = await createExpense(payload as any);

      if (res?.error) {
        toast.dismiss(loadingToast);
        toast.error(`Erreur: ${res.error}`);
      } else {
        toast.dismiss(loadingToast);
        toast.success("Dépense enregistrée avec succès !");

        // Local state update
        const newCat = categories.find((c) => c.id.toString() === formData.categoryId);
        const newEntry = {
          id: Date.now(),
          reference: formData.reference,
          categoryId: parseInt(formData.categoryId),
          category: newCat,
          amount: parseFloat(formData.amount),
          dateExpense: formData.dateExpense,
          paymentMode: formData.paymentMode,
          description: formData.description,
          recordedBy: "Vous",
        };

        setExpenseList([newEntry, ...expenseList]);
        setShowModal(false);
        setFormData({
          reference: `DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          categoryId: categories[0]?.id ? String(categories[0].id) : "",
          amount: "",
          dateExpense: new Date().toISOString().split("T")[0],
          paymentMode: "Espèces",
          description: "",
        });
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error("Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDelete = async (id: number, refName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la dépense "${refName}" ?`)) return;

    setDeletingId(id);
    const loadingToast = toast.loading("Suppression en cours...");

    try {
      const res = await deleteExpense(id);
      if (res?.error) {
        toast.dismiss(loadingToast);
        toast.error(`Erreur: ${res.error}`);
      } else {
        toast.dismiss(loadingToast);
        toast.success("Dépense supprimée avec succès !");
        setExpenseList(expenseList.filter((e) => e.id !== id));
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 bg-slate-50/50 dark:bg-[#0A0C10] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
            <TrendingDown size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestion des Dépenses</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
              Enregistrement et suivi analytique des charges financières de l'établissement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard/finance"
            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <Scale size={16} />
            Bilan Financier Unifié (Recettes vs Dépenses)
          </a>

          <Button
            onClick={() => setShowModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none transition-all hover:scale-[1.02] flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Dépenses</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.total.toLocaleString("fr-FR")} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">FCFA</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1">Cumul total des charges enregistrées</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Dépenses ce Mois</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.monthTotal.toLocaleString("fr-FR")} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">FCFA</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1">Dépenses engagées ce mois-ci</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Nombre de Dépenses</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.count}</p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1">Nombre d'opérations de dépense</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Moyenne par Dépense</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <PieChart size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.average.toLocaleString("fr-FR")} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">FCFA</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1">Coût moyen par facture/dépense</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131622] p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Rechercher une dépense, motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs font-medium focus:bg-white focus:dark:bg-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
          >
            <option value="all">Tous les modes de paiement</option>
            <option value="Espèces">Espèces</option>
            <option value="Chèque">Chèque</option>
            <option value="Virement">Virement Bancaire</option>
            <option value="Mobile Money">Mobile Money</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
              <TrendingDown size={32} />
            </div>
            <div>
              <p className="text-base font-black text-slate-800 dark:text-white">Aucune dépense trouvée</p>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Aucune enregistrement ne correspond aux filtres appliqués. Vous pouvez ajouter une nouvelle dépense ci-dessus.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">
                  <th className="px-6 py-4">Référence</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Motif / Description</th>
                  <th className="px-6 py-4">Mode de Paiement</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExpenses.map((expense) => {
                  const dateStr = expense.dateExpense
                    ? new Date(expense.dateExpense).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        <code className="bg-slate-100 dark:bg-rose-500/10 px-2 py-1 rounded text-rose-700 dark:text-rose-400 font-black">
                          {expense.reference}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-300 font-medium">{dateStr}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                          {expense.category?.name || "Général"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                        {expense.description || "Aucune description"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          {expense.paymentMode || "Espèces"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                        {(expense.amount || 0).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id, expense.reference)}
                          disabled={deletingId === expense.id}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
                        >
                          {deletingId === expense.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Dépense */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0E1017] rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 relative border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Nouvelle Dépense</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Saisissez les informations de la charge</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Référence</label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    required
                    className="h-10 text-xs font-black bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Montant (FCFA) *</label>
                  <Input
                    type="number"
                    placeholder="ex: 50000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="h-10 text-xs font-black text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catégorie de Dépense *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date de Dépense *</label>
                  <Input
                    type="date"
                    value={formData.dateExpense}
                    onChange={(e) => setFormData({ ...formData, dateExpense: e.target.value })}
                    required
                    className="h-10 text-xs font-medium bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Mode de Paiement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode de Paiement</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Mobile Money">Mobile Money</option>
                  </select>
                </div>
              </div>

              {/* Description / Motif */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Motif / Description</label>
                <textarea
                  rows={3}
                  placeholder="Détails du paiement, fournisseur, matériel..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white focus:dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl text-xs font-bold px-4 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-6 shadow-md shadow-rose-200 dark:shadow-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </div>
                  ) : (
                    "Enregistrer la dépense"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
