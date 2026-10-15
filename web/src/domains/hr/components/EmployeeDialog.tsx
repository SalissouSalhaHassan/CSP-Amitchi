"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEmployee, updateEmployee } from "@/domains/hr/actions/employees.actions";
import { EmployeeFormData } from "../validators/employee.schema";
import { useSpeech } from "@/hooks/use-speech";
import { X, User, Phone, Briefcase, Landmark, Loader2 } from "lucide-react";

interface EmployeeDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
}

// ─── Field Group ────────────────────────────────────────────────────────────
function FieldGroup({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span ?? ""}`}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} shadow-sm`}
      >
        {icon}
      </span>
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
        {label}
      </h3>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-medium text-slate-800 dark:text-white shadow-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950";

const selectCls =
  "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-medium text-slate-800 dark:text-white shadow-sm outline-none cursor-pointer focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 appearance-none";

// ─── Main Component ─────────────────────────────────────────────────────────
export default function EmployeeDialog({
  mode = "add",
  initialData,
  trigger,
  open: controlledOpen,
  onClose,
}: EmployeeDialogProps) {
  const [open, setOpen] = useState(controlledOpen ?? false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { speak } = useSpeech();

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  // Mount guard for SSR — createPortal only works client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (controlledOpen !== undefined) {
      setOpen(controlledOpen);
    }
  }, [controlledOpen]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      speak(
        mode === "add"
          ? "Nouvel employé. Veuillez remplir le formulaire."
          : "Modification de l'employé.",
        "fr-FR"
      );
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, mode, speak]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        if (onClose) onClose();
      }
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const parseSalaire = () => {
      const v = form.get("salaireBase");
      if (v === "" || v === null || v === undefined) return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    const data: EmployeeFormData = {
      empId: form.get("empId") as string,
      nom: form.get("nom") as string,
      poste: (form.get("poste") as string) || undefined,
      departement: (form.get("departement") as string) || undefined,
      mobile: (form.get("mobile") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      dateEmbauche: (form.get("dateEmbauche") as string) || undefined,
      salaireBase: parseSalaire(),
      sexe: ((form.get("sexe") as string) || undefined) as
        | "Homme"
        | "Femme"
        | undefined,
      dateNaissance: (form.get("dateNaissance") as string) || undefined,
      cnic: (form.get("cnic") as string) || undefined,
      adresse: (form.get("adresse") as string) || undefined,
      banqueNom: (form.get("banqueNom") as string) || undefined,
      banqueCompte: (form.get("banqueCompte") as string) || undefined,
      statut: (form.get("statut") as string) || "Actif",
      educationalLevel: (() => {
        const levels = form.getAll("educationalLevels") as string[];
        return levels.length === 5 || levels.length === 0 ? "Tous" : levels.join(",");
      })(),
      lieuNaissance: (form.get("lieuNaissance") as string) || undefined,
      codeGrade: (form.get("codeGrade") as string) || undefined,
      categorie: (form.get("categorie") as string) || undefined,
      classe: (form.get("classe") as string) || undefined,
      echelon: (form.get("echelon") as string) || undefined,
      fonction: (form.get("fonction") as string) || undefined,
      dateNomination: (form.get("dateNomination") as string) || undefined,
      lieuAffectation: (form.get("lieuAffectation") as string) || undefined,
      commune: (form.get("commune") as string) || undefined,
      region: (form.get("region") as string) || undefined,
      dateAffectation: (form.get("dateAffectation") as string) || undefined,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateEmployee(initialData.id, data);
    } else {
      result = await createEmployee(data);
    }

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      handleClose();
    }
  }

  // ─── Modal JSX ────────────────────────────────────────────────────────────
  const modal = (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[200] bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-[3px]"
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Modifier l'Employé" : "Nouvel Employé"}
        className="fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2
                   w-[96vw] max-w-[1100px] max-h-[92vh]
                   flex flex-col
                   rounded-3xl bg-white dark:bg-[#131622] text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-800
                   shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25)]
                   overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── Sticky Header ── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622] shrink-0">
          <div className="flex items-center gap-4">
            <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-0.5">
                Ressources Humaines
              </p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {mode === "edit" ? "Modifier l'Employé" : "Nouvel Employé"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Error */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* ════ 1. IDENTITÉ ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<User size={16} className="text-indigo-600" />}
                label="Identité"
                color="bg-indigo-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FieldGroup label="ID Employé *">
                  <Input
                    name="empId"
                    defaultValue={initialData?.empId}
                    required
                    placeholder="EMP-001"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Nom complet *">
                  <Input
                    name="nom"
                    defaultValue={initialData?.nom}
                    required
                    placeholder="Prénom NOM"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Sexe">
                  <select
                    name="sexe"
                    defaultValue={initialData?.sexe ?? ""}
                    className={selectCls}
                  >
                    <option value="">— Sélectionner —</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FieldGroup label="Date de naissance">
                  <Input
                    type="date"
                    name="dateNaissance"
                    defaultValue={initialData?.dateNaissance ?? ""}
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Lieu de naissance">
                  <Input
                    name="lieuNaissance"
                    defaultValue={initialData?.lieuNaissance ?? ""}
                    placeholder="Ville, Pays"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Numéro de Carte d'Identité (CNIC)">
                  <Input
                    name="cnic"
                    defaultValue={initialData?.cnic ?? ""}
                    placeholder="N° national / passeport"
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ════ 2. CONTACT & ADRESSE ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Phone size={16} className="text-emerald-600" />}
                label="Contact & Adresse"
                color="bg-emerald-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldGroup label="Téléphone Mobile">
                  <Input
                    name="mobile"
                    defaultValue={initialData?.mobile ?? ""}
                    placeholder="+227 90 00 00 00"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Adresse E-mail">
                  <Input
                    type="email"
                    name="email"
                    defaultValue={initialData?.email ?? ""}
                    placeholder="exemple@ecole.ne"
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Adresse Physique">
                <Textarea
                  name="adresse"
                  defaultValue={initialData?.adresse ?? ""}
                  placeholder="Quartier, ville, pays..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </FieldGroup>
            </section>

            {/* ════ 3. CLASSIFICATION & GRADE ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Briefcase size={16} className="text-amber-600" />}
                label="Classification & Grade (Grade de l'Agent)"
                color="bg-amber-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FieldGroup label="Code Grade">
                  <Input
                    name="codeGrade"
                    defaultValue={initialData?.codeGrade ?? ""}
                    placeholder="G1, G2..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Catégorie">
                  <Input
                    name="categorie"
                    defaultValue={initialData?.categorie ?? ""}
                    placeholder="A, B, C..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Classe">
                  <Input
                    name="classe"
                    defaultValue={initialData?.classe ?? ""}
                    placeholder="1ère, 2ème..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Échelon">
                  <Input
                    name="echelon"
                    defaultValue={initialData?.echelon ?? ""}
                    placeholder="E1, E2..."
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ════ 4. POSTE OCCUPÉ ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Briefcase size={16} className="text-indigo-600" />}
                label="Poste Occupé"
                color="bg-indigo-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FieldGroup label="Poste / Titre">
                  <Input
                    name="poste"
                    defaultValue={initialData?.poste ?? ""}
                    placeholder="Enseignant, Comptable..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Fonction">
                  <Input
                    name="fonction"
                    defaultValue={initialData?.fonction ?? ""}
                    placeholder="Directeur, Prof Principal..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Date de Nomination">
                  <Input
                    type="date"
                    name="dateNomination"
                    defaultValue={initialData?.dateNomination ?? ""}
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ════ 5. AFFECTATION ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Briefcase size={16} className="text-emerald-600" />}
                label="Affectation"
                color="bg-emerald-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FieldGroup label="Lieu d'Affectation">
                  <Input
                    name="lieuAffectation"
                    defaultValue={initialData?.lieuAffectation ?? ""}
                    placeholder="Nom du campus / école"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Commune">
                  <Input
                    name="commune"
                    defaultValue={initialData?.commune ?? ""}
                    placeholder="Nom de la commune"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Département">
                  <Input
                    name="departement"
                    defaultValue={initialData?.departement ?? ""}
                    placeholder="Département ou Service"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Région">
                  <Input
                    name="region"
                    defaultValue={initialData?.region ?? ""}
                    placeholder="Région"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Date d'Affectation">
                  <Input
                    type="date"
                    name="dateAffectation"
                    defaultValue={initialData?.dateAffectation ?? ""}
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Date d'embauche">
                  <Input
                    type="date"
                    name="dateEmbauche"
                    defaultValue={initialData?.dateEmbauche ?? ""}
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
              
              <div className="grid grid-cols-1 gap-5 mt-4">
                <FieldGroup label="Niveau Éducatif / Secteur">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-1">
                    {[
                      { id: "Maternelle", label: "🌱 Maternelle" },
                      { id: "Primaire", label: "📚 Primaire" },
                      { id: "Collège", label: "🏫 Collège" },
                      { id: "Lycée", label: "🎓 Lycée" },
                      { id: "Supérieur", label: "🎓 Supérieur" },
                    ].map((level) => {
                      const selectedLevels = initialData?.educationalLevel
                        ? initialData.educationalLevel.split(",")
                        : ["Tous"];
                      const isChecked = selectedLevels.includes(level.id) || selectedLevels.includes("Tous");
                      return (
                        <label
                          key={level.id}
                          className="relative flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:checked]:shadow-sm"
                        >
                          <input
                            type="checkbox"
                            name="educationalLevels"
                            value={level.id}
                            defaultChecked={isChecked}
                            className="sr-only"
                          />
                          {level.label}
                        </label>
                      );
                    })}
                  </div>
                </FieldGroup>
                <FieldGroup label="Statut du contrat">
                  <div className="flex gap-3">
                    {(["Actif", "Inactif", "En Attente"] as const).map((s) => (
                      <label
                        key={s}
                        className="relative flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:checked]:shadow-sm"
                      >
                        <input
                          type="radio"
                          name="statut"
                          value={s}
                          defaultChecked={(initialData?.statut ?? "Actif") === s}
                          className="sr-only"
                        />
                        <span className="text-base">
                          {s === "Actif" ? "✅" : s === "Inactif" ? "❌" : "⏳"}
                        </span>
                        {s}
                      </label>
                    ))}
                  </div>
                </FieldGroup>
              </div>
            </section>

            {/* ════ 4. FINANCES & BANQUE ════ */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Landmark size={16} className="text-violet-600" />}
                label="Finances & Banque"
                color="bg-violet-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FieldGroup label="Salaire de Base (FCFA)">
                  <Input
                    type="number"
                    name="salaireBase"
                    min={0}
                    step={500}
                    defaultValue={initialData?.salaireBase ?? ""}
                    placeholder="0"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Nom de la Banque">
                  <Input
                    name="banqueNom"
                    defaultValue={initialData?.banqueNom ?? ""}
                    placeholder="BIA, Ecobank..."
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="Numéro de Compte">
                  <Input
                    name="banqueCompte"
                    defaultValue={initialData?.banqueCompte ?? ""}
                    placeholder="NE XX XXXX XXXX"
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
            </section>
          </form>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#131622]">
          <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
            Les champs <span className="text-rose-500 font-bold">*</span> sont
            obligatoires
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="employee-form"
              disabled={loading}
              className="h-11 px-8 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enregistrement...
                </>
              ) : mode === "edit" ? (
                "💾 Mettre à jour"
              ) : (
                "✅ Enregistrer"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button
            type="button"
            className="rounded-2xl px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 shadow-lg transition-all font-bold text-sm flex items-center gap-2"
          >
            <User size={15} />
            Ajouter un employé
          </button>
        )}
      </div>

      {/* Portal — rendered only on client when open */}
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
