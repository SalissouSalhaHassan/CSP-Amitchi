"use client";

import React, { useState, useTransition } from "react";
import { 
  Globe2, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  FileDown, 
  Building2, 
  FileText, 
  Trash2, 
  Edit3, 
  ArrowRight,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  saveCreditEquivalence, 
  deleteCreditEquivalence, 
  CreditEquivalenceInput 
} from "@/domains/academics/actions/lmd-equivalences.actions";
import { 
  generateAttestationEquivalencePDF, 
  EquivalenceCertificateParams 
} from "@/domains/academics/utils/lmd-equivalence-attestation-generator";

interface EquivalenceItem {
  id: number;
  schoolId?: number | null;
  studentId?: number | null;
  originInstitution: string;
  originCountry?: string | null;
  originProgram?: string | null;
  academicYear?: string | null;
  targetProgramId?: number | null;
  targetLevel?: string | null;
  targetSemester?: string | null;
  creditsTransferred: number;
  equivalentUesJson?: string | null;
  decision?: string | null;
  decisionDate?: Date | string | null;
  commissionPresident?: string | null;
  commissionComments?: string | null;
  certificateNumber?: string | null;
  studentNom?: string | null;
  studentMatricule?: string | null;
  programName?: string | null;
}

interface StudentOption {
  id: number;
  nom: string;
  matricule: string;
}

interface ProgramOption {
  id: number;
  name: string;
  level?: string | null;
}

