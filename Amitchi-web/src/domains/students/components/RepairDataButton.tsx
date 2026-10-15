"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { fixStudentLevels } from "../actions/students.actions";
import { toast } from "sonner";

export default function RepairDataButton() {
  const [loading, setLoading] = useState(false);

  const handleRepair = async () => {
    if (!confirm("Voulez-vous corriger automatiquement les niveaux incorrects (Niveau vs Classe) ?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fixStudentLevels();
      if (res.success) {
        const fixedCount = (res as any).fixedCount || 0;
        toast.success(`${fixedCount} enregistrements corrigés !`, {
          description: "Les incohérences entre Niveau et Classe ont été réparées.",
        });
      } else {
        toast.error("Erreur lors de la réparation", {
          description: res.error || "Une erreur est survenue.",
        });
      }
    } catch (err) {
      toast.error("Erreur critique", {
        description: "Impossible de communiquer avec le serveur.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleRepair}
      disabled={loading}
      className="h-12 px-4 bg-white rounded-2xl border border-rose-100 text-rose-500 font-bold shadow-sm hover:bg-rose-50 flex items-center gap-2 transition-all disabled:opacity-50"
      title="Réparer les incohérences Niveau/Classe"
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
      <span className="hidden lg:inline">Réparer</span>
    </button>
  );
}
