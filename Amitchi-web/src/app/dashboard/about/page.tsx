"use client";

import React, { useState } from "react";
import { Info, Shield, GraduationCap, Calendar, Settings, Heart, CheckCircle2, Bookmark, BookOpen, ChevronDown, ChevronUp, Layers, Clock } from "lucide-react";

// ─── Data: Class naming guide ───────────────────────────────────────────────
const classGuide = [
  {
    level: "Primaire",
    color: "emerald",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    header: "bg-emerald-600",
    rows: [
      { single: "CI A", multi: "CI A, CI B, CI C …", note: "Cours Initiatoire" },
      { single: "CP A", multi: "CP A, CP B, CP C …", note: "Cours Préparatoire" },
      { single: "CE1 A", multi: "CE1 A, CE1 B, CE1 C …", note: "Cours Élémentaire 1" },
      { single: "CE2 A", multi: "CE2 A, CE2 B, CE2 C …", note: "Cours Élémentaire 2" },
      { single: "CM1 A", multi: "CM1 A, CM1 B, CM1 C …", note: "Cours Moyen 1" },
      { single: "CM2 A", multi: "CM2 A, CM2 B, CM2 C …", note: "Cours Moyen 2" },
    ],
  },
  {
    level: "Collège (1er Cycle)",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    header: "bg-blue-600",
    rows: [
      { single: "6ème A", multi: "6ème A, 6ème B, 6ème C …", note: "Sixième" },
      { single: "5ème A", multi: "5ème A, 5ème B, 5ème C …", note: "Cinquième" },
      { single: "4ème A", multi: "4ème A, 4ème B, 4ème C …", note: "Quatrième" },
      { single: "3ème A", multi: "3ème A, 3ème B … 3ème J", note: "Troisième (jusqu'à 10 sections)" },
    ],
  },
  {
    level: "Lycée (2nd Cycle)",
    color: "violet",
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    header: "bg-violet-600",
    rows: [
      { single: "2nde A", multi: "2nde A, 2nde B, 2nde C …", note: "Seconde" },
      { single: "1ère A", multi: "1ère A, 1ère C, 1ère D …", note: "Première (par série)" },
      { single: "Tle A", multi: "Tle A, Tle B, Tle C, Tle D, Tle D1 …", note: "Terminale (par série)" },
      { single: "Tle A-2", multi: "Tle A, Tle A-2, Tle A-3 …", note: "Plusieurs groupes d'une même série" },
    ],
  },
  {
    level: "Terminale — Séries",
    color: "orange",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    header: "bg-orange-600",
    rows: [
      { single: "Tle A", multi: "Tle A, Tle A-2 …", note: "Lettres & Philosophie" },
      { single: "Tle A1", multi: "Tle A1, Tle A1-2 …", note: "Lettres, Langues & Arts" },
      { single: "Tle B", multi: "Tle B, Tle B-2 …", note: "Sciences Économiques & Sociales" },
      { single: "Tle C", multi: "Tle C, Tle C-2 …", note: "Maths & Sciences Physiques" },
      { single: "Tle D", multi: "Tle D, Tle D-2 …", note: "Maths & Sciences de la Vie" },
      { single: "Tle D1", multi: "Tle D1, Tle D1-2 …", note: "Sciences, Technologies & Ingénierie" },
      { single: "Tle F1", multi: "Tle F1, Tle F1-2 …", note: "Mécanique" },
      { single: "Tle G1", multi: "Tle G1, Tle G1-2 …", note: "Commercial & Comptabilité" },
    ],
  },
  {
    level: "Licence (Université)",
    color: "sky",
    bg: "bg-sky-50",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-700",
    header: "bg-sky-600",
    rows: [
      { single: "L1 Informatique", multi: "L1 Informatique, L1 Droit, L1 Arabic …", note: "Licence 1ère année" },
      { single: "L2 Informatique", multi: "L2 Informatique, L2 Droit, L2 Arabic …", note: "Licence 2ème année" },
      { single: "L3 Informatique", multi: "L3 Informatique, L3 Droit, L3 Arabic …", note: "Licence 3ème année" },
    ],
  },
  {
    level: "Master (Université)",
    color: "purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    header: "bg-purple-600",
    rows: [
      { single: "M1 Informatique", multi: "M1 Informatique, M1 Droit, M1 Arabic …", note: "Master 1ère année" },
      { single: "M2 Informatique", multi: "M2 Informatique, M2 Droit, M2 Arabic …", note: "Master 2ème année" },
    ],
  },
  {
    level: "Doctorat (Université)",
    color: "rose",
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    header: "bg-rose-600",
    rows: [
      { single: "D1 Sciences", multi: "D1 Sciences, D1 Droit …", note: "Doctorat 1ère année" },
      { single: "D2 Sciences", multi: "D2 Sciences, D2 Droit …", note: "Doctorat 2ème année" },
      { single: "D3 Sciences", multi: "D3 Sciences, D3 Droit …", note: "Doctorat 3ème année" },
    ],
  },
];

