"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerSchoolAction } from "@/domains/auth/actions/register-school";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Globe,
  Link2,
  Zap,
  Cloud,
  ShieldCheck,
  GraduationCap,
  UserRound,
} from "lucide-react";
import Link from "next/link";

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    schoolName: "",
    slug: "",
    customDomain: "",
    adminName: "",
    adminUsername: "",
    motDePasse: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.schoolName || !formData.slug) {
      setError("Veuillez remplir les informations de l'école.");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError("Le lien ne doit contenir que des lettres minuscules, des chiffres et des tirets.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.motDePasse !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await registerSchoolAction({
        schoolName: formData.schoolName,
        slug: formData.slug,
        customDomain: formData.customDomain,
        adminName: formData.adminName,
        adminUsername: formData.adminUsername,
        motDePasse: formData.motDePasse,
      });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Une erreur inattendue est survenue.");
      }
    } catch (err: any) {
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS STATE ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-blue-50 p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            École créée avec succès !
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Votre établissement est prêt. Connectez-vous via l'adresse :
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 font-mono text-blue-700 text-base font-bold mb-8">
            {formData.slug}.edut.pro
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl py-4 text-sm transition-all flex items-center justify-center gap-2"
          >
            Accéder à la connexion
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef3ff] via-white to-[#f0f7ff] flex flex-col">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-slate-800 text-sm">Edut Pro</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </nav>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── LEFT PANEL ── */}
          <div className="flex flex-col gap-8">
            {/* Icon badge */}
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-4xl xl:text-5xl font-black text-slate-900 leading-tight">
                Inscrivez votre<br />établissement
              </h1>
              <p className="text-3xl xl:text-4xl font-black text-blue-600 leading-tight">
                et démarrez la digitalisation.
              </p>
            </div>

            <p className="text-slate-500 text-base leading-relaxed max-w-sm">
              Rejoignez des milliers d'établissements scolaires qui gèrent leurs activités efficacement avec Edut Pro.
            </p>

            {/* School illustration */}
            <div className="relative">
              <svg viewBox="0 0 480 280" className="w-full max-w-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sky */}
                <rect width="480" height="280" rx="24" fill="#EEF3FF"/>
                {/* Sun */}
                <circle cx="420" cy="50" r="30" fill="#FEF3C7"/>
                <circle cx="420" cy="50" r="22" fill="#FDE68A"/>
                {/* Clouds */}
                <ellipse cx="80" cy="60" rx="40" ry="18" fill="white" opacity="0.9"/>
                <ellipse cx="105" cy="52" rx="28" ry="18" fill="white" opacity="0.9"/>
                <ellipse cx="60" cy="55" rx="22" ry="14" fill="white" opacity="0.9"/>
                <ellipse cx="320" cy="45" rx="35" ry="15" fill="white" opacity="0.8"/>
                <ellipse cx="345" cy="38" rx="25" ry="15" fill="white" opacity="0.8"/>

                {/* Ground */}
                <rect x="0" y="220" width="480" height="60" rx="0" fill="#DBEAFE"/>

                {/* Trees left */}
                <rect x="20" y="170" width="8" height="50" fill="#93C5FD"/>
                <ellipse cx="24" cy="160" rx="22" ry="25" fill="#60A5FA"/>
                <ellipse cx="24" cy="150" rx="18" ry="20" fill="#93C5FD"/>

                <rect x="55" y="180" width="6" height="40" fill="#93C5FD"/>
                <ellipse cx="58" cy="170" rx="18" ry="20" fill="#60A5FA"/>
                <ellipse cx="58" cy="162" rx="14" ry="16" fill="#93C5FD"/>

                {/* Trees right */}
                <rect x="430" y="175" width="8" height="45" fill="#93C5FD"/>
                <ellipse cx="434" cy="163" rx="22" ry="24" fill="#60A5FA"/>
                <ellipse cx="434" cy="153" rx="18" ry="20" fill="#93C5FD"/>

                {/* School building - main */}
                <rect x="120" y="110" width="240" height="130" rx="4" fill="white"/>
                <rect x="120" y="110" width="240" height="130" rx="4" fill="#DBEAFE" opacity="0.3"/>

                {/* Roof */}
                <polygon points="110,115 240,60 370,115" fill="#60A5FA"/>
                <polygon points="110,115 240,60 370,115" fill="#3B82F6" opacity="0.6"/>

                {/* Flag pole */}
                <rect x="237" y="60" width="3" height="30" fill="#CBD5E1"/>
                <rect x="240" y="60" width="18" height="12" fill="#EF4444"/>

                {/* Windows row 1 */}
                {[145, 195, 265, 315].map((x, i) => (
                  <g key={i}>
                    <rect x={x} y="128" width="30" height="28" rx="3" fill="#BFDBFE"/>
                    <rect x={x} y="128" width="30" height="28" rx="3" stroke="#93C5FD" strokeWidth="1.5"/>
                    <line x1={x+15} y1="128" x2={x+15} y2="156" stroke="#93C5FD" strokeWidth="1"/>
                    <line x1={x} y1="142" x2={x+30} y2="142" stroke="#93C5FD" strokeWidth="1"/>
                  </g>
                ))}

                {/* Clock circle */}
                <circle cx="240" cy="100" r="14" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                <line x1="240" y1="91" x2="240" y2="100" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="240" y1="100" x2="246" y2="104" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>

                {/* Door */}
                <rect x="205" y="185" width="30" height="55" rx="3" fill="#BFDBFE"/>
                <rect x="205" y="185" width="30" height="55" rx="3" stroke="#93C5FD" strokeWidth="1.5"/>
                <circle cx="231" cy="215" r="2.5" fill="#60A5FA"/>

                {/* Side wings */}
                <rect x="90" y="155" width="30" height="65" rx="2" fill="#DBEAFE"/>
                <rect x="360" y="155" width="30" height="65" rx="2" fill="#DBEAFE"/>
                {/* Wing windows */}
                <rect x="96" y="162" width="18" height="18" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1"/>
                <rect x="366" y="162" width="18" height="18" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1"/>

                {/* Path to school */}
                <rect x="218" y="238" width="44" height="42" fill="#93C5FD" opacity="0.5"/>

                {/* Person */}
                <circle cx="165" cy="210" r="8" fill="#60A5FA"/>
                <rect x="160" y="218" width="10" height="18" rx="3" fill="#3B82F6"/>
              </svg>
            </div>

            {/* Feature badges */}
            <div className="flex gap-4 flex-wrap">
              {[
                { icon: Zap, label: "Rapide & Facile", sub: "Compte prêt en minutes", color: "text-amber-500", bg: "bg-amber-50" },
                { icon: Cloud, label: "100% Cloud", sub: "Accès partout, à tout moment", color: "text-blue-500", bg: "bg-blue-50" },
                { icon: ShieldCheck, label: "Sécurisé", sub: "Données protégées par défaut", color: "text-emerald-500", bg: "bg-emerald-50" },
              ].map(({ icon: Icon, label, sub, color, bg }) => (
                <div key={label} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex-1 min-w-[140px]">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL — FORM CARD ── */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100/60 border border-blue-50 overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-50 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Créer un compte établissement
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {step === 1
                  ? "Veuillez renseigner les informations suivantes."
                  : "Informations de l'administrateur principal."}
              </p>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? "bg-blue-600" : "bg-slate-100"}`} />
                <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? "bg-blue-600" : "bg-slate-100"}`} />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {step === 1 ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* School name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      Nom de l'école <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder="Ex: École Privée Les Champions"
                        className="w-full h-12 bg-slate-50 rounded-xl pl-4 pr-11 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <Building2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Subdomain */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      Lien de l'école (sous-domaine) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        name="slug"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            slug: e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase(),
                          }))
                        }
                        placeholder="al-noor"
                        className="flex-1 h-12 bg-slate-50 rounded-xl pl-4 pr-4 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <div className="h-12 px-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2 shrink-0">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-blue-600">.edut.pro</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium pl-1">
                      C'est l'adresse qu'utiliseront les enseignants et les élèves pour se connecter.
                    </p>
                  </div>

                  {/* Custom domain (optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Domaine personnalisé <span className="text-slate-400 font-semibold normal-case">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <input
                        name="customDomain"
                        value={formData.customDomain}
                        onChange={handleChange}
                        placeholder="portal.school.edu"
                        className="w-full h-12 bg-slate-50 rounded-xl pl-4 pr-11 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-300"
                      />
                      <Link2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium pl-1">
                      Vous pouvez lier votre propre site ultérieurement, ou le renseigner ici s'il est déjà disponible.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Admin full name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      Nom complet de l'administrateur <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="adminName"
                        value={formData.adminName}
                        onChange={handleChange}
                        placeholder="Prénom & Nom"
                        className="w-full h-12 bg-slate-50 rounded-xl pl-4 pr-11 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <UserRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Admin username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      Nom d'utilisateur (connexion) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="adminUsername"
                        value={formData.adminUsername}
                        onChange={handleChange}
                        placeholder="admin"
                        className="w-full h-12 bg-slate-50 rounded-xl pl-4 pr-11 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-300"
                        required
                      />
                      <UserRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="motDePasse"
                        type="password"
                        value={formData.motDePasse}
                        onChange={handleChange}
                        className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        Confirmer <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-semibold text-slate-800 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={() => validateStep1() && setStep(2)}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                  >
                    Continuer vers le compte admin
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        Créer le compte
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Privacy note */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[11px] text-slate-400 font-medium">
                  Vos données sont sécurisées et confidentielles.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Bottom login link */}
      <footer className="text-center py-6">
        <p className="text-sm text-slate-500">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-blue-600 font-black hover:underline">
            Connectez-vous ici
          </Link>
        </p>
      </footer>
    </div>
  );
}
