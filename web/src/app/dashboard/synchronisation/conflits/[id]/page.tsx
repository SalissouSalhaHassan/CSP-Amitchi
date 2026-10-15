"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  AlertTriangle, RotateCcw, CheckCircle2, ArrowLeft, 
  HelpCircle, Calendar, User, Database, Check, Edit3 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDb, type OutboxAction } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";

export default function ConflictDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idStr = params?.id as string;
  const conflictId = idStr ? parseInt(idStr) : NaN;

  const [item, setItem] = useState<OutboxAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergeForm, setMergeForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isNaN(conflictId)) {
      localDb.outbox.get(conflictId).then((res) => {
        if (res) {
          setItem(res);
          setMergeForm({ ...(res.payload || {}) });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [conflictId]);

  const keepLocal = async () => {
    if (!item || !item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "pending sync",
        lastError: null,
        updatedAt: Date.now(),
      });
      toast.success("Opération locale conservée et remise dans la file de synchronisation.");
      router.push("/dashboard/synchronisation");
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    }
  };

  const keepServer = async () => {
    if (!item || !item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "cancelled",
        lastError: "Conflit résolu : version du serveur cloud conservée.",
        updatedAt: Date.now(),
      });
      toast.success("Opération locale annulée. La version serveur est préservée.");
      router.push("/dashboard/synchronisation");
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    }
  };

  const handleMergeSubmit = async () => {
    if (!item || !item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        payload: { ...item.payload, ...mergeForm },
        status: "pending sync",
        lastError: null,
        updatedAt: Date.now(),
      });
      toast.success("Données fusionnées avec succès ! Remis en file d'attente.");
      router.push("/dashboard/synchronisation");
    } catch (e: any) {
      toast.error("Erreur de fusion : " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-bold text-sm">
        <RefreshCw className="animate-spin mr-2 h-4 w-4" /> Chargement du conflit...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <AlertTriangle className="text-rose-500 h-12 w-12" />
        <h3 className="text-lg font-black text-slate-900">Conflit introuvable</h3>
        <p className="text-xs text-slate-500 font-bold">L'élément recherché a été synchronisé, supprimé ou résolu.</p>
        <Link href="/dashboard/synchronisation" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1">
          <ArrowLeft size={14} /> Retour à la synchronisation
        </Link>
      </div>
    );
  }

  // Fields builder
  const table = item.targetTable;
  const localVal = item.payload || {};
  const serverVal = item.conflict || {};

  const fields = Object.keys(localVal)
    .filter(k => typeof localVal[k] !== "object")
    .map(k => {
      let label = k;
      if (k === "nomEtudiant") label = "Nom & Prénoms";
      if (k === "sexe") label = "Genre / Sexe";
      if (k === "statut") label = "Statut de l'enregistrement";
      if (k === "amount") label = "Montant de la transaction";
      if (k === "reference") label = "Référence unique";
      return {
        key: k,
        label,
        local: localVal[k],
        server: serverVal[k] !== undefined ? serverVal[k] : "Introuvable / Non défini"
      };
    });

  return (
    <div className="min-h-screen p-6 lg:p-10 space-y-8 bg-slate-50/50">
      
      {/* Navigation and Title */}
      <div className="max-w-4xl mx-auto space-y-4">
        <Link href="/dashboard/synchronisation" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition">
          <ArrowLeft size={14} /> Retour au centre de synchronisation
        </Link>

        <section className="relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-white p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/5 blur-3xl" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-orange-50 text-orange-600 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Résolution fine de conflit</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Conflit sur {item.targetTable}</h1>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  Entité ID: {item.entityId || "N/A"} · Modifié localement le {new Date(item.timestamp).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Main Form Comparison Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6">
        
        {/* Comparison Board Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
          <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-100 text-xs text-orange-800 space-y-1.5">
            <p className="font-bold">Motif du conflit : {item.lastError || "Double modification détectée"}</p>
            <p className="font-medium leading-relaxed">
              Pour chaque attribut ci-dessous, sélectionnez la valeur locale (bouton gauche) ou la valeur du serveur (bouton droit), ou saisissez directement une valeur personnalisée dans le champ de saisie de droite avant de valider.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 px-2">
              <div className="col-span-4">Attribut / Champ</div>
              <div className="col-span-3">Version Locale (Hors-ligne)</div>
              <div className="col-span-3">Version Cloud (Serveur)</div>
              <div className="col-span-2 text-right">Valeur Arbitrée</div>
            </div>

            {fields.map((f) => (
              <div key={f.key} className="grid grid-cols-12 gap-4 items-center py-3.5 border-b border-slate-50 hover:bg-slate-50/20 px-2 rounded-xl transition-colors">
                <div className="col-span-4">
                  <p className="text-xs font-black text-slate-800">{f.label}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{f.key}</p>
                </div>

                <div className="col-span-3">
                  <button 
                    type="button"
                    onClick={() => setMergeForm(prev => ({ ...prev, [f.key]: f.local }))}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/50 rounded-xl px-3 py-2 w-full text-left truncate transition-all"
                    title="Sélectionner la version locale"
                  >
                    {String(f.local)}
                  </button>
                </div>

                <div className="col-span-3">
                  <button 
                    type="button"
                    onClick={() => setMergeForm(prev => ({ ...prev, [f.key]: f.server }))}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200/50 rounded-xl px-3 py-2 w-full text-left truncate transition-all"
                    title="Sélectionner la version du serveur"
                  >
                    {String(f.server)}
                  </button>
                </div>

                <div className="col-span-2">
                  <Input
                    value={mergeForm[f.key] !== undefined ? mergeForm[f.key] : ""}
                    onChange={(e) => setMergeForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="rounded-xl h-10 text-xs font-black text-slate-800 border-slate-250 focus:ring-primary/20 text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={keepLocal}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-750 font-bold px-5"
              >
                <RotateCcw className="mr-2 h-4 w-4 text-indigo-500" /> Garder Local
              </Button>
              <Button 
                onClick={keepServer}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-750 font-bold px-5"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-rose-500" /> Garder Serveur
              </Button>
            </div>

            <Button 
              onClick={handleMergeSubmit}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-6"
            >
              <Edit3 className="mr-2 h-4 w-4" /> Enregistrer la Fusion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Spinner helper
function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
