"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  GraduationCap, ArrowLeft, Search, Award, 
  CheckCircle2, AlertTriangle, Printer, FileText, 
  Sparkles, BookOpen, Layers, User, Calendar, 
  TrendingUp, ShieldCheck, Download, FileCheck, School, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  getStudentLmdTrajectoryData, 
  StudentLmdTrajectory 
} from "@/domains/academics/actions/lmd-student.actions";
import { generateLmdOfficialDiplomaPDF, generateLmdAttestationReussitePDF } from "@/domains/academics/utils/lmd-diploma-generator";
import { generateDiplomaSupplementPDF } from "@/domains/academics/utils/lmd-diploma-supplement-generator";
import { generateLmdStudentRelevePDF } from "@/domains/academics/utils/lmd-releve-generator";

interface Props {
  initialTrajectory: StudentLmdTrajectory | null;
  studentsList: Array<{ id: number; nom: string; matricule: string; className?: string }>;
}

export function StudentTrajectoryClient({ initialTrajectory, studentsList }: Props) {
  const [trajectory, setTrajectory] = useState<StudentLmdTrajectory | null>(initialTrajectory);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialTrajectory ? String(initialTrajectory.student.id) : (studentsList[0] ? String(studentsList[0].id) : "")
  );
  const [activeSemester, setActiveSemester] = useState<string>("S1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredStudents = studentsList.filter((s) => 
    s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.matricule && s.matricule.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectStudent = async (id: string) => {
    setSelectedStudentId(id);
    setIsLoading(true);
    try {
      const res = await getStudentLmdTrajectoryData(id);
      if (res.success && res.data) {
        setTrajectory(res.data);
      } else {
        toast.error(res.error || "Impossible de charger le parcours");
      }
    } catch (e) {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const currentSemesterData = trajectory?.semesters.find((s) => s.semesterCode === activeSemester);

  // ─── PDF Handlers ──────────────────────────────────────────────────────────
  const handleExportDiploma = async () => {
    if (!trajectory) return;
    setExportingType("diploma");
    try {
      await generateLmdOfficialDiplomaPDF({
        student: {
          id: trajectory.student.id,
          nom: trajectory.student.nom,
          matricule: trajectory.student.matricule,
          dateNaissance: trajectory.student.dateNaissance,
          lieuNaissance: trajectory.student.lieuNaissance,
          nationalite: "Nigérienne",
          sexe: trajectory.student.sexe,
        },
        degree: {
          title: trajectory.academicInfo.degreeLevel.toUpperCase(),
          specialization: trajectory.academicInfo.programName,
          fieldOfStudy: "Sciences & Technologies",
          mention: trajectory.progress.mention,
          finalGradeAverage: trajectory.progress.cumulativeAverage,
          totalCreditsAcquired: trajectory.progress.totalCreditsAcquired,
          sessionName: trajectory.academicInfo.currentYear,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
        },
      });
      toast.success("Diplôme Officiel généré avec succès !");
    } catch (e) {
      toast.error("Erreur lors de la génération du diplôme");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportAttestation = async () => {
    if (!trajectory) return;
    setExportingType("attestation");
    try {
      await generateLmdAttestationReussitePDF({
        student: {
          id: trajectory.student.id,
          nom: trajectory.student.nom,
          matricule: trajectory.student.matricule,
          dateNaissance: trajectory.student.dateNaissance,
          lieuNaissance: trajectory.student.lieuNaissance,
          nationalite: "Nigérienne",
          sexe: trajectory.student.sexe,
        },
        degree: {
          title: trajectory.academicInfo.degreeLevel.toUpperCase(),
          specialization: trajectory.academicInfo.programName,
          fieldOfStudy: "Sciences & Technologies",
          mention: trajectory.progress.mention,
          finalGradeAverage: trajectory.progress.cumulativeAverage,
          totalCreditsAcquired: trajectory.progress.totalCreditsAcquired,
          sessionName: trajectory.academicInfo.currentYear,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
        },
      });
      toast.success("Attestation de réussite générée !");
    } catch (e) {
      toast.error("Erreur lors de la génération de l'attestation");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportSupplement = async () => {
    if (!trajectory) return;
    setExportingType("supplement");
    try {
      await generateDiplomaSupplementPDF({
        student: {
          id: trajectory.student.id,
          nom: trajectory.student.nom,
          matricule: trajectory.student.matricule,
          dateNaissance: trajectory.student.dateNaissance,
          lieuNaissance: trajectory.student.lieuNaissance,
          nationalite: "Nigérienne",
          sexe: trajectory.student.sexe,
        },
        diploma: {
          title: `DIPLÔME DE ${trajectory.academicInfo.degreeLevel.toUpperCase()} LMD`,
          degreeLevel: trajectory.academicInfo.degreeLevel,
          fieldOfStudy: "Sciences & Technologies",
          mention: trajectory.academicInfo.programName,
          graduationYear: trajectory.academicInfo.currentYear,
          finalGradeAverage: trajectory.progress.cumulativeAverage,
          totalCreditsAcquired: trajectory.progress.totalCreditsAcquired,
          honors: trajectory.progress.mention,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          facultyName: "FACULTÉ DES SCIENCES & TECHNIQUES",
        },
      });
      toast.success("Annexe au diplôme UNESCO générée !");
    } catch (e) {
      toast.error("Erreur lors de la génération de l'annexe");
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/academics/lmd"
            className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors shadow-xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Portail Étudiant LMD
              </span>
              <span className="text-xs text-slate-500 font-medium">Bologne • CAMES • ECTS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Suivi de Trajectoire & Compteur ECTS
            </h1>
          </div>
        </div>

        {/* Student Selector Search */}
        <div className="w-full md:w-80">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un étudiant..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          {searchQuery && (
            <div className="absolute z-20 mt-1 w-full max-w-sm max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    handleSelectStudent(String(s.id));
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs flex items-center justify-between"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{s.nom}</span>
                  <span className="font-mono text-[10px] text-slate-500">{s.matricule}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {trajectory ? (
        <>
          {/* ─── STUDENT IDENTITY & ECTS GAUGE HERO ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Profile Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-xs">
                    {trajectory.student.nom.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {trajectory.student.nom}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{trajectory.student.matricule}</span>
                      <span>•</span>
                      <span>{trajectory.academicInfo.className}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Programme :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{trajectory.academicInfo.programName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Année Universitaire :</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{trajectory.academicInfo.currentYear}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Statut Académique :</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {trajectory.progress.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1-Click Document Export Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingType !== null}
                  onClick={handleExportDiploma}
                  className="h-8 px-2 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50"
                  title="Télécharger le Diplôme Officiel"
                >
                  {exportingType === "diploma" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  ) : (
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span>{exportingType === "diploma" ? "Génération..." : "Diplôme"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingType !== null}
                  onClick={handleExportAttestation}
                  className="h-8 px-2 text-[11px] font-bold gap-1 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:bg-teal-50"
                  title="Télécharger l'Attestation de Réussite"
                >
                  {exportingType === "attestation" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />
                  ) : (
                    <FileCheck className="h-3.5 w-3.5 text-teal-500" />
                  )}
                  <span>{exportingType === "attestation" ? "Génération..." : "Attestation"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingType !== null}
                  onClick={handleExportSupplement}
                  className="h-8 px-2 text-[11px] font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
                  title="Télécharger l'Annexe UNESCO"
                >
                  {exportingType === "supplement" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  ) : (
                    <GraduationCap className="h-3.5 w-3.5" />
                  )}
                  <span>{exportingType === "supplement" ? "Génération..." : "Annexe"}</span>
                </Button>
              </div>
            </div>

            {/* ECTS Credits Live Gauge Card */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    <span>Progression du Cursus LMD</span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {trajectory.progress.percentage}% Complété
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      {trajectory.progress.totalCreditsAcquired} <span className="text-sm font-semibold text-slate-400">/ {trajectory.progress.targetCredits} ECTS</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Reste à valider : <span className="font-bold text-slate-800 dark:text-slate-200">{Math.max(0, trajectory.progress.targetCredits - trajectory.progress.totalCreditsAcquired)} ECTS</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${trajectory.progress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* 3 Metric Mini Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Moyenne Générale</div>
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {trajectory.progress.cumulativeAverage.toFixed(2)} <span className="text-xs font-normal text-slate-400">/20</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Mention Provisoire</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {trajectory.progress.mention}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Grade ECTS</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      Grade {trajectory.progress.ectsGrade.grade}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SEMESTERS TABS (S1 to S6) ──────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                  Détail par Semestre & Capitalisation des UEs
                </h3>
              </div>

              {/* Semester Selector Buttons */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                {trajectory.semesters.map((s) => (
                  <button
                    key={s.semesterCode}
                    onClick={() => setActiveSemester(s.semesterCode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeSemester === s.semesterCode
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {s.semesterCode}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Semester Content */}
            {currentSemesterData && (
              <div className="space-y-4">
                {/* Semester Summary Header */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                      {currentSemesterData.semesterCode}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{currentSemesterData.label}</div>
                      <div className="text-xs text-slate-500">Moyenne : <span className="font-bold text-slate-800 dark:text-slate-200">{currentSemesterData.average.toFixed(2)} / 20</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      currentSemesterData.status === "Validé"
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                    }`}>
                      {currentSemesterData.status} ({currentSemesterData.creditsAcquired} / {currentSemesterData.creditsTotal} ECTS)
                    </span>
                  </div>
                </div>

                {/* UEs Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentSemesterData.ueResults.map((ue) => (
                    <div
                      key={ue.codeUe}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">{ue.codeUe}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {ue.credits} ECTS • {ue.status === "V" ? "Validé" : "Compensé"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-3 leading-snug">{ue.nameUe}</h4>

                        {/* ECUs List */}
                        <div className="space-y-1.5 border-t border-slate-200/60 dark:border-slate-700/60 pt-2.5">
                          {ue.ecus.map((ecu) => (
                            <div key={ecu.nameEcu} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{ecu.nameEcu}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{ecu.grade.toFixed(2)} / 20</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Moyenne UE :</span>
                        <span className="font-black text-slate-900 dark:text-slate-100">{ue.average.toFixed(2)} / 20</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <User className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Sélectionnez un étudiant</h3>
          <p className="text-xs text-slate-500 mt-1">Recherchez un étudiant par son nom ou matricule ci-dessus.</p>
        </div>
      )}
    </div>
  );
}
