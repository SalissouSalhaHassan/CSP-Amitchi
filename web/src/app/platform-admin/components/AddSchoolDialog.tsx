"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchool } from "@/domains/platform/actions/platform.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Building2, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function AddSchoolDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "basic" as "basic" | "premium" | "enterprise",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSchool(formData);
        if (res.success) {
          toast.success("L'école a été créée avec succès !");
          setOpen(false);
          setFormData({ name: "", slug: "", plan: "basic" });
          router.refresh();
        } else {
          toast.error(res.error || "Une erreur est survenue.");
        }
      } catch (error: any) {
        toast.error(error.message || "Erreur de connexion.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <div className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 border-none transition-all flex items-center gap-2 active:scale-95 cursor-pointer" />
        }
        nativeButton={false}
      >
        <Plus size={16} />
        Ajouter une école
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
            <Building2 size={32} />
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Nouvelle École</DialogTitle>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Enregistrez un nouvel établissement sur la plateforme.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nom de l'Établissement</Label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input
                id="name"
                placeholder="Ex: Lycée Moderne d'Abidjan"
                className="pl-11 h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase()
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '');
                  setFormData(prev => ({ ...prev, name, slug }));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nom de Domaine (Slug)</Label>
            <div className="relative group">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input
                id="slug"
                placeholder="nom-ecole"
                className="pl-11 h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all font-black text-indigo-600 dark:text-indigo-400"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">.edut.pro</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Forfait d'Abonnement</Label>
            <Select 
              value={formData.plan} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, plan: value }))}
            >
              <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold">
                <SelectValue placeholder="Choisir un forfait" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-2 shadow-xl">
                <SelectItem value="basic" className="rounded-xl font-bold p-3 dark:hover:bg-slate-700">Basic (Gratuit)</SelectItem>
                <SelectItem value="premium" className="rounded-xl font-bold p-3 text-amber-600 dark:text-amber-400 dark:hover:bg-slate-700">Premium</SelectItem>
                <SelectItem value="enterprise" className="rounded-xl font-bold p-3 text-indigo-600 dark:text-indigo-400 dark:hover:bg-slate-700">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 border-none flex items-center justify-center gap-3"
            >
              {isPending ? (
                <Loader2 className="animate-spin size-5" />
              ) : (
                <>
                  <Sparkles size={18} />
                  Créer l'Espace École
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
