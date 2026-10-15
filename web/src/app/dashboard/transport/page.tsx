export const dynamic = "force-dynamic";

import {
  getTransportDashboardStats,
  getTransportRoutes,
  getTransportSubscriptions,
  getLiveTripsAction,
  getTransportBoardingLogs,
} from "@/domains/transport/actions/transport.actions";
import TransportClient from "./TransportClient";

export default async function TransportPage() {
  const [statsRes, routesRes, subsRes, tripsRes, logsRes] = await Promise.all([
    getTransportDashboardStats(),
    getTransportRoutes(),
    getTransportSubscriptions(),
    getLiveTripsAction(),
    getTransportBoardingLogs({ limit: 40 }),
  ]);

  const stats = (statsRes as any)?.data || {
    totalRoutes: 0,
    activeSubscriptions: 0,
    tripsToday: 0,
    boardingsToday: 0,
  };

  const routes = (routesRes as any)?.data?.data || (routesRes as any)?.data || [];
  const subscriptions = (subsRes as any)?.data?.data || (subsRes as any)?.data || [];
  const trips = (tripsRes as any)?.data?.data || (tripsRes as any)?.data || [];
  const logs = (logsRes as any)?.data?.data || (logsRes as any)?.data || [];

  return (
    <TransportClient
      initialStats={stats}
      initialRoutes={routes}
      initialSubscriptions={subscriptions}
      initialTrips={trips}
      initialLogs={logs}
    />
  );
}
