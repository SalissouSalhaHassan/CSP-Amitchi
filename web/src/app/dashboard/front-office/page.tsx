export const dynamic = "force-dynamic";

import {
  getAllVisitors,
  getGatePasses,
  getMailRegistry,
  getComplaints,
  getFrontOfficeKPIs,
} from "@/domains/front-office/actions/front-office.actions";
import FrontOfficeClient from "@/domains/front-office/components/FrontOfficeClient";

export default async function FrontOfficePage() {
  let visitors: any[] = [];
  let gatePasses: any[] = [];
  let mail: any[] = [];
  let complaints: any[] = [];
  let kpis: any = { visitorsToday: 0, activeGatePasses: 0, pendingMail: 0, openComplaints: 0 };

  try {
    const [vRes, gRes, mRes, cRes, kRes] = await Promise.all([
      getAllVisitors().catch(() => null),
      getGatePasses().catch(() => null),
      getMailRegistry().catch(() => null),
      getComplaints().catch(() => null),
      getFrontOfficeKPIs().catch(() => null),
    ]);

    if (vRes) visitors = (vRes as any)?.data ?? [];
    if (gRes) gatePasses = (gRes as any)?.data ?? [];
    if (mRes) mail = (mRes as any)?.data ?? [];
    if (cRes) complaints = (cRes as any)?.data ?? [];
    if (kRes) kpis = (kRes as any)?.data ?? kpis;
  } catch (err) {
    console.error("Front Office page SSR error:", err);
  }

  return (
    <FrontOfficeClient
      initialVisitors={visitors}
      initialGatePasses={gatePasses}
      initialMail={mail}
      initialComplaints={complaints}
      initialKpis={kpis}
    />
  );
}
