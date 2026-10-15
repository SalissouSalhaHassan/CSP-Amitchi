"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const GraduationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ShieldBigIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);
const SmartphoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" className="w-4 h-4">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const SchoolIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [dark, setDark] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b0f19] text-gray-900 dark:text-white transition-colors duration-300 font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#111625]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationIcon />
            </div>
            <div>
              <p className="font-bold text-[15px] leading-tight text-gray-900 dark:text-white">Édut Pro</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Gestion Scolaire Intelligente</p>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              Fonctionnalités
            </a>
            <Link href="/dashboard/about" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              À propos
            </Link>
            <a href="#mobile" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              App Mobile
            </a>
            <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              Tarifs
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link
              href="/login"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
        {/* Dot grid decoration top-right */}
        <div className="absolute right-0 top-8 hidden lg:block opacity-30">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-600" />
            ))}
          </div>
        </div>

        {/* Left column */}
        <div className="space-y-6 z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800">
            <CheckIcon />
            Solution complète pour les établissements scolaires
          </div>

          {/* Headline */}
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-[1.15] tracking-tight">
            Système de gestion scolaire{" "}
            <span className="text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent">
              intelligent et complet
            </span>
          </h1>

          <p className="text-gray-600 dark:text-gray-300 text-base lg:text-lg leading-relaxed max-w-lg">
            Édut Pro simplifie la gestion de votre établissement scolaire.
            Gagnez du temps, améliorez la communication et concentrez-vous
            sur l'essentiel : la réussite de vos élèves.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-0.5"
            >
              <LockIcon />
              Découvrir Édut Pro
            </Link>
            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 font-bold text-sm transition-all hover:-translate-y-0.5"
            >
              <PlayIcon />
              Voir la démonstration
            </button>
          </div>

          {/* Mini badges */}
          <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200/80 dark:border-white/10">
            {[
              { icon: <ShieldIcon />, label: "Sécurisé", sub: "Données protégées" },
              { icon: <CloudIcon />, label: "Sauvegarde", sub: "Automatique" },
              { icon: <HeadphonesIcon />, label: "Support 24/7", sub: "Assistance dédiée" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2.5">
                <div className="text-blue-500 dark:text-blue-400 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  {b.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{b.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — hero image + floating card */}
        <div className="relative z-10">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10 group">
            <Image
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop"
              alt="School library books"
              width={560}
              height={380}
              className="w-full h-80 lg:h-[420px] object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* Floating stats card */}
          <div className="absolute -bottom-6 right-6 bg-white/95 dark:bg-[#161c2c]/95 backdrop-blur-md rounded-2xl shadow-2xl p-4.5 flex items-center gap-3.5 min-w-[210px] border border-gray-200 dark:border-white/15">
            <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <SchoolIcon />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight">Des établissements<br/>nous font confiance</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">120+</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">4.8/5</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mt-10 mb-16">
        <div className="bg-white dark:bg-[#111625] rounded-3xl shadow-sm border border-gray-200 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-white/10">
          {[
            { icon: <UsersIcon />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30", label: "Élèves", value: "12 540+", sub: "Inscrits" },
            { icon: <GraduationIcon />, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30", label: "Enseignants", value: "850+", sub: "Actifs" },
            { icon: <SchoolIcon />, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", label: "Établissements", value: "120+", sub: "Partenaires" },
            { icon: <BarChartIcon />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30", label: "Satisfaction", value: "98%", sub: "Taux de satisfaction" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3.5 px-6 py-6">
              <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center ${s.color} shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-400 uppercase tracking-widest font-black">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MOBILE APP SPOTLIGHT ─────────────────────────────────── */}
      <section id="mobile" className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white rounded-3xl p-8 lg:p-12 relative overflow-hidden border border-blue-800/40 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <SmartphoneIcon />
                Application Mobile Élèves &amp; Enseignants
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
                Emportez Édut Pro partout avec vous
              </h2>
              <p className="text-blue-100/80 text-sm lg:text-base leading-relaxed">
                Saisie des notes et devoirs en mode hors-ligne, consultation des bulletins en temps réel et notifications instantanées pour les parents et enseignants.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  "Mode Hors-Ligne & Synchronisation Automatique",
                  "Gestion des Devoirs (DS) & Saisie des Notes",
                  "Bulletins Trimestriels & Semestriels instantanés",
                  "Support Multi-Tenant pour tous les établissements"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shrink-0 font-bold">✓</div>
                    <span className="text-xs lg:text-sm font-semibold text-blue-100">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-lg transition-all"
                >
                  Accéder à l'application Web
                </Link>
                <Link
                  href="/dashboard/about"
                  className="px-6 py-3.5 rounded-xl border border-white/20 text-white hover:bg-white/10 font-bold text-sm transition-all"
                >
                  En savoir plus
                </Link>
              </div>
            </div>
            <div className="flex justify-center relative">
              <div className="w-64 h-[420px] bg-slate-900 rounded-[38px] border-4 border-slate-700 shadow-2xl p-3 flex flex-col justify-between relative">
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
                <div className="bg-slate-800/90 rounded-2xl p-4 space-y-3 flex-1 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-bold">
                    <GraduationIcon />
                  </div>
                  <p className="font-bold text-sm text-white">Édut Pro Mobile</p>
                  <p className="text-[11px] text-slate-400">Saisie des notes &amp; devoirs synchronisée</p>
                  <div className="pt-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ● Connecté &amp; Synchro
                    </span>
                  </div>
                </div>
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
            Pourquoi choisir Édut Pro&nbsp;?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl mx-auto">
            Une plateforme complète et intuitive conçue pour simplifier la vie scolaire au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <MonitorIcon />,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-600",
              label: "Gestion Centralisée",
              desc: "Gérez l'administration générale, les classes, enseignants, notes et devoirs depuis un seul endroit.",
            },
            {
              icon: <UsersIcon />,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-500",
              label: "Communication Fluide",
              desc: "Accès instantané pour la direction, les enseignants, les élèves et les parents en temps réel.",
            },
            {
              icon: <ShieldBigIcon />,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-600",
              label: "Sécurité & Multi-Tenant",
              desc: "Isolation totale des données de chaque établissement avec permissions fines et rôles configurables.",
            },
          ].map(f => (
            <div
              key={f.label}
              className="bg-white dark:bg-[#111625] rounded-3xl border border-gray-200 dark:border-white/10 p-7 flex items-start gap-4 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{f.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO MODAL POPUP ───────────────────────────────────── */}
      {showDemo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#161c2c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowDemo(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <CloseIcon />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <PlayIcon />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Démonstration d'Édut Pro</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Présentation des fonctionnalités principales</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
                <p className="font-bold text-blue-900 dark:text-blue-200 mb-1">1. Tableau de Bord Intégré</p>
                <p className="text-xs text-blue-800/80 dark:text-blue-300/80">Statistiques globales pour Administration Générale et Directeurs de niveau.</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">2. Saisie des Notes &amp; Devoirs (DS)</p>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">Grille interactive avec transfert direct vers le bulletin d'évaluation.</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40">
                <p className="font-bold text-purple-900 dark:text-purple-200 mb-1">3. Synchronisation Mobile Off-Line</p>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80">Fonctionnement complet sans connexion Internet sur l'application Flutter.</p>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDemo(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300"
              >
                Fermer
              </button>
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
              >
                Se connecter à l'App
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#0d111c] border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + copyright */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <GraduationIcon />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Édut Pro</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">© 2026 Édut Pro. Tous droits réservés.</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap items-center gap-6">
            <a href="#features" className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Fonctionnalités
            </a>
            <Link href="/dashboard/about" className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              À propos
            </Link>
            <a href="#mobile" className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              App Mobile
            </a>
            <Link href="/login" className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Connexion
            </Link>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { icon: <FacebookIcon />, label: "Facebook" },
              { icon: <TwitterIcon />, label: "Twitter" },
              { icon: <LinkedInIcon />, label: "LinkedIn" },
              { icon: <YoutubeIcon />, label: "YouTube" },
            ].map(s => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="w-8.5 h-8.5 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/10 transition-all"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
