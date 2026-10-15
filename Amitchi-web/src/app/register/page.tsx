"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/domains/auth/actions/register";
import { getSchoolBranding } from "@/domains/auth/actions/branding";
import { 
  GraduationCap, Loader2, Lock, User, Eye, EyeOff, 
  Shield, Users, ArrowRight, CheckCircle2, Mail, School
} from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [school, setSchool] = useState<any>(null);
  
  // Registration Form State
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [schoolCode, setSchoolCode] = useState("");
  const [matricule, setMatricule] = useState("");
  const [activationPin, setActivationPin] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function fetchBranding() {
      const branding = await getSchoolBranding();
      if (branding) {
        setSchool(branding);
        setSchoolCode(branding.slug);
      }
    }
    fetchBranding();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!schoolCode.trim()) {
      setError("Veuillez saisir le code de votre établissement.");
      return;
    }
    if (!activationPin.trim()) {
      setError("Veuillez saisir votre code d'activation (PIN).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser({
        role,
        schoolSlug: schoolCode.trim().toLowerCase(),
        matriculeOrEmail: matricule.trim(),
        username: username.trim(),
        fullName: fullName.trim(),
        passwordHash: password,
        activationPin: activationPin.trim(),
      });

      if (!result.success) {
        setError(result.error || "Une erreur s'est produite.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Register Client Error Details:", err);
      setError(err?.message || "Erreur lors de l'inscription. Veuillez réessayer.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[150px]" />
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 flex items-center gap-3 p-6 md:p-8">
        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          {school?.logoPath ? (
            <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <GraduationCap size={22} className="text-white" />
          )}
        </div>
        <div>
          <p className="text-white font-black text-lg tracking-tight">
            {school?.name ? school.name.toUpperCase() : "EDUT"}
          </p>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {school?.name ? `Espace ${school.name}` : "Auto-Inscription"}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-[500px] mx-auto">
          {success ? (
            // Success Card
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-emerald-500/20 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] -mt-20" />
              <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Compte créé avec succès !</h2>
              <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                Votre compte a été associé et activé. Vous pouvez maintenant vous connecter en toute sécurité.
              </p>
              <Link
                href="/login"
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Se connecter <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            // Registration Form
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/20 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-[60px] -mt-20" />

              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight">Créer un compte</h1>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  Associez votre profil étudiant ou enseignant pour accéder au portail
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === "student"
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Users size={14} /> Étudiant
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === "teacher"
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Shield size={14} /> Enseignant
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative">
                {error && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-bold text-center">
                    {error}
                  </div>
                )}

                {/* If no school is detected in subdomain branding */}
                {!school && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Code Établissement
                    </label>
                    <div className="relative group">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <input
                        type="text"
                        required
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        placeholder="Ex: excellence"
                        className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Matricule Or Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {role === "student" ? "Numéro Matricule / Admission" : "Matricule ou Email Enseignant"}
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type="text"
                      required
                      value={matricule}
                      onChange={(e) => setMatricule(e.target.value)}
                      placeholder={role === "student" ? "Ex: ADM-2026-001" : "Ex: prof@ecole.com"}
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Code d'activation (PIN) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Code d'activation (PIN)
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type="text"
                      required
                      value={activationPin}
                      onChange={(e) => setActivationPin(e.target.value)}
                      placeholder="Code secret à 6 chiffres"
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Nom Complet */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Nom Complet
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom et prénom"
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Nom d'utilisateur souhaité
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                      placeholder="Ex: ali.diallo"
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Inscription en cours...
                    </>
                  ) : (
                    <>
                      S'inscrire <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="pt-4 text-center">
                  <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-white transition-colors">
                    Déjà inscrit ? Se connecter
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
