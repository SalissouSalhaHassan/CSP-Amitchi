import { getPredictiveAnalyticsData } from "@/domains/analytics/actions/bi.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import BIClient from "./BIClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // 1. Fetch current user session
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Fetch predictive analytics data
  const result = await getPredictiveAnalyticsData();
  
  if (result.error) {
    redirect("/dashboard");
  }

  const { dropoutAlerts, regressionAlerts, indicators, metrics } = result.data || {
    dropoutAlerts: [],
    regressionAlerts: [],
    indicators: { weakSubjects: [], classSuccessRates: [], absencesFailureCorrelation: [] },
    metrics: { highRiskCount: 0, mediumRiskCount: 0, regressionCount: 0, overallAttendanceRate: 95 }
  };

  return (
    <BIClient
      currentUser={currentUser}
      dropoutAlerts={dropoutAlerts}
      regressionAlerts={regressionAlerts}
      indicators={indicators}
      metrics={metrics}
    />
  );
}
