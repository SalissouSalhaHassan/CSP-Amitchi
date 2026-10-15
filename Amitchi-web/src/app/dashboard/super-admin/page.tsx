export const dynamic = "force-dynamic";

import { getAllSchools as getPlatformSchools, getGlobalPlatformStats } from "@/domains/platform/actions/platform.actions";
import { getAllSchools as getSuperAdminSchools, getPlatformStats } from "@/domains/auth/actions/super-admin.actions";
import { getCurrentUser, isConfiguredPlatformOwner } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import SuperAdminClient from "./super-admin-client";

export default async function SuperAdminDashboard() {
  const user = await getCurrentUser();
  const isSuperAdmin = Boolean(
    user && (
      user.superAdmin === true ||
      user.superAdmin === 1 ||
      user.admin === true ||
      isConfiguredPlatformOwner(user.utilisateur)
    )
  );

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  // Fetch stats and schools with graceful fallbacks
  const [platformStatsRes, platformSchoolsRes] = await Promise.all([
    getGlobalPlatformStats(),
    getPlatformSchools(),
  ]);

  let schoolsList: any[] = [];

  if (platformSchoolsRes.success && Array.isArray(platformSchoolsRes.data)) {
    schoolsList = platformSchoolsRes.data;
  } else if (platformSchoolsRes.success && Array.isArray((platformSchoolsRes.data as any)?.data)) {
    schoolsList = (platformSchoolsRes.data as any).data;
  } else {
    // Fallback to super-admin actions
    const superAdminSchoolsRes = await getSuperAdminSchools();
    if (superAdminSchoolsRes.success) {
      schoolsList = (superAdminSchoolsRes.data as any)?.data || superAdminSchoolsRes.data || [];
    }
  }

  const rawStats: any = platformStatsRes.success ? platformStatsRes.data : null;
  const stats = {
    totalSchools: rawStats?.schools ?? rawStats?.totalSchools ?? schoolsList.length,
    totalStudents: rawStats?.students ?? rawStats?.totalStudents ?? 0,
    activeSchools: schoolsList.filter((s: any) => s.status === "active").length,
    revenue: rawStats?.revenue ?? 0,
  };

  return (
    <SuperAdminClient 
      initialSchools={schoolsList} 
      stats={stats} 
      user={user} 
    />
  );
}
