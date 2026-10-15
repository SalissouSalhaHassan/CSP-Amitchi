export const dynamic = "force-dynamic";

import {
  getCanteenDashboardStats,
  getWeeklyMenuAction,
  getCanteenSubscriptions,
  getStudentWalletsAction,
  getMealConsumptionLogs,
  getCanteenItems,
} from "@/domains/canteen/actions/canteen.actions";
import CanteenClient from "./CanteenClient";

export default async function CanteenPage() {
  const [statsRes, menuRes, subsRes, walletsRes, logsRes, itemsRes] = await Promise.all([
    getCanteenDashboardStats(),
    getWeeklyMenuAction(),
    getCanteenSubscriptions(),
    getStudentWalletsAction(),
    getMealConsumptionLogs(),
    getCanteenItems(),
  ]);

  const stats = (statsRes as any)?.data || {
    activeSubscriptions: 0,
    mealsServedToday: 0,
    totalWalletBalance: 0,
    lowBalanceCount: 0,
    totalMenuItems: 0,
  };

  const menu = (menuRes as any)?.data?.data || (menuRes as any)?.data || [];
  const weekStartDate = (menuRes as any)?.data?.weekStartDate || new Date().toISOString().slice(0, 10);
  const subscriptions = (subsRes as any)?.data?.data || (subsRes as any)?.data || [];
  const wallets = (walletsRes as any)?.data?.data || (walletsRes as any)?.data || [];
  const logs = (logsRes as any)?.data?.data || (logsRes as any)?.data || [];
  const items = (itemsRes as any)?.data?.data || (itemsRes as any)?.data || [];

  return (
    <CanteenClient
      initialStats={stats}
      initialMenu={menu}
      initialWeekStartDate={weekStartDate}
      initialSubscriptions={subscriptions}
      initialWallets={wallets}
      initialLogs={logs}
      initialItems={items}
    />
  );
}
