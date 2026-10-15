import { getOnlineTransactions } from "@/domains/finance/actions/payment_gateway.actions";
import { getSyscohadaAccounts, getSyscohadaEntries, getSyscohadaStatements, getCogesFinancialReport } from "@/domains/finance/actions/syscohada.actions";
import { SyscohadaDashboard } from "./components/SyscohadaDashboard";

export const metadata = {
  title: "Paiements Mobile Money & Comptabilité SYSCOHADA - Edut",
  description: "Passerelle de paiement en ligne Mobile Money (Orange Money, Moov, Wave), Plan comptable SYSCOHADA et Rapport Financier du COGES.",
};

export default async function SyscohadaPage() {
  const [txnRes, accRes, entryRes, statementRes, cogesRes] = await Promise.all([
    getOnlineTransactions(),
    getSyscohadaAccounts(),
    getSyscohadaEntries(),
    getSyscohadaStatements(),
    getCogesFinancialReport(),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SyscohadaDashboard
        initialTransactions={txnRes.data || []}
        initialAccounts={accRes.data || []}
        initialEntries={entryRes.data || []}
        initialStatements={statementRes.data || { totalActif: 0, totalPassif: 0, resultatNet: 0 }}
        initialCogesReport={cogesRes.data || { totalCotisations: 0, totalDepenses: 0, soldeDisponible: 0 }}
      />
    </div>
  );
}
