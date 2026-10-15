export const dynamic = "force-dynamic";

import AlumniClient from "@/domains/alumni/components/AlumniClient";
import {
  getAlumni,
  getCertificates,
  getAlumniKPIs,
  getAlumniStats,
} from "@/domains/alumni/actions/alumni.actions";

export const metadata = {
  title: "Portail des Diplômés | Edut",
  description: "Gestion des anciens élèves, émission d'attestations numériques et vérification anti-fraude par QR Code",
};

export default async function AlumniPage() {
  let alumni: any[] = [];
  let certs: any[] = [];
  let kpis: any = { totalAlumni: 0, certificatesIssued: 0, graduatedThisYear: 0, withContact: 0 };
  let stats: any = { byYear: [], byLevel: [], byMention: [] };

  try {
    const [aRes, cRes, kRes, sRes] = await Promise.all([
      getAlumni().catch(() => null),
      getCertificates().catch(() => null),
      getAlumniKPIs().catch(() => null),
      getAlumniStats().catch(() => null),
    ]);

    if (aRes) alumni = (aRes as any)?.data ?? [];
    if (cRes) certs = (cRes as any)?.data ?? [];
    if (kRes) kpis = (kRes as any)?.data ?? kpis;
    if (sRes) stats = (sRes as any)?.data ?? stats;
  } catch (err) {
    console.error("Alumni page SSR error:", err);
  }

  return (
    <AlumniClient
      initialAlumni={alumni}
      initialCerts={certs}
      initialKpis={kpis}
      initialStats={stats}
    />
  );
}
