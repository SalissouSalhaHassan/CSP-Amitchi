export const dynamic = "force-dynamic";

import { getCurrentSchool } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import SubscriptionClient from "./subscription-client";
import { readDb } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { getSchoolStats } from "@/domains/auth/actions/subscription.actions";

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Primary: get school by subdomain slug
  let school = await getCurrentSchool();

  // Fallback 1: use school embedded in user session
  if (!school && user?.school) {
    school = user.school as any;
  }

  // For Super Admin on main domain: fetch all schools so they can manage any
  let allSchools: typeof schools.$inferSelect[] = [];
  const isSuperAdmin = !!(user?.superAdmin);
  if (isSuperAdmin) {
    try {
      allSchools = await readDb.query.schools.findMany({
        orderBy: (s, { asc }) => [asc(s.name)],
      });
      // Default to first school if no school context
      if (!school && allSchools.length > 0) {
        school = allSchools[0] as any;
      }
    } catch (e) {
      console.error("[SubscriptionPage] Failed to fetch schools for super admin:", e);
    }
  }

  // Fetch real stats for the current school
  const stats = school?.id
    ? await getSchoolStats(school.id)
    : { totalStudents: 0, activeStudents: 0, totalEmployees: 0, totalClasses: 0, totalSections: 0, totalUsers: 0 };

  return (
    <SubscriptionClient
      initialSchool={school}
      user={user}
      allSchools={allSchools}
      isSuperAdmin={isSuperAdmin}
      initialStats={stats}
    />
  );
}

