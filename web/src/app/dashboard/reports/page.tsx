export const dynamic = "force-dynamic";

import { getUnifiedReportsData } from "@/domains/reports/actions/reports.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import ReportsDashboard from "./reports-dashboard";

export default async function ReportsPage() {
  try {
    const user = await getCurrentUser().catch(() => null);
    
    let branchData = null;
    let unifiedData = {
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
      auditLogs: [],
      grades: [],
      sessions: [],
      periods: []
    };

    if (user) {
      const [unifiedRes, branchRes] = await Promise.all([
        getUnifiedReportsData().catch((e) => {
          console.error("[ReportsPage] getUnifiedReportsData error:", e);
          return null;
        }),
        getActiveBranchData(user).catch((e) => {
          console.error("[ReportsPage] getActiveBranchData error:", e);
          return null;
        })
      ]);

      branchData = (branchRes as any)?.branchData || null;
      const reportData = (unifiedRes as any)?.data;
      if (reportData) {
        unifiedData = {
          students: Array.isArray(reportData.students) ? reportData.students : [],
          classes: Array.isArray(reportData.classes) ? reportData.classes : [],
          subjects: Array.isArray(reportData.subjects) ? reportData.subjects : [],
          employees: Array.isArray(reportData.employees) ? reportData.employees : [],
          feePayments: Array.isArray(reportData.feePayments) ? reportData.feePayments : [],
          expenses: Array.isArray(reportData.expenses) ? reportData.expenses : [],
          attendance: Array.isArray(reportData.attendance) ? reportData.attendance : [],
          seances: Array.isArray(reportData.seances) ? reportData.seances : [],
          plans: Array.isArray(reportData.plans) ? reportData.plans : [],
          resources: Array.isArray(reportData.resources) ? reportData.resources : [],
          courses: Array.isArray(reportData.courses) ? reportData.courses : [],
          lessons: Array.isArray(reportData.lessons) ? reportData.lessons : [],
          assignments: Array.isArray(reportData.assignments) ? reportData.assignments : [],
          submissions: Array.isArray(reportData.submissions) ? reportData.submissions : [],
          progress: Array.isArray(reportData.progress) ? reportData.progress : [],
          virtualClasses: Array.isArray(reportData.virtualClasses) ? reportData.virtualClasses : [],
          auditLogs: Array.isArray(reportData.auditLogs) ? reportData.auditLogs : [],
          grades: Array.isArray(reportData.grades) ? reportData.grades : [],
          sessions: Array.isArray(reportData.sessions) ? reportData.sessions : [],
          periods: Array.isArray(reportData.periods) ? reportData.periods : []
        };
      }
    }

    const branding = {
      name: branchData?.branchName || user?.school?.name || "Edut Pro",
      logoPath: branchData?.logoPath || user?.school?.logoPath || null,
      level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
    };

    return <ReportsDashboard unifiedData={unifiedData} branding={branding} currentUser={user} />;
  } catch (error) {
    console.error("[ReportsPage] Critical error:", error);
    return (
      <ReportsDashboard
        unifiedData={{
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
          auditLogs: [],
          grades: [],
          sessions: [],
          periods: []
        }}
        branding={{ name: "Edut Pro", logoPath: null, level: "Gestion Scolaire" }}
        currentUser={null}
      />
    );
  }
}
