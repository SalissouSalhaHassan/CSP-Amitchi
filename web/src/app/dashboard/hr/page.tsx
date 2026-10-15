export const dynamic = "force-dynamic";

import { getEmployees, deleteEmployee } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import HrClient from "./HrClient";

export default async function HRPage() {
  const [result, currentUser, headerConfigRes] = await Promise.all([
    getEmployees(),
    getCurrentUser(),
    getDocumentHeaderConfig().catch(() => null),
  ]);

  const allEmployees = ((result as any)?.data?.data || (result as any)?.data || []) as any[];
  const headerConfig = (headerConfigRes as any)?.data?.data || (headerConfigRes as any)?.data || null;

  const canEdit = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit)
  );

  const canDelete = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete)
  );

  return (
    <HrClient
      allEmployees={allEmployees}
      headerConfig={headerConfig}
      canEdit={canEdit}
      canDelete={canDelete}
      deleteEmployeeAction={deleteEmployee}
    />
  );
}
