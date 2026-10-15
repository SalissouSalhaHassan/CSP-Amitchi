export const dynamic = "force-dynamic";

import {
  getGlobalPlatformStats,
  getAllSchools,
  getGlobalAuditLogs,
  getSchoolUsageSummary,
} from "@/domains/platform/actions/platform.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { PlatformAdminClient } from "./components/PlatformAdminClient";

export default async function PlatformAdminPage() {
  const [statsRes, schoolsRes, logsRes, usageRes, currentUser] = await Promise.all([
    getGlobalPlatformStats(),
    getAllSchools(),
    getGlobalAuditLogs(),
    getSchoolUsageSummary(),
    getCurrentUser(),
  ]);

  const stats = statsRes.success
    ? statsRes.data || { schools: 0, students: 0, users: 0, revenue: 0 }
    : { schools: 0, students: 0, users: 0, revenue: 0 };
  const schoolsList = schoolsRes.success ? schoolsRes.data || [] : [];
  const logs = logsRes.success ? logsRes.data || [] : [];
  const usageData = usageRes.success ? usageRes.data : { global: { totalSchools: 0, totalStudents: 0, totalUsers: 0, totalSyncs: 0, supabaseDbMaxMb: 500, supabaseStorageMaxMb: 1000, supabaseEgressMaxGb: 5, supabaseMauMax: 50000 }, schoolsUsage: [] };

  const userName = currentUser?.nomPrenom || currentUser?.utilisateur || "Super Admin";

  return (
    <PlatformAdminClient
      stats={stats}
      schoolsList={schoolsList}
      logs={logs}
      usageData={usageData}
      userName={userName}
    />
  );
}
