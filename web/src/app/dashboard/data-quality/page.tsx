export const dynamic = "force-dynamic";

import { getUnifiedReportsData } from "@/domains/reports/actions/reports.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import DataQualityClient from "./data-quality-client";

export default async function DataQualityPage() {
  const user = await getCurrentUser();
  const [unifiedRes, { branchData }] = await Promise.all([
    getUnifiedReportsData(),
    getActiveBranchData(user)
  ]);

  const unifiedData = (unifiedRes as any)?.data || {
    students: [],
    classes: [],
    subjects: [],
    employees: [],
    feePayments: [],
    expenses: [],
    attendance: [],
    seances: [],
    plans: [],
    resources: [],
    courses: [],
    lessons: [],
    assignments: [],
    submissions: [],
    progress: [],
    virtualClasses: [],
    auditLogs: []
  };

  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  return <DataQualityClient unifiedData={unifiedData} branding={branding} currentUser={user} />;
}
