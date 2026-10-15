"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createLibraryBook,
  updateLibraryBook,
} from "@/domains/library/actions/library.actions";
import { LibraryBookFormData } from "../validators/library.schema";
import {
  Book,
  Bookmark,
  FileText,
  Globe,
  Layers,
  Link as LinkIcon,
  Plus,
  Sparkles,
} from "lucide-react";

interface BookDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

const ACADEMIC_CATEGORIES = [
  "Sciences Juridiques & Politiques",
  "Informatique & IA",
  "Mathématiques",
  "Économie & Gestion",
  "Médecine & Santé",
  "Histoire & Sociologie",
  "Littérature & Langues",
  "Sciences Fondamentales",
  "Manuels Scolaires & Annales",
  "Thèses & Mémoires",
  "Autre",
];

export default function BookDialog({
  mode = "add",
  initialData,
  trigger,
}: BookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDigitalState, setIsDigitalState] = useState(
    initialData?.isDigital === "true" || !!initialData?.fileUrl
  );
  const [fileUrl, setFileUrl] = useState(initialData?.fileUrl || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const isDig = isDigitalState;
    const data: LibraryBookFormData = {
      title: form.get("title") as string,
      author: (form.get("author") as string) || null,
      isbn: (form.get("isbn") as string) || null,
      category: (form.get("category") as string) || "Général",
      totalQuantity: isDig ? 9999 : Number(form.get("totalQuantity")) || 1,
      shelfLocation:
        (form.get("shelfLocation") as string) ||
        (isDig ? "Serveur Cloud" : "Rayon Général"),
      fileUrl: isDig ? fileUrl || (form.get("fileUrl") as string) || null : null,
      fileType: isDig ? (form.get("fileType") as string) || "PDF" : null,
      isDigital: isDig ? "true" : "false",
      description: (form.get("description") as string) || null,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateLibraryBook(initialData.id, data);
    } else {
      result = await createLibraryBook(data);
    }

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="h-12 rounded-2xl px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xl shadow-slate-200 dark:shadow-none transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
            <Plus size={16} />
            <span>Ajouter une Ressource / Livre</span>
          </button>
        )}
      </div>

      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Book size={20} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Fonds & Catalogage
              </p>
              <DialogTitle className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {mode === "edit"
                  ? "Modifier la Ressource Documentaire"
                  : "Nouvelle Ressource Documentaire"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 px-5 py-3.5 rounded-2xl text-xs font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Format Selection: Physical vs Digital */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Format & Support du document *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setIsDigitalState(false)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    !isDigitalState
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-950 dark:text-indigo-200 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="text-2xl">📖</span>
                  <div>
                    <p className="text-xs font-black uppercase">Livre Physique</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Fonds en rayonnage, gestion d&apos;exemplaires et prêts
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsDigitalState(true)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    isDigitalState
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-950 dark:text-indigo-200 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="text-2xl">💻</span>
                  <div>
                    <p className="text-xs font-black uppercase">Numérique (E-Book)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Fichier PDF, e-book ou lien web, consultation illimitée
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Author */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Titre de l&apos;ouvrage / Document *
              </Label>
              <Input
                name="title"
                defaultValue={initialData?.title}
                required
                placeholder="ex: Droit Constitutionnel & Institutions Africaines"
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  Auteur(s) / Organisme éditeur
                </Label>
                <Input
                  name="author"
                  defaultValue={initialData?.author}
                  placeholder="ex: Pr. Mamadou Traoré / UNESCO"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-xs font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  ISBN / Cote de référence
                </Label>
                <Input
                  name="isbn"
                  defaultValue={initialData?.isbn}
                  placeholder="ex: 978-2-8418-0112-4"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-xs font-mono font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  Discipline & Catégorie académique
                </Label>
                <select
                  name="category"
                  defaultValue={initialData?.category || ACADEMIC_CATEGORIES[0]}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 h-11 text-xs font-semibold outline-none"
                >
                  {ACADEMIC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  Emplacement / Rayon de classement
                </Label>
                <Input
                  name="shelfLocation"
                  defaultValue={initialData?.shelfLocation}
                  placeholder={
                    isDigitalState ? "ex: Serveur Cloud / Biblio-Num" : "ex: Rayon B2 - Étagère 4"
                  }
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-xs font-medium"
                />
              </div>
            </div>

            {/* Digital specific fields */}
            {isDigitalState && (
              <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400">
                      Ressource Numérique & Consultation
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Accès direct en ligne
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
                      URL / Lien du document (PDF ou Web)
                    </Label>
                    <Input
                      name="fileUrl"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://... ou document.pdf"
                      className="rounded-xl border-slate-200 dark:border-slate-800 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
                      Format Fichier
                    </Label>
                    <select
                      name="fileType"
                      defaultValue={initialData?.fileType || "PDF"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 h-10 text-xs font-bold outline-none"
                    >
                      <option value="PDF">PDF (Document)</option>
                      <option value="EPUB">EPUB / E-Book</option>
                      <option value="LINK">Lien Web / Portail</option>
                      <option value="AUDIO">Audio / Podcast</option>
                      <option value="VIDEO">Vidéo / Mooc</option>
                    </select>
                  </div>
                </div>

                {/* Quick Helper presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold">Suggestions libres:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFileUrl(
                        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                      )
                    }
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-indigo-600 font-medium"
                  >
                    Exemple PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFileUrl("https://unesdoc.unesco.org/ark:/48223/pf0000042698")
                    }
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-indigo-600 font-medium"
                  >
                    Archive UNESCO
                  </button>
                </div>
              </div>
            )}

            {/* Physical specific fields */}
            {!isDigitalState && (
              <div className="space-y-2 w-full sm:w-1/2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  Nombre d&apos;exemplaires en stock physique *
                </Label>
                <Input
                  name="totalQuantity"
                  type="number"
                  min={1}
                  defaultValue={initialData?.totalQuantity || 1}
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11 text-sm font-semibold"
                />
              </div>
            )}

            {/* Abstract / Summary */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Résumé & Description du document
              </Label>
              <textarea
                name="description"
                defaultValue={initialData?.description}
                rows={3}
                placeholder="Présentation synthétique de l'ouvrage, mots-clés, public cible..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-500/20 dark:shadow-none"
            >
              {loading
                ? "Enregistrement..."
                : mode === "edit"
                ? "Mettre à jour"
                : "Enregistrer la Ressource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
