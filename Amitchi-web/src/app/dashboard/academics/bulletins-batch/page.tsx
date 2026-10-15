import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getBatchBulletinData } from "@/domains/academics/actions/academics.actions";
import { fetchBulletinDataForClass } from "@/domains/academics/actions/bulletin-batch.actions";
import { db } from "@/infrastructure/database";
import { schoolClasses, academicPeriods, schoolSessions } from "@/infrastructure/database/schema/academics";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { fetchDocumentHeaderConfigForSchool } from "@/domains/settings/actions/settings.actions";
import { and, eq, or, isNull, desc } from "drizzle-orm";
import { inferEducationalLevel, isHigherEducationLevel, isLevelMatching } from "@/domains/printing/document-header";
import BulletinBatchClient from "./batch-client";
import { Printer, Sparkles, GraduationCap, Calendar, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Impression & Distribution des Bulletins — Edut Pro",
  description: "Générer, imprimer et distribuer les bulletins scolaires officiels en lot",
};

interface Props {
  searchParams: Promise<{ classId?: string; periodId?: string }>;
}

export default async function BulletinsBatchPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;
  const classId = params.classId ? parseInt(params.classId) : null;
  const periodId = params.periodId ? parseInt(params.periodId) : null;

  // Fetch all classes for this school (flexible matching)
  const classes = await db.query.schoolClasses.findMany({
    where: or(
      eq(schoolClasses.schoolId, schoolId),
      isNull(schoolClasses.schoolId)
    ),
    orderBy: (t, { asc }) => [asc(t.className)],
  });

  // Fetch all active periods
  const activeSessions = await db.query.schoolSessions.findMany({
    where: or(
      eq(schoolSessions.schoolId, schoolId),
      isNull(schoolSessions.schoolId)
    ),
    with: { periods: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  let periods = activeSessions.flatMap((s: any) =>
    (s.periods || []).map((p: any) => ({ ...p, sessionName: s.sessionName, sessionId: s.id }))
  );

  if (periods.length === 0) {
    try {
      const allPeriods = await db.query.academicPeriods.findMany();
      periods = allPeriods.map((p: any) => ({ ...p, sessionName: "Année Scolaire" }));
    } catch (_) {}
  }

  // If class + period selected, load students & enriched bulletin data
  let batchData: any = null;
  let enrichedBulletins: any[] = [];
  let selectedClass: any = null;
  let selectedPeriod: any = null;

  if (classId && periodId) {
    selectedClass = classes.find((c: any) => c.id === classId) || await db.query.schoolClasses.findFirst({ where: eq(schoolClasses.id, classId) });
    selectedPeriod = periods.find((p: any) => p.id === periodId) || await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) });
    
    const sessionId = selectedPeriod?.sessionId || selectedPeriod?.session?.id || activeSessions[0]?.id || 1;
    const periodName = selectedPeriod?.name || "1er Semestre";

    const [classData, batchRes] = await Promise.all([
      fetchBulletinDataForClass(classId, periodId, schoolId),
      getBatchBulletinData(classId, sessionId, periodName),
    ]);

    batchData = classData;
    if (batchRes && batchRes.data && Array.isArray(batchRes.data)) {
      enrichedBulletins = batchRes.data;
    }
  }

  // Fetch branchInfo & headerConfig
  let branchInfo: any = {};
  let headerConfig: any = {};
  try {
    const targetLevel = inferEducationalLevel({
      educationalLevel: (selectedClass as any)?.section?.educationalLevel,
      className: (selectedClass as any)?.className,
      sectionName: (selectedClass as any)?.section?.sectionName,
    });
    const targetBranchId = (selectedClass as any)?.branchId || undefined;
    const branches = await db.query.schoolBranches.findMany({
      where: eq(schoolBranches.schoolId, schoolId),
      orderBy: [desc(schoolBranches.createdAt)],
    });

    let branchRes = null;
    if (targetBranchId && branches.length > 0) {
      branchRes = branches.find((b) => b.id === Number(targetBranchId));
    }
    if (!branchRes && branches.length > 0) {
      branchRes =
        branches.find((b) => b.instType !== "Tous" && (isLevelMatching(b.instType || "", targetLevel) || isLevelMatching(b.branchName || "", targetLevel))) ||
        branches.find((b) => isLevelMatching(b.instType || "", targetLevel) || isLevelMatching(b.branchName || "", targetLevel));

      if (!branchRes) {
        const isUniv = isHigherEducationLevel(targetLevel);
        branchRes = isUniv
          ? branches.find((b) => b.instType?.toLowerCase().includes("univ") || b.branchName?.toLowerCase().includes("univ"))
          : branches.find((b) => !b.instType?.toLowerCase().includes("univ") && !b.branchName?.toLowerCase().includes("univ"));
      }
      if (!branchRes) branchRes = branches[0];
    }

    const headerRes = await fetchDocumentHeaderConfigForSchool(schoolId, targetLevel, branchRes?.id);
    branchInfo = branchRes || {};
    headerConfig = headerRes || {};
  } catch (_) {}

  return (
    <div className="min-h-full bg-transparent">
      {/* Selector Header (when no class/period selected) */}
      {(!classId || !periodId) && (
        <div className="mx-auto max-w-3xl p-6 md:p-12 space-y-8 animate-in fade-in duration-500 text-slate-100">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400 uppercase tracking-widest">
              <Sparkles size={14} /> Centre d'Édition & Distribution
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Génération & Impression des Bulletins
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto font-medium">
              Sélectionnez la classe et le trimestre/semestre pour lancer la production groupée et la distribution numérique.
            </p>
          </div>

          <form className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10 space-y-6 shadow-2xl shadow-black/40">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap size={15} className="text-indigo-400" />
                Classe Concernée
              </label>
              <select
                name="classId"
                defaultValue={classId ?? ""}
                required
                className="w-full h-13 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Sélectionner une classe --</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={15} className="text-emerald-400" />
                Période / Trimestre
              </label>
              <select
                name="periodId"
                defaultValue={periodId ?? ""}
                required
                className="w-full h-13 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Sélectionner une période --</option>
                {periods.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} {p.sessionName ? `(${p.sessionName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-black text-sm text-white shadow-xl shadow-indigo-600/25 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Charger les Bulletins de la Classe <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Main Print Batch View */}
      {classId && periodId && (
        <BulletinBatchClient
          classId={classId}
          periodId={periodId}
          schoolId={schoolId}
          className={selectedClass?.className || "Classe"}
          period={selectedPeriod?.name || "Période"}
          session={selectedPeriod?.sessionName || "Année Scolaire"}
          students={batchData?.students || []}
          enrichedBulletins={enrichedBulletins}
          branchInfo={branchInfo}
          headerConfig={headerConfig}
        />
      )}
    </div>
  );
}
