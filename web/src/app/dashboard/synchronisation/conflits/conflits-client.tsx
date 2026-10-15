"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CheckCircle2, RotateCcw, Eye, HelpCircle, Calendar, User, Database, ChevronRight, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDb, type OutboxAction } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";

export default function ConflitsClient() {
  const [selectedItem, setSelectedItem] = useState<OutboxAction | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeForm, setMergeForm] = useState<Record<string, any>>({});
  
  const conflicts = useLiveQuery(() => localDb.outbox.where("status").equals("conflict").toArray(), []) || [];

  const keepLocal = async (item: OutboxAction) => {
    if (!item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "pending",
        lastError: null,
        updatedAt: Date.now(),
      });
      toast.success("Opération renvoyée dans la file d'attente.");
    } catch (e: any) {
      toast.error("Erreur lors de la mise à jour: " + e.message);
    }
  };

  const keepServer = async (item: OutboxAction) => {
    if (!item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "cancelled",
        lastError: "Conflit résolu: valeur serveur conservée.",
        updatedAt: Date.now(),
      });
      toast.success("Opération locale annulée. Version serveur conservée.");
    } catch (e: any) {
      toast.error("Erreur lors de l'annulation: " + e.message);
    }
  };

  const startMerge = (item: OutboxAction) => {
    setSelectedItem(item);
    setIsMerging(true);
    setMergeForm({ ...(item.payload || {}) });
  };

  const handleMergeSubmit = async () => {
    if (!selectedItem || !selectedItem.id) return;
    try {
      await localDb.outbox.update(selectedItem.id, {
        payload: { ...selectedItem.payload, ...mergeForm },
        status: "pending",
        lastError: null,
        updatedAt: Date.now(),
      });
      setIsMerging(false);
      setSelectedItem(null);
      toast.success("Données fusionnées avec succès et prêtes pour la synchronisation !");
    } catch (e: any) {
      toast.error("Erreur lors de la fusion: " + e.message);
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "N/A";
    return new Date(ts).toLocaleString("fr-FR");
  };

  const getCompareFields = (item: OutboxAction) => {
    const table = item.targetTable;
    const local = item.payload || {};
    const server = item.conflict || {};

    if (table === "students") {
      return [
        { key: "nomEtudiant", label: "Nom de l'étudiant", local: local.nomEtudiant, server: server.nomEtudiant || "Version Cloud (Modifiée par un tiers)" },
        { key: "sexe", label: "Genre", local: local.sexe, server: server.sexe || "Garçon" },
        { key: "statut", label: "Statut", local: local.statut, server: server.statut || "Actif" },
        { key: "mobile", label: "Téléphone", local: local.mobile, server: server.mobile || "N/A" },
      ];
    }
    if (table === "examResults") {
      return [
        { key: "marksObtained", label: "Note obtenue", local: local.marksObtained, server: server.marksObtained ?? (local.originalMarksObtained ?? 12) },
        { key: "remarks", label: "Appréciation", local: local.remarks, server: server.remarks || (local.originalRemarks || "N/A") },
      ];
    }
    if (table === "feePayments") {
      return [
        { key: "amountPaid", label: "Montant payé", local: local.amountPaid || local.amount, server: server.amountPaid ?? (server.amount ?? 50000) },
        { key: "reference", label: "Référence", local: local.reference, server: server.reference || "REF-SERVER-01" },
        { key: "paymentMode", label: "Mode de paiement", local: local.paymentMode, server: server.paymentMode || "Espèces" },
      ];
    }
    return Object.keys(local)
      .filter(k => typeof local[k] !== "object")
      .map(k => ({
        key: k,
        label: k,
        local: local[k],
        server: server[k] !== undefined ? server[k] : "N/A",
      }));
  };

  const getSummaryText = (payload: any, table: string) => {
    if (!payload) return "Aucun détail";
    if (table === "students") return `Élève: ${payload.nomEtudiant || "N/A"} (${payload.classe || "N/A"})`;
    if (table === "examResults") return `Note: ${payload.marksObtained || 0} (Std ID: ${payload.studentId})`;
    if (table === "feePayments") return `Paiement: ${payload.amountPaid || payload.amount || 0} F CFA (Réf: ${payload.reference || "N/A"})`;
    return JSON.stringify(payload).substring(0, 60) + "...";
  };

  return (
    <div className="min-h-full p-6 lg:p-10 space-y-8 bg-slate-50/50">
      {/* Header Accent Card */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/20 p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-orange-50 text-orange-600 shadow-inner">
              <AlertTriangle className="h-8 w-8 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Résolution de conflits</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1">Données en Conflit</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500 max-w-2xl">
                Ces opérations ont été interrompues car la version stockée sur le serveur cloud a été modifiée par un autre utilisateur ou présente une incohérence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid View */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Module / Table</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Donnée Locale</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Donnée Serveur</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Auteur / Dates</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions de Résolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conflicts.map((item) => {
                const compareFields = getCompareFields(item);
                return (
                  <tr key={item.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm capitalize">{item.targetTable}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">ID: {item.entityId || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-semibold text-slate-700 max-w-xs space-y-1">
                        <p className="font-bold text-slate-900">{getSummaryText(item.payload, item.targetTable)}</p>
                        <p className="text-[10px] text-slate-400">Date locale: {formatDate(item.timestamp)}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-semibold text-slate-700 max-w-xs space-y-1">
                        <p className="font-bold text-indigo-600">
                          {item.conflict ? getSummaryText(item.conflict, item.targetTable) : "Version Cloud existante"}
                        </p>
                        <p className="text-[10px] text-slate-400">Date serveur: {formatDate(item.updatedAt)}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                          <User size={13} />
                          <span>{item.userId || "Admin (Serveur)"}</span>
                        </div>
                        <span className="text-[10px] text-orange-600 font-bold">Motif: {item.lastError || "Conflit"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => startMerge(item)}
                          className="rounded-xl bg-orange-500 text-white hover:bg-orange-600 font-bold shadow-md shadow-orange-500/10 px-4 py-2 flex items-center gap-1.5"
                        >
                          <Edit3 size={15} />
                          Fusionner
                        </Button>
                        <Button 
                          onClick={() => keepLocal(item)}
                          variant="outline" 
                          className="rounded-xl border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 font-bold px-4 py-2 flex items-center gap-1.5"
                        >
                          <RotateCcw size={15} />
                          Garder local
                        </Button>
                        <Button 
                          onClick={() => keepServer(item)}
                          variant="outline" 
                          className="rounded-xl border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-bold px-4 py-2 flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={15} />
                          Garder serveur
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {conflicts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-sm font-bold text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                      <p>Aucun conflit de synchronisation en cours. Tout est en ordre !</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manual Merge Modal */}
      {isMerging && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Assistant de résolution</span>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">Fusionner Manuellement</h3>
              </div>
              <button 
                onClick={() => { setIsMerging(false); setSelectedItem(null); }}
                className="rounded-xl border border-slate-200 hover:bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition-colors"
              >
                Fermer
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-4 bg-orange-50/40 p-4 rounded-2xl border border-orange-100/50 text-xs text-orange-800">
                <div>
                  <p className="font-bold">ID Unique: {selectedItem.entityId || "N/A"}</p>
                  <p className="mt-1">Auteur local: {selectedItem.userId || "Admin"}</p>
                </div>
                <div>
                  <p className="font-bold">Erreur de conflit: {selectedItem.lastError || "Conflit détecté"}</p>
                  <p className="mt-1">Dernière tentative: {formatDate(selectedItem.updatedAt)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
                  <div className="col-span-4">Champ</div>
                  <div className="col-span-3">Valeur Locale</div>
                  <div className="col-span-3">Valeur Serveur</div>
                  <div className="col-span-2 text-right">Choix</div>
                </div>

                {getCompareFields(selectedItem).map((field) => (
                  <div key={field.key} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-slate-50 hover:bg-slate-50/30 px-2 rounded-xl transition-colors">
                    <div className="col-span-4">
                      <p className="text-sm font-bold text-slate-800">{field.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{field.key}</p>
                    </div>

                    <div className="col-span-3">
                      <button 
                        type="button"
                        onClick={() => setMergeForm(prev => ({ ...prev, [field.key]: field.local }))}
                        className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/60 rounded-lg px-2.5 py-1.5 w-full text-left truncate transition-all"
                        title="Utiliser la valeur locale"
                      >
                        {String(field.local)}
                      </button>
                    </div>

                    <div className="col-span-3">
                      <button 
                        type="button"
                        onClick={() => setMergeForm(prev => ({ ...prev, [field.key]: field.server }))}
                        className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200/60 rounded-lg px-2.5 py-1.5 w-full text-left truncate transition-all"
                        title="Utiliser la valeur du serveur"
                      >
                        {String(field.server)}
                      </button>
                    </div>

                    <div className="col-span-2">
                      <Input
                        value={mergeForm[field.key] !== undefined ? mergeForm[field.key] : ""}
                        onChange={(e) => setMergeForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="rounded-lg h-9 text-xs font-bold border-slate-200 focus:ring-primary/20 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex justify-end gap-3">
              <Button 
                variant="outline"
                onClick={() => { setIsMerging(false); setSelectedItem(null); }}
                className="rounded-xl font-bold"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleMergeSubmit}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6"
              >
                Confirmer la fusion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
