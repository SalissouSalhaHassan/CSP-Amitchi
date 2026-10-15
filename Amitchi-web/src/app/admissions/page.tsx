import Link from "next/link";
import { School, UserPlus, Search, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Phone, MessageSquare } from "lucide-react";

export default function AdmissionsLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Top Header ────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <School className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Edut Pro • Portail Admissions
            </h1>
            <p className="text-xs text-slate-400">Guichet Unique d'Inscription Scolaire en Ligne</p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-bold text-slate-400 hover:text-white transition"
        >
          Espace Administration →
        </Link>
      </header>

      {/* ─── Hero & Action Cards ───────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto w-full my-12 space-y-10 text-center">
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <Sparkles className="size-3.5" />
            Campagne d'Inscriptions Ouverte
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Bienvenue sur le Portail d'Admission Scolaire
          </h2>
          <p className="text-sm text-slate-400">
            Inscrivez votre enfant facilement en quelques minutes ou suivez l'avancement de votre candidature en temps réel.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {/* Card 1: Apply */}
          <Link
            href="/admissions/apply"
            className="group bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl transition hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="size-14 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
                <UserPlus className="size-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition">
                  Nouvelle Inscription
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Déposez un nouveau dossier de candidature pour un élève (Maternelle, Primaire, Collège, Lycée).
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-400 pt-4 border-t border-slate-800">
              Remplir le formulaire
              <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Card 2: Track */}
          <Link
            href="/admissions/status"
            className="group bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl transition hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="size-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
                <Search className="size-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition">
                  Suivre mon Dossier
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Consultez l'état d'examen de votre candidature avec votre numéro de dossier et votre téléphone.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-black text-blue-400 pt-4 border-t border-slate-800">
              Vérifier l'état en direct
              <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Edut Pro • Plateforme de Gestion Scolaire Moderne & Sécurisée</p>
      </footer>
    </div>
  );
}