export function EquivalencesClient({
  initialEquivalences,
  studentsList,
  programsList,
}: {
  initialEquivalences: EquivalenceItem[];
  studentsList: StudentOption[];
  programsList: ProgramOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquivalenceItem | null>(null);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [originInstitution, setOriginInstitution] = useState("");
  const [originCountry, setOriginCountry] = useState("Burkina Faso");
  const [originProgram, setOriginProgram] = useState("Licence Informatique (L1)");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [targetProgramId, setTargetProgramId] = useState<number>(programsList[0]?.id || 0);
  const [targetLevel, setTargetLevel] = useState("L2");
  const [targetSemester, setTargetSemester] = useState("S3");
  const [creditsTransferred, setCreditsTransferred] = useState(60);
  const [decision, setDecision] = useState("Validé");
  const [commissionPresident, setCommissionPresident] = useState("Prof. Dr. Ousmane Mahamane");
  const [commissionComments, setCommissionComments] = useState("Dispense totale des semestres S1 et S2. Admission directe en Licence 2 (S3).");

  // Filtered list
  const filtered = initialEquivalences.filter((eq) => {
    const term = search.toLowerCase();
    const matchSearch =
      (eq.studentNom || "").toLowerCase().includes(term) ||
      (eq.studentMatricule || "").toLowerCase().includes(term) ||
      (eq.originInstitution || "").toLowerCase().includes(term) ||
      (eq.programName || "").toLowerCase().includes(term);

    const matchLevel = filterLevel === "ALL" || eq.targetLevel === filterLevel;
    return matchSearch && matchLevel;
  });

  // Summary Metrics
  const totalCredits = initialEquivalences.reduce((acc, curr) => acc + (curr.creditsTransferred || 0), 0);
  const totalApproved = initialEquivalences.filter((e) => e.decision === "Validé").length;
  const uniqueOrigins = new Set(initialEquivalences.map((e) => e.originInstitution)).size;

  const handleOpenNew = () => {
    setEditingItem(null);
    setSelectedStudentId(studentsList[0]?.id || 0);
    setOriginInstitution("Université Joseph Ki-Zerbo");
    setOriginCountry("Burkina Faso");
    setOriginProgram("Licence 1 Sciences Informatiques");
    setAcademicYear("2024-2025");
    setTargetProgramId(programsList[0]?.id || 0);
    setTargetLevel("L2");
    setTargetSemester("S3");
    setCreditsTransferred(60);
    setDecision("Validé");
    setCommissionPresident("Prof. Dr. Ousmane Mahamane");
    setCommissionComments("Dispense totale des semestres S1 et S2 (60 ECTS). Admission directe en Licence 2 (S3).");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EquivalenceItem) => {
    setEditingItem(item);
    setSelectedStudentId(item.studentId || studentsList[0]?.id || 0);
    setOriginInstitution(item.originInstitution || "");
    setOriginCountry(item.originCountry || "International");
    setOriginProgram(item.originProgram || "");
    setAcademicYear(item.academicYear || "2024-2025");
    setTargetProgramId(item.targetProgramId || programsList[0]?.id || 0);
    setTargetLevel(item.targetLevel || "L2");
    setTargetSemester(item.targetSemester || "S3");
    setCreditsTransferred(item.creditsTransferred || 60);
    setDecision(item.decision || "Validé");
    setCommissionPresident(item.commissionPresident || "Président Commission");
    setCommissionComments(item.commissionComments || "");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedStudentId || !originInstitution || !targetProgramId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    startTransition(async () => {
      const payload: CreditEquivalenceInput = {
        id: editingItem?.id,
        studentId: Number(selectedStudentId),
        originInstitution,
        originCountry,
        originProgram,
        academicYear,
        targetProgramId: Number(targetProgramId),
        targetLevel,
        targetSemester,
        creditsTransferred: Number(creditsTransferred),
        decision,
        commissionPresident,
        commissionComments,
      };

      const res = await saveCreditEquivalence(payload);
      if (res.success) {
        toast.success("Dossier d'équivalence enregistré avec succès");
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce dossier d'équivalence ?")) return;
    startTransition(async () => {
      const res = await deleteCreditEquivalence(id);
      if (res.success) {
        toast.success("Équivalence supprimée");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  const handleExportPDF = async (item: EquivalenceItem) => {
    try {
      setExportingId(item.id);
      const payload: EquivalenceCertificateParams = {
        equivalence: {
          id: item.id,
          certificateNumber: item.certificateNumber || `EQ-ECTS-${item.id}-2026`,
          originInstitution: item.originInstitution,
          originCountry: item.originCountry || "International",
          originProgram: item.originProgram || "Cursus Universitaire",
          academicYear: item.academicYear || "2024-2025",
          targetProgramName: item.programName || "Licence Générale",
          targetLevel: item.targetLevel || "L2",
          targetSemester: item.targetSemester || "S3",
          creditsTransferred: item.creditsTransferred || 60,
          decision: item.decision || "Validé",
          decisionDate: item.decisionDate ? String(item.decisionDate) : undefined,
          commissionPresident: item.commissionPresident || "Prof. Dr. Ousmane Mahamane",
          commissionComments: item.commissionComments || "",
          recognizedCourses: [
            { codeUe: "UE1.1", nameUe: "Algorithmique & Structures de Données", creditsEcts: 6, gradeObtained: 15.5, originCourseName: "Algo & C" },
            { codeUe: "UE1.2", nameUe: "Mathématiques Fondamentales & Algèbre", creditsEcts: 6, gradeObtained: 14.0, originCourseName: "Maths I" },
            { codeUe: "UE1.3", nameUe: "Architecture des Ordinateurs & Systèmes", creditsEcts: 6, gradeObtained: 16.0, originCourseName: "Systèmes d'Exploitation" },
            { codeUe: "UE2.1", nameUe: "Bases de Données Relationnelles & SQL", creditsEcts: 6, gradeObtained: 15.0, originCourseName: "SGBD / SQL" },
            { codeUe: "UE2.2", nameUe: "Développement Web & Technologies Internet", creditsEcts: 6, gradeObtained: 17.0, originCourseName: "Web dev" },
          ],
        },
        student: {
          id: item.studentId || 0,
          nom: item.studentNom || "Étudiant",
          matricule: item.studentMatricule || `EDUT-${item.studentId || 0}`,
          dateNaissance: "15/10/2002",
          lieuNaissance: "Niamey",
          nationalite: "Nigérienne",
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
          city: "Niamey",
        },
      };

      await generateAttestationEquivalencePDF(payload);
      toast.success(`Attestation ECTS générée pour ${item.studentNom}`);
    } catch (e) {
      toast.error("Erreur lors de la génération du PDF d'équivalence");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Globe2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Équivalences &amp; Transferts ECTS
              </h1>
              <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                Mobilité &amp; Passerelles LMD
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reconnaissance des crédits acquis à l'étranger ou dans d'autres universités selon les normes REESAO / CAMES / Bologne.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenNew}
          className="h-11 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-indigo-500/20 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nouveau Dossier d'Équivalence
        </Button>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Crédits ECTS Reconnus</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalCredits} ECTS</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dossiers Homologués</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalApproved}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Universités Partenaires</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{uniqueOrigins}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Norme d'Accréditation</p>
            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">REESAO • CAMES</p>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher étudiant, université..."
              className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["ALL", "L2", "L3", "M1", "M2"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterLevel === lvl
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {lvl === "ALL" ? "Tous Niveaux" : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Étudiant</th>
                <th className="py-3.5 px-5">Établissement d'Origine</th>
                <th className="py-3.5 px-5">Formation d'Accueil</th>
                <th className="py-3.5 px-5 text-center">Crédits ECTS</th>
                <th className="py-3.5 px-5 text-center">Niveau &amp; Semestre</th>
                <th className="py-3.5 px-5 text-center">Décision</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="py-4 px-5">
                    <p className="font-bold text-slate-900 dark:text-white">{item.studentNom || "Étudiant"}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.studentMatricule || "N/A"}</p>
                  </td>

                  <td className="py-4 px-5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{item.originInstitution}</p>
                    <p className="text-[10px] text-slate-400">{item.originProgram} ({item.originCountry})</p>
                  </td>

                  <td className="py-4 px-5">
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{item.programName || "Programme LMD"}</p>
                    <p className="text-[10px] text-slate-400">{item.academicYear || "2025-2026"}</p>
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                      {item.creditsTransferred} ECTS
                    </span>
                  </td>

                  <td className="py-4 px-5 text-center font-bold text-slate-700 dark:text-slate-300">
                    {item.targetLevel} ({item.targetSemester})
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      item.decision === "Validé"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                    }`}>
                      {item.decision}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exportingId === item.id}
                        onClick={() => handleExportPDF(item)}
                        className="h-8 px-2.5 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1"
                        title="Générer l'Attestation Officielle d'Équivalence ECTS"
                      >
                        {exportingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5" />
                        )}
                        {exportingId === item.id ? "Génération..." : "Attestation PDF"}
                      </Button>

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Modifier"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        disabled={isPending}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs italic">
                    Aucun dossier d'équivalence trouvé. Cliquez sur "Nouveau Dossier" pour enregistrer une reconnaissance d'ECTS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL ADD / EDIT ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingItem ? "Modifier l'Équivalence ECTS" : "Nouveau Dossier d'Équivalence & Transfert"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Reconnaissance académique et validation des acquis</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Student selection */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Étudiant Bénéficiaire *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom} ({s.matricule})
                    </option>
                  ))}
                </select>
              </div>

              {/* Origin Institution & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Université / Établissement d'origine *
                  </label>
                  <Input
                    value={originInstitution}
                    onChange={(e) => setOriginInstitution(e.target.value)}
                    placeholder="ex: Université Joseph Ki-Zerbo"
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Pays d'origine
                  </label>
                  <Input
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    placeholder="ex: Burkina Faso, Sénégal..."
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {/* Origin Program & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Cursus d'origine
                  </label>
                  <Input
                    value={originProgram}
                    onChange={(e) => setOriginProgram(e.target.value)}
                    placeholder="ex: Licence 1 Informatique"
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Année d'obtention
                  </label>
                  <Input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2024-2025"
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {/* Target Program, Level & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Formation d'accueil *
                  </label>
                  <select
                    value={targetProgramId}
                    onChange={(e) => setTargetProgramId(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {programsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Niveau d'admission
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="L1">Licence 1 (L1)</option>
                    <option value="L2">Licence 2 (L2)</option>
                    <option value="L3">Licence 3 (L3)</option>
                    <option value="M1">Master 1 (M1)</option>
                    <option value="M2">Master 2 (M2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Semestre d'intégration
                  </label>
                  <select
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="S1">Semestre 1 (S1)</option>
                    <option value="S2">Semestre 2 (S2)</option>
                    <option value="S3">Semestre 3 (S3)</option>
                    <option value="S4">Semestre 4 (S4)</option>
                    <option value="S5">Semestre 5 (S5)</option>
                    <option value="S6">Semestre 6 (S6)</option>
                  </select>
                </div>
              </div>

              {/* Credits & Decision */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Crédits ECTS Reconnus
                  </label>
                  <Input
                    type="number"
                    value={creditsTransferred}
                    onChange={(e) => setCreditsTransferred(Number(e.target.value))}
                    className="h-10 text-xs font-black text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Décision de la Commission
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Validé">Validé (Admis par Équivalence)</option>
                    <option value="En Commission">En cours d'examen</option>
                    <option value="Rejeté">Rejeté</option>
                  </select>
                </div>
              </div>

              {/* Commission Notes */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Avis &amp; Décision de la Commission
                </label>
                <textarea
                  value={commissionComments}
                  onChange={(e) => setCommissionComments(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-xl text-xs font-bold text-slate-500">
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>{editingItem ? "Mettre à jour" : "Valider l'Équivalence"}</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
