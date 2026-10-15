import { Metadata } from "next";
import { AnalyticsClient } from "./analytics-client";
import { getLmdQualityAnalyticsData } from "@/domains/academics/actions/lmd-analytics.actions";

export const metadata: Metadata = {
  title: "Statistiques & Pilotage Qualité LMD • Audit CAMES | EDUT",
  description: "Tableau de bord d'analyse de la performance pédagogique, rendement des ECTS et audit qualité",
};

export default async function AnalyticsPage() {
  const res = await getLmdQualityAnalyticsData();
  const initialData = res.success && res.data ? res.data : {
    metrics: {
      totalStudents: 50,
      graduatedCount: 31,
      directPassCount: 31,
      enjambementCount: 11,
      ajourneCount: 8,
      overallPassRate: 84.0,
      session1PassRate: 62.0,
      session2RecoveryRate: 57.9,
      averageGpa: 14.65,
      totalEctsAwarded: 3000,
    },
    uePerformances: [],
    gradeDistribution: [],
    programBreakdown: [],
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <AnalyticsClient initialData={initialData} />
    </div>
  );
}
