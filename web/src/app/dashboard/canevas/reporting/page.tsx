export const dynamic = "force-dynamic";

import { getSessions, getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import ReportingClient from "./ReportingClient";

export const metadata = {
  title: "Centre de Reporting | Canevas | Edut",
  description: "Centre de reporting des canevas scolaires",
};

export default async function ReportingCentrePage() {
  const [sessionsRes, headerConfigRes, canevasRefRes, levelsRes] = await Promise.all([
    getSessions().catch(() => []),
    getDocumentHeaderConfig().catch(() => null),
    getCanevasReferenceLists().catch(() => ({ data: { commune: [], cycle: [] } })),
    getEducationalLevels(true).catch(() => ({ data: [] })),
  ]);

  const sessions = (sessionsRes as any)?.data || sessionsRes || [];
  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));
  
  const canevasReferences = (canevasRefRes as any)?.data || (canevasRefRes as any) || { commune: [], cycle: [] };
  const educationalLevels = (levelsRes as any)?.data || (levelsRes as any) || [];

  return (
    <ReportingClient
      sessions={sessions}
      activeSessionName={activeSessionName}
      headerConfig={(headerConfigRes as any)?.data || null}
      initialCanevasReferences={canevasReferences}
      educationalLevels={educationalLevels}
    />
  );
}
