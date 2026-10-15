export const dynamic = "force-dynamic";

import { getCanteenItems, getCanteenInvoices, getActiveSchoolProfile } from "@/domains/canteen/actions/canteen.actions";
import CanteenPOS from "@/domains/canteen/components/CanteenPOS";

export default async function POSPage() {
  let items: any[] = [];
  let invoices: any[] = [];
  let schoolName: string = "";

  try {
    const itemsRes = await getCanteenItems().catch(() => null);
    if (itemsRes) {
      items = (itemsRes as any)?.data?.data || (itemsRes as any)?.data || [];
    }

    const invoicesRes = await getCanteenInvoices().catch(() => null);
    if (invoicesRes) {
      invoices = (invoicesRes as any)?.data?.data || (invoicesRes as any)?.data || [];
    }

    const schoolRes = await getActiveSchoolProfile().catch(() => null);
    if (schoolRes) {
      schoolName = (schoolRes as any)?.data?.schoolName || "";
    }
  } catch (err) {
    console.error("POS Server Component load info:", err);
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950">
      <CanteenPOS items={items} invoices={invoices} schoolName={schoolName} />
    </div>
  );
}
