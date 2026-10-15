export const dynamic = "force-dynamic";

import { AIAnalyticsService } from "@/domains/ai/services/ai-analytics.service";
import AIAnalyticsClient from "./AIAnalyticsClient";

export default async function AIAnalyticsPage() {
  const initialOverview = await AIAnalyticsService.getSchoolDropoutRiskOverview();

  return <AIAnalyticsClient initialOverview={initialOverview} />;
}
