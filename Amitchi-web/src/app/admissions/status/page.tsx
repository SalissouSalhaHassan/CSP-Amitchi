"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  School,
  FileText,
  Phone,
  Calendar,
  Printer,
  QrCode,
  ArrowRight,
  ShieldCheck,
  User,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Sparkles,
  GraduationCap,
  Award,
  BookOpen,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicApplicationStatusAction } from "@/domains/admissions/actions/admissions.actions";
import { QRCodeSVG } from "qrcode.react";

function StatusTrackingContent() {
  const searchParams = useSearchParams();
  const initialAppNumber = searchParams.get("app") || searchParams.get("num") || "";
  const initialPhone = searchParams.get("phone") || "";

  const [applicationNumber, setApplicationNumber] = useState(initialAppNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!applicationNumber.trim() || !phone.trim()) {
      toast.error("Veuillez renseigner le numéro de dossier et votre numéro de téléphone.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await getPublicApplicationStatusAction({
        applicationNumber,
        phone,
      });

      if (res.success && res.application) {
        setResult(res.application);
      } else {
        setResult(null);
        toast.error(res.error || "Dossier introuvable.");
      }
    } catch (err) {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialAppNumber && initialPhone) {
      handleSearch();
    }
  }, [initialAppNumber, initialPhone]);

  // Determine Timeline Stage (1 to 5)
  const getTimelineStage = (status: string) => {
    if (status === "Admis / Accepté" || status === "Admis sous condition") return 5;
    if (status === "Liste d'attente") return 4;
    if (status === "Refusé") return 4;
    if (status === "En examen") return 3;
    return 2; // En attente
  };

  const currentStage = result ? getTimelineStage(result.status) : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Portail Universitaire • Admissions
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Suivi en direct
              </span>
            </h1>
            <p className="text-xs text-slate-400">Consultation en temps réel de l&apos;évolution de votre candidature</p>
          </div>
        </div>

        <Link
          href="/admissions/apply"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
        >
          Nouvelle Candidature
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto w-full my-8 space-y-8">
        {/* Search Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-black text-white tracking-tight">Suivre l&apos;état de votre dossier</h2>
            <p className="text-sm text-slate-400">
              Saisissez votre numéro de dossier officiel (ex: <span className="font-mono text-emerald-400">UNIV-2026-001-XXXX</span> ou <span className="font-mono text-emerald-400">ADM-2026-001-XXXX</span>) et votre numéro de téléphone.
            </p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Numéro de Candidature *</label>
              <input
                type="text"
                required
                placeholder="Ex: UNIV-2026-001-8921"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Téléphone de contact *</label>
              <input
                type="text"
                required
                placeholder="Ex: +227 90 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition font-mono"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Recherche du dossier en cours...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Consulter l&apos;état de la candidature
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── Result Section ──────────────────────────────────────────────── */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Header / Identity Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                {result.photoUrl ? (
                  <img
                    src={result.photoUrl}
                    alt={result.studentLastName}
                    className="size-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shadow-emerald-500/20 shrink-0"
                  />
                ) : (
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-slate-950 flex flex-col items-center justify-center font-black text-xl shadow-md shrink-0">
                    <User className="size-8 text-white" />
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Établissement : <strong className="text-white">{result.schoolName}</strong>
                  </span>
                  <h3 className="text-2xl font-black text-white">{result.studentFirstName} {result.studentLastName}</h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {result.faculty ? `${result.faculty} • ` : ""}<span className="font-bold text-white">{result.degreeProgram || result.targetClass}</span>
                  </p>
                  {result.degreeLevel && (
                    <p className="text-[11px] text-slate-400">
                      Cycle : <strong className="text-slate-200">{result.degreeLevel}</strong> • Régime : <strong className="text-slate-200">{result.studyMode || "Présentiel"}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Décision / Statut</span>
                {result.status === "Admis / Accepté" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="size-4" />
                    Admis Définitivement
                  </span>
                )}
                {result.status === "Admis sous condition" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    <CheckCircle2 className="size-4" />
                    Admis sous Réserve
                  </span>
                )}
                {result.status === "En attente" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Clock className="size-4" />
                    Dossier en attente de commission
                  </span>
                )}
                {result.status === "En examen" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <Clock className="size-4" />
                    Examen Pédagogique &amp; Entretien
                  </span>
                )}
                {result.status === "Liste d'attente" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <AlertCircle className="size-4" />
                    Sur Liste d&apos;Attente
                  </span>
                )}
                {result.status === "Refusé" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <XCircle className="size-4" />
                    Candidature Non Retenue
                  </span>
                )}
              </div>
            </div>

            {/* 5-Stage Visual Progression Timeline */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Progression du Dossier d&apos;Admission</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { step: 1, title: "1. Dépôt Initial", desc: "Candidature enregistrée" },
                  { step: 2, title: "2. Contrôle Pièces", desc: "Vérification conformité" },
                  { step: 3, title: "3. Évaluation Jury", desc: "Examen pédagogique & notes" },
                  { step: 4, title: "4. Décision Finale", desc: "Délibération du jury" },
                  { step: 5, title: "5. Immatriculation", desc: "Matricule & Inscription" },
                ].map((s) => {
                  const isDone = currentStage >= s.step;
                  const isCurrent = currentStage === s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone
                          ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-950 border-slate-800/80 text-slate-500"
                      } ${isCurrent ? "ring-2 ring-emerald-400/50" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isDone ? (
                          <div className="size-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                            ✓
                          </div>
                        ) : (
                          <div className="size-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {s.step}
                          </div>
                        )}
                        <span className="text-[11px] font-bold">{s.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 ml-6">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* If Admitted: Congratulatory Box + Matricule */}
            {(result.status === "Admis / Accepté" || result.status === "Admis sous condition") && (
              <div className="bg-gradient-to-br from-emerald-950/80 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-300">Félicitations ! Vous êtes admis.</h4>
                    <p className="text-xs text-slate-300">
                      Votre candidature a été officiellement approuvée par la Commission des Admissions.
                    </p>
                  </div>
                </div>

                {result.generatedMatricule && (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Numéro Matricule Universitaire Attribué
                      </span>
                      <div className="text-xl font-mono font-black text-emerald-400 tracking-wider">{result.generatedMatricule}</div>
                    </div>
                    <span className="text-xs text-slate-400">
                      Utilisez ce matricule pour accéder à vos services et valider votre inscription.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Notes or Comments */}
            {result.reviewNotes && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observations de la Commission</span>
                <p className="text-xs text-slate-200 leading-relaxed">{result.reviewNotes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
              >
                <Printer className="size-4" />
                Imprimer l&apos;Attestation de Candidature / Admission
              </button>
              <Link
                href="/admissions/apply"
                className="py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                Déposer une Autre Candidature
              </Link>
            </div>

          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-slate-800/80">
        &copy; {new Date().getFullYear()} Système d&apos;Admission Universitaire &amp; Scolaire Edut Pro.
      </footer>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400">
          <RefreshCw className="size-8 animate-spin" />
        </div>
      }
    >
      <StatusTrackingContent />
    </Suspense>
  );
}
