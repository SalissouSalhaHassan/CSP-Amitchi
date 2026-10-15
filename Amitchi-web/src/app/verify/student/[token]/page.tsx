import { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schools } from "@/infrastructure/database/schema/auth";
import { decodeStudentToken } from "@/shared/utils/student-token";
import {
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Building2,
  Calendar,
  User,
  HeartPulse,
  Phone,
  QrCode,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Vérification Officielle de Carte Scolaire | EDUT Identity`,
    description: "Portail public d'authentification et de validation de carte d'identité scolaire et universitaire EDUT.",
  };
}

export default async function StudentVerifyPage({ params }: PageProps) {
  const { token } = await params;

  // 1. Decode & Resolve Student
  const decoded = decodeStudentToken(token);
  let student = null;
  let school = null;

  if (decoded?.studentId) {
    student = await readDb.query.students.findFirst({
      where: eq(students.id, decoded.studentId),
    });
  }

  // Fallback if token is direct matricule or raw ID
  if (!student && token) {
    const rawId = Number(token);
    if (!isNaN(rawId) && rawId > 0) {
      student = await readDb.query.students.findFirst({
        where: eq(students.id, rawId),
      });
    } else {
      student = await readDb.query.students.findFirst({
        where: eq(students.numAdmission, token.trim()),
      });
    }
  }

  if (student?.schoolId) {
    school = await readDb.query.schools.findFirst({
      where: eq(schools.id, student.schoolId),
    });
  }

  const isValid = !!student && (student.statut || "Actif").toLowerCase() === "actif";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <GraduationCap className="h-4 w-4" />
          <span>EDUT Identity • Validation Officielle</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Accueil</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden z-10">
        {/* Top Glow Stripe */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isValid ? "from-emerald-500 via-teal-400 to-indigo-500" : "from-rose-500 via-amber-500 to-rose-600"
          }`}
        />

        {isValid && student ? (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <ShieldCheck className="h-9 w-9" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
                Carte Scolaire Authentique & Active
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {school?.name || "Établissement Scolaire Certifié"}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Vérifié et enregistré sur la plateforme sécurisée EDUT
              </p>
            </div>

            {/* Student Profile Card */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
              {/* Photo */}
              <div className="relative shrink-0">
                {student.photoPath ? (
                  <img
                    src={student.photoPath}
                    alt={student.nomEtudiant}
                    className="w-24 h-28 object-cover rounded-xl border-2 border-indigo-500/40 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-28 rounded-xl bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center text-slate-500">
                    <User className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-semibold">Photo</span>
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-400 shadow">
                  ACTIF
                </span>
              </div>

              {/* Identity details */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="text-base sm:text-lg font-black text-white leading-tight">
                  {student.nomEtudiant}
                </div>
                {student.nomArabe && (
                  <div className="text-xs text-indigo-300 font-arabic">
                    {student.nomArabe}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <span>Classe : {student.classe || "Non assignée"}</span>
                  {student.section && <span>• Sect. {student.section}</span>}
                </div>
                <div className="text-xs text-slate-400">
                  Matricule : <span className="font-mono text-slate-200 font-bold">{student.numAdmission}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-indigo-400" />
                  Régime
                </div>
                <div className="font-semibold text-slate-200">
                  {student.categorie || "Externe"}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                  <HeartPulse className="h-3 w-3 text-rose-400" />
                  Groupe Sanguin
                </div>
                <div className="font-semibold text-slate-200">
                  {student.groupeSanguin || "Non renseigné"}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  Niveau / Cycle
                </div>
                <div className="font-semibold text-slate-200">
                  {student.educationalLevel || "Secondaire / Universitaire"}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-emerald-400" />
                  Contact Tuteur
                </div>
                <div className="font-semibold text-slate-200 truncate">
                  {student.mobile || student.whatsapp || "Enregistré"}
                </div>
              </div>
            </div>

            {/* Anti-fraud notice */}
            <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-indigo-400" />
                <span>Horodatage vérifié par EDUT Security Core</span>
              </div>
              <span className="font-mono text-slate-400">{new Date().getFullYear()}</span>
            </div>
          </div>
        ) : (
          /* Invalid / Not found state */
          <div className="text-center py-6 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Document Non Valide ou Inconnu
            </span>
            <h2 className="text-xl font-bold text-white">
              Élève Non Reconnu dans le Registre Officiel
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Le code scanné ne correspond à aucun élève actif ou le document a été désactivé par l'administration.
            </p>
          </div>
        )}
      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} EDUT Inc. Système de Gestion Éducative Intelligente. Tous droits réservés.
      </div>
    </div>
  );
}