function ClassTable({ item }: { item: typeof classGuide[0] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-2xl border ${item.border} overflow-hidden shadow-sm`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${item.header} text-white`}
      >
        <div className="flex items-center gap-2">
          <GraduationCap size={16} />
          <span className="text-sm font-black tracking-wide">{item.level}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
            {item.rows.length} classe{item.rows.length > 1 ? "s" : ""}
          </span>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className={`${item.bg}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-opacity-30" style={{ borderColor: "currentColor" }}>
                <th className="px-4 py-2.5 text-left font-black text-slate-600 w-[22%]">Fصل مفرد</th>
                <th className="px-4 py-2.5 text-left font-black text-slate-600 w-[45%]">فصول متعددة</th>
                <th className="px-4 py-2.5 text-left font-black text-slate-600">ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white/60" : "bg-white/20"}>
                  <td className="px-4 py-2.5">
                    <code className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${item.badge}`}>
                      {row.single}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{row.multi}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-medium">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200">
          <Info size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">À propos d'Edut Pro</h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">Informations sur la plateforme et les versions du système</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edut Pro — Système de Gestion Scolaire Intégré</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Edut Pro est une plateforme SaaS moderne de gestion d'établissements scolaires conçue pour rationaliser les processus administratifs, académiques, financiers et pédagogiques.
              </p>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Grâce à son architecture multi-tenant et ses applications mobiles intégrées, Edut Pro relie en temps réel les administrateurs, les enseignants, les élèves et les parents d'élèves pour un suivi fluide et une communication transparente.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fonctionnalités Clés du Système</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Gestion Académique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Filières, classes, examens, notes et bulletins automatisés.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Suivi Pédagogique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Cahier de textes quotidien, planifications et remédiation scolaire.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Multi-Tenancy & Sécurité</p>
                    <p className="text-[10px] text-slate-400 font-medium">Séparation stricte des écoles et gestion fine des permissions (RBAC).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Ressources & Logistique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Gestion du transport scolaire, de l'internat, de la cantine et de la bibliothèque.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Informations Système</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Version du logiciel</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">v2.4.0</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Statut du serveur</span>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Actif
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Dernière mise à jour</span>
                </div>
                <span className="text-xs font-bold text-slate-500">Juillet 2026</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                Propulsé avec <Heart size={10} className="text-rose-500 fill-rose-500" /> par l'équipe Edut
              </p>
              <p className="text-[9px] text-slate-400 mt-1">© 2026 Edut Pro. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Academic Structure Setup Guide ─────────────────────────────────── */}
      <div className="space-y-6 pt-6 border-t border-slate-200/80">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Guide de Création de la Structure Académique
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Étapes détaillées pour configurer les listes académiques (Sessions, Sections, Classes, Matières et Périodes)
            </p>
          </div>
        </div>

        {/* 5-Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center border border-indigo-100">
              1
            </div>
            <div className="flex items-center gap-2 text-indigo-700 font-black text-sm">
              <Calendar size={16} />
              <span>Sessions Académiques</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Définit l'année scolaire globale (ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">2025-2026</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">2026-2027</code>).
            </p>
            <div className="pt-2 border-t border-slate-50 text-[11px] text-slate-400 font-semibold space-y-1">
              <p>📍 <strong>Chemin:</strong> Paramètres → Sessions Académiques</p>
              <p>💡 Marquer la session comme <span className="text-emerald-600 font-bold">Active</span> pour alimenter automatiquement les filtres du système.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:border-blue-200 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center border border-blue-100">
              2
            </div>
            <div className="flex items-center gap-2 text-blue-700 font-black text-sm">
              <Bookmark size={16} />
              <span>Niveaux &amp; Sections (Séries)</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Regroupe les séries par niveau d'enseignement (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">Primaire</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">Collège</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">Lycée</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">Université</code>).
            </p>
            <div className="pt-2 border-t border-slate-50 text-[11px] text-slate-400 font-semibold space-y-1">
              <p>📍 <strong>Chemin:</strong> Paramètres → Sections / Séries</p>
              <p>💡 Exemples: <span className="text-slate-600 font-bold">Série D (Scientifique)</span>, <span className="text-slate-600 font-bold">Série A (Littéraire)</span>, <span className="text-slate-600 font-bold">L1 Droit</span>.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:border-violet-200 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 font-black text-sm flex items-center justify-center border border-violet-100">
              3
            </div>
            <div className="flex items-center gap-2 text-violet-700 font-black text-sm">
              <GraduationCap size={16} />
              <span>Classes</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Crée les classes physiques associées à chaque section (<code className="bg-slate-100 px-1 py-0.5 rounded text-violet-600 font-bold">6ème A</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-600 font-bold">3ème A</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-600 font-bold">Tle D</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-600 font-bold">L1 Info</code>).
            </p>
            <div className="pt-2 border-t border-slate-50 text-[11px] text-slate-400 font-semibold space-y-1">
              <p>📍 <strong>Chemin:</strong> Paramètres → Classes</p>
              <p>⚠️ <strong>Attention:</strong> Le nom doit être scrupuleusement identique à celui utilisé dans l'importation Excel des élèves.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-black text-sm flex items-center justify-center border border-amber-100">
              4
            </div>
            <div className="flex items-center gap-2 text-amber-700 font-black text-sm">
              <BookOpen size={16} />
              <span>Matières &amp; Coefficients</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Définit les matières enseignées et attribue les coefficients selon la filière (ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600 font-bold">Coef 4</code> en Tle C).
            </p>
            <div className="pt-2 border-t border-slate-50 text-[11px] text-slate-400 font-semibold space-y-1">
              <p>📍 <strong>Chemin:</strong> Paramètres → Matières &amp; Plan d'Études</p>
              <p>💡 Affecter chaque matière à sa classe ou section avec son coefficient correspondant.</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all lg:col-span-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-black text-sm flex items-center justify-center border border-emerald-100">
              5
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
              <Clock size={16} />
              <span>Périodes Académiques (Trimestres / Semestres)</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Le système adapte automatiquement les périodes d'évaluation selon le niveau de la classe sélectionnée:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs">
                <p className="font-black text-emerald-800">Primaire</p>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">3 Trimestres:<br /><code>1er Trimestre</code>, <code>2ème Trimestre</code>, <code>3ème Trimestre</code></p>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs">
                <p className="font-black text-indigo-800">Collège &amp; Lycée</p>
                <p className="text-[11px] text-indigo-700 font-medium mt-1">2 Semestres:<br /><code>1er Semestre</code>, <code>2ème Semestre</code></p>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs">
                <p className="font-black text-purple-800">Université (LMD)</p>
                <p className="text-[11px] text-purple-700 font-medium mt-1">14 Semestres:<br /><code>1er Semestre (S1)</code> à <code>14ème Semestre (S14)</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Class Naming Guide ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Section header */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Guide de Nommage des Classes
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Comment nommer correctement les classes dans Edut Pro — du Primaire au Doctorat
            </p>
          </div>
        </div>

        {/* Rule banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-black text-amber-800">Règle d'Or — Correspondance Exacte</p>
            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
              Le champ <code className="bg-amber-100 px-1.5 py-0.5 rounded font-black">classe</code> dans le fichier d'importation des élèves
              doit être <strong>identique mot pour mot</strong> au nom défini dans
              <strong> Paramètres → Classes/Niveaux</strong>. Toute différence (espace, accent, majuscule) provoque l'absence des élèves dans les notes.
            </p>
          </div>
        </div>

        {/* Tables per level */}
        <div className="space-y-4">
          {classGuide.map((item, i) => (
            <ClassTable key={i} item={item} />
          ))}
        </div>

        {/* Multiple groups tip */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-black text-slate-700 mb-2">📌 Règle pour plusieurs groupes du même niveau</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-medium">
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <p className="font-black text-slate-800 mb-1">✅ Correct</p>
              <code className="text-emerald-700 font-black">Tle D</code><br />
              <code className="text-emerald-700 font-black">Tle D-2</code><br />
              <code className="text-emerald-700 font-black">Tle D-3</code>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <p className="font-black text-slate-800 mb-1">✅ Correct</p>
              <code className="text-emerald-700 font-black">L1 Informatique</code><br />
              <code className="text-emerald-700 font-black">L1 Droit</code><br />
              <code className="text-emerald-700 font-black">L1 Arabic</code>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <p className="font-black text-slate-800 mb-1">❌ Incorrect</p>
              <code className="text-rose-600 font-black">Tle D1</code> ← série différente<br />
              <code className="text-rose-600 font-black">Licence 1</code> ← format non uniforme<br />
              <code className="text-rose-600 font-black">tle d</code> ← minuscules
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
