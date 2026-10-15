export const dynamic = "force-dynamic";

import { getPayrollDashboard, getSalaryRecords, getPayrollRules } from "@/domains/hr/actions/payroll.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import PayrollClient from "./payroll-client";

export default async function PayrollPage() {
  const [dashRes, recordsRes, rulesRes, empRes, currentUser, headerConfigRes] = await Promise.all([
    getPayrollDashboard(),
    getSalaryRecords(),
    getPayrollRules(),
    getEmployees(),
    getCurrentUser(),
    getDocumentHeaderConfig().catch(() => null),
  ]);

  const dashboard  = (dashRes as any).data?.data  || (dashRes as any).data  || {};
  const records    = (recordsRes as any).data?.data || (recordsRes as any).data || [];
  const rules      = (rulesRes as any).data?.data   || (rulesRes as any).data  || { leaveAllowPerMonth: 1, latePenalty: 0.5 };
  const employees  = ((empRes as any).data?.data    || (empRes as any).data    || []) as any[];
  const headerConfig = (headerConfigRes as any)?.data?.data || (headerConfigRes as any)?.data || null;

  const canEdit   = !!((currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit));
  const canDelete = !!((currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete));

  return (
    <PayrollClient
      dashboard={dashboard}
      initialRecords={records}
      rules={rules}
      employees={employees}
      headerConfig={headerConfig}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
