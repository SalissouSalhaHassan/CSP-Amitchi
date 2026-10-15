export const dynamic = "force-dynamic";

import React from "react";
import CogesUI from "./coges-ui";
import { getCogesPayments, getCogesStudentLedger } from "@/domains/finance/actions/coges.actions";

export const metadata = {
  title: "Paiement COGES | École Plus",
};

export default async function CogesPage() {
  const [paymentsResult, ledgerResult] = await Promise.all([
    getCogesPayments(),
    getCogesStudentLedger(),
  ]);
  const initialPayments = (paymentsResult?.success ? paymentsResult.data : []) as any[];
  const initialLedger = (ledgerResult?.success ? ledgerResult.data : []) as any[];

  return (
    <div className="flex-1 h-full overflow-hidden bg-slate-50 dark:bg-[#0A0C10]">
      <CogesUI initialPayments={initialPayments} initialLedger={initialLedger} />
    </div>
  );
}
