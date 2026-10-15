export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc } from "drizzle-orm";
import { getOnlineTransactionsData } from "@/domains/finance/actions/payment_gateway.actions";
import { MobileMoneyClient } from "./mobile-money-client";

export default async function MobileMoneyPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  // 1. Fetch Mobile Money dashboard data
  const dashRes = await getOnlineTransactionsData();
  const initialData = dashRes.success && dashRes.data ? dashRes.data : {
    transactions: [],
    metrics: {
      totalAmount: 0,
      successCount: 0,
      pendingCount: 0,
      airtelVolume: 0,
      moovVolume: 0,
      orangeVolume: 0,
      waveVolume: 0,
      cardVolume: 0,
    },
  };

  // 2. Fetch students list for checkout dropdown
  const studentsListRaw = await (readDb || db)
    .select({
      id: students.id,
      nom: students.nomEtudiant,
      matricule: students.numAdmission,
      classe: students.classe,
    })
    .from(students)
    .where(schoolId ? eq(students.schoolId, schoolId) : undefined)
    .orderBy(students.nomEtudiant)
    .limit(300);

  const studentsList = studentsListRaw.map((s) => ({
    id: s.id,
    nom: s.nom || "Étudiant",
    matricule: s.matricule || `MAT-${s.id}`,
    classe: s.classe || "Licence",
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <MobileMoneyClient
        initialData={initialData}
        studentsList={studentsList}
      />
    </div>
  );
}
