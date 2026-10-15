import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  XCircle,
  AlertTriangle,
  FileText,
  GraduationCap,
  Calendar,
  Building2,
  ExternalLink,
  Download,
  User,
  Hash,
  Star,
  Trophy,
} from "lucide-react";
import { verifyBulletinByToken } from "@/domains/academics/actions/bulletin-batch.actions";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  return {
    title: "Vérification Bulletin — Edut",
    description: `Vérification d'authenticité du bulletin scolaire — Token: ${token.slice(0, 8)}...`,
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; text: string; colors: string; bg: string }> = {
    validé: {
      icon: <ShieldCheck className="size-20 drop-shadow-lg" />,
      text: "BULLETIN AUTHENTIQUE ET VALIDÉ",
      colors: "text-emerald-600",
      bg: "from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:border-emerald-800",
    },
    provisoire: {
      icon: <AlertTriangle className="size-20 drop-shadow-lg" />,
      text: "BULLETIN PROVISOIRE — EN ATTENTE DE VALIDATION",
      colors: "text-amber-500",
      bg: "from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/30 dark:border-amber-800",
    },
    annulé: {
      icon: <XCircle className="size-20 drop-shadow-lg" />,
      text: "BULLETIN ANNULÉ — NON RECEVABLE",
      colors: "text-rose-600",
      bg: "from-rose-50 to-rose-100 border-rose-200 dark:from-rose-950/50 dark:to-rose-900/30 dark:border-rose-800",
    },
  };

  const cfg = map[status] ?? {
    icon: <ShieldAlert className="size-20 drop-shadow-lg" />,
    text: "DOCUMENT NON RÉFÉRENCÉ",
    colors: "text-slate-500",
    bg: "from-slate-50 to-slate-100 border-slate-200",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${cfg.bg} p-8 text-center`}>
      <div className={`${cfg.colors} flex justify-center mb-4`}>{cfg.icon}</div>
      <p className={`text-lg font-bold tracking-wide ${cfg.colors}`}>{cfg.text}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default async function BulletinVerifyPage({ params }: Props) {
  const { token } = await params;

  if (!token || token.length < 8) notFound();

  const record = await verifyBulletinByToken(token);

  if (!record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Document introuvable</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Ce bulletin n&apos;existe pas dans notre registre officiel ou le lien est invalide.
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-700 text-sm">Token non reconnu</p>
                <p className="text-rose-600 text-xs mt-1 font-mono break-all">{token}</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/" className="text-indigo-600 hover:underline text-sm">
              ← Retour à l&apos;accueil Edut
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const student = (record as any).student;
  const classe = (record as any).class;
  const sessionData = (record as any).session;

  const studentName = student?.nomEtudiant || student?.name || "N/A";
  const matricule = student?.numAdmission || student?.matricule || "N/A";
  const className = classe?.className || record.classId ? `Classe #${record.classId}` : "N/A";
  const sessionName = sessionData?.sessionName || "N/A";
  const period = record.period || "N/A";
  const average = record.average != null ? Number(record.average).toFixed(2) : "N/A";
  const rank = record.rank || "N/A";
  const totalStudents = record.totalStudents ?? "N/A";
  const decision = record.decision || "N/A";
  const generatedAt = record.generatedAt
    ? new Date(record.generatedAt).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "N/A";
  const status = record.status || "validé";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Edut Brand Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="size-8 text-indigo-600" />
            <span className="text-2xl font-extrabold tracking-tight text-indigo-700">EDUT</span>
          </div>
          <p className="text-xs text-slate-500">Système de Gestion Scolaire · Vérification Officielle</p>
        </div>

        {/* Status Badge */}
        <StatusBadge status={status} />

        {/* Student Info Card */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          <div className="bg-indigo-600 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
              Informations de l&apos;élève
            </p>
          </div>
          <div className="px-5 py-1">
            <InfoRow icon={<User className="size-4" />} label="Nom complet" value={studentName} />
            <InfoRow icon={<Hash className="size-4" />} label="Matricule" value={matricule} />
            <InfoRow icon={<Building2 className="size-4" />} label="Classe" value={className} />
            <InfoRow icon={<Calendar className="size-4" />} label="Année scolaire" value={sessionName} />
            <InfoRow icon={<FileText className="size-4" />} label="Période" value={period} />
          </div>
        </div>

        {/* Results Card */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          <div className="bg-emerald-600 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              Résultats académiques
            </p>
          </div>
          <div className="px-5 py-1">
            <InfoRow
              icon={<Star className="size-4" />}
              label="Moyenne générale"
              value={average !== "N/A" ? `${average} / 20` : "N/A"}
            />
            <InfoRow
              icon={<Trophy className="size-4" />}
              label="Classement"
              value={rank !== "N/A" ? `${rank} / ${totalStudents}` : "N/A"}
            />
            <InfoRow
              icon={<GraduationCap className="size-4" />}
              label="Décision du conseil"
              value={decision}
            />
          </div>
        </div>

        {/* Authenticity Info */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Authenticité & Traçabilité
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Date d&apos;émission</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{generatedAt}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Token de vérification</span>
            <span className="font-mono text-xs text-slate-500 truncate max-w-[180px]">{token}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Statut du document</span>
            <span className={`font-semibold capitalize ${
              status === "validé" ? "text-emerald-600" :
              status === "annulé" ? "text-rose-600" : "text-amber-600"
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Download Button (if PDF available) */}
        {record.pdfUrl && status === "validé" && (
          <a
            href={record.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Download className="size-5" />
            Télécharger le bulletin officiel (PDF)
          </a>
        )}

        {/* Edut Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-slate-400">
            Ce document a été vérifié par le système EDUT.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline"
          >
            edut.app <ExternalLink className="size-3" />
          </Link>
        </div>

      </div>
    </div>
  );
}
