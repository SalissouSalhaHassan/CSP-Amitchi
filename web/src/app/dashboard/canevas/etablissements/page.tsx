export const dynamic = "force-dynamic";

import { getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";
import EtablissementsClient from "./etablissements-client";

export default async function EtablissementsPage() {
  const [canevasRefRes, levelsRes] = await Promise.all([
    getCanevasReferenceLists().catch(() => ({ data: { type: [], cycle: [], commune: [] } })),
    getEducationalLevels(true).catch(() => ({ data: [] })),
  ]);

  const canevasReferences = (canevasRefRes as any)?.data || (canevasRefRes as any) || { type: [], cycle: [], commune: [] };
  const educationalLevels = (levelsRes as any)?.data || (levelsRes as any) || [];

  return (
    <EtablissementsClient
      initialCanevasReferences={canevasReferences}
      educationalLevels={educationalLevels}
    />
  );
}
