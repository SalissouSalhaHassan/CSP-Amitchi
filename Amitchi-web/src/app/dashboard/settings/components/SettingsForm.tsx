"use client";

import { useTransition } from "react";
import { saveSettings, updateSchoolDomain } from "@/domains/settings/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SettingsForm({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const settingsData: Record<string, string> = {};
    const customDomain = formData.get("custom_domain");

    formData.forEach((value, key) => {
      if (typeof value === "string" && key && key !== "custom_domain") {
        settingsData[key] = value;
      }
    });

    startTransition(async () => {
      try {
        // Save regular settings if any exist
        if (Object.keys(settingsData).length > 0) {
          await saveSettings(settingsData);
        }
        
        // Save custom domain only when explicitly changed/present (not null or undefined)
        if (customDomain !== null && typeof customDomain === "string") {
          const trimmed = customDomain.trim();
          if (trimmed.length > 0) {
            await updateSchoolDomain(trimmed);
          }
        }
        
        toast.success("Paramètres enregistrés avec succès");
      } catch (error: any) {
        toast.error(`Erreur: ${error.message}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Configuration</h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez les paramètres globaux de votre établissement</p>
        </div>
        <Button 
          type="submit" 
          disabled={isPending}
          className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-2 hover:bg-primary transition-all"
        >
           {isPending ? <Loader2 className="animate-spin" size={18} /> : "Enregistrer Tout"}
        </Button>
      </div>
      {children}
    </form>
  );
}
