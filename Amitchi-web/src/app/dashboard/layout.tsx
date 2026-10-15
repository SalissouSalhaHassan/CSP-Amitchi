import * as React from "react";
import DashboardSidebar from "./sidebar";
import { DashboardLoadingBar } from "./loading-bar";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import { getUnreadNotificationsCount } from "@/domains/messaging/actions/notifications.actions";
import { NavigationProgressProvider } from "@/components/providers/navigation-progress";
import SyncStatus from "@/components/common/SyncStatus";
import { InactivityLockOverlay } from "@/components/auth/InactivityLockOverlay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadNotificationsCount();
  } catch (e) {
    console.warn("⚠️ Failed to fetch unread notifications count in layout.");
  }
  
  // Fetch branch data based on user's educational level and schoolId
  const { branchData, allBranches } = await getActiveBranchData(user);

  // Final branding fallback: if no branch data found, use school data from user object
  const isGeneralAdmin = !branchData && allBranches && allBranches.length > 0;
  const bd = branchData as any;
  const us = user?.school as any;
  const ab = (allBranches as any[]) || [];
  const firstBranch = ab.find((x: any) => x.logoPath || x.logo_path || x.logoUrl);
  const schoolLogo = bd?.logoPath || 
                     bd?.logo_path || 
                     bd?.logoUrl || 
                     us?.logoPath || 
                     us?.logo_path || 
                     us?.logoUrl || 
                     us?.logo || 
                     firstBranch?.logoPath || 
                     firstBranch?.logo_path || 
                     firstBranch?.logoUrl || 
                     null;

  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: schoolLogo,
    level: isGeneralAdmin ? "Administration Générale" : (branchData?.instType || user?.educationalLevel || "Gestion Scolaire")
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 dark:bg-[#08090e] gradient-bg font-sans relative transition-colors duration-300" dir="ltr">
      <React.Suspense fallback={null}>
        <NavigationProgressProvider>
          <DashboardLoadingBar />
          <SyncStatus user={user} />
          <InactivityLockOverlay user={user} branding={branding} />

          <div className="flex h-full max-h-full gap-4 p-4 overflow-hidden">
            <DashboardSidebar 
              user={user} 
              branch={branchData} 
              branding={branding}
              allBranches={allBranches}
              unreadNotificationsCount={unreadCount} 
            />
            <main className="flex-1 min-w-0 overflow-y-auto h-full rounded-[32px] bg-slate-50/60 dark:bg-[#0c0e14]/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
              <div className="min-h-full bg-transparent">
                {children}
              </div>
            </main>
          </div>
        </NavigationProgressProvider>
      </React.Suspense>
    </div>
  );
}
