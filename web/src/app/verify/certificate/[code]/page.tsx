import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/infrastructure/database";
import { lmsCertificates, lmsCourses } from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return {
    title: `Vérification Certificat ${code} — Edut LMS`,
    description: "Vérification officielle d'authenticité de certificat d'apprentissage en ligne Edut",
  };
}

export default async function CertificateVerifyPage({ params }: Props) {
  const { code } = await params;
  if (!code) notFound();

  const cert = await db.query.lmsCertificates.findFirst({
    where: eq(lmsCertificates.certificateCode, code),
    with: {
      student: true,
      course: {
        with: {
          subject: true,
        },
      },
    },
  });

  if (!cert) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="size-16 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Award className="size-8" />
          </div>
          <h1 className="text-xl font-bold">Certificat Introuvable</h1>
          <p className="text-sm text-slate-400">
            Le code <strong>{code}</strong> ne correspond à aucun certificat officiel enregistré sur notre plateforme.
          </p>
          <Link href="/" className="text-indigo-400 hover:underline text-sm block mt-4">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const studentName = cert.student
    ? ((cert.student as any).nomEtudiant || `${(cert.student as any).firstName || ''} ${(cert.student as any).lastName || ''}`.trim() || "Étudiant")
    : "Étudiant";
  const courseTitle = cert.course?.title || "Formation Académique";
  const subjectName = cert.course?.subject?.subjectName || "Matière Principale";
  const issueDate = cert.issueDate
    ? new Date(cert.issueDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date non spécifiée";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Certificate Card */}
        <div className="relative rounded-3xl border-2 border-amber-400/40 bg-slate-900/90 backdrop-blur p-8 shadow-2xl space-y-6 overflow-hidden">
          {/* Watermark Logo */}
          <div className="absolute -right-12 -bottom-12 size-64 text-amber-500/5 pointer-events-none">
            <Award className="size-full" />
          </div>

          {/* Verified Header Badge */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-lg">
              <Award className="size-6" /> EDUT CERTIFIED
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="size-4" /> AUTHENTIQUE
            </div>
          </div>

          {/* Body */}
          <div className="text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Certificat d&apos;Accomplissement & Réussite
            </p>
            <p className="text-sm text-slate-300">Ce certificat officiel atteste que</p>
            <h2 className="text-2xl font-black tracking-tight text-white">{studentName}</h2>
            <p className="text-sm text-slate-300">a complété avec succès et brio le cours</p>
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30">
              <p className="text-lg font-bold text-indigo-300">{courseTitle}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{subjectName}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-white/10 text-slate-300">
            <div>
              <span className="text-slate-500 block">Délivré le</span>
              <span className="font-semibold">{issueDate}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Identifiant Unique</span>
              <span className="font-mono font-bold text-amber-300">{cert.certificateCode}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          Vérifié par la plateforme éducative <strong>EDUT LMS</strong>.{" "}
          <Link href="/" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">
            edut.app <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
