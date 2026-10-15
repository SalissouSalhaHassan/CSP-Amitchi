export const dynamic = "force-dynamic";

import {
  getInventoryItems,
  getInventoryAssignments,
  getInventoryEmployees,
  getInventoryCategories,
  getSuppliers,
  getPurchaseOrders,
  getInventoryKPIs,
  getLowStockItems,
  getStockMovements,
} from "@/domains/inventory/actions/inventory.actions";
import InventoryClient from "@/domains/inventory/components/InventoryClient";

function safeDataArray(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

export default async function InventoryPage() {
  let items: any[] = [];
  let assignments: any[] = [];
  let employees: any[] = [];
  let categories: any[] = [];
  let suppliers: any[] = [];
  let purchaseOrders: any[] = [];
  let kpis: any = { totalItems: 0, lowStockCount: 0, activeAssignments: 0, totalStockValue: 0 };
  let lowStockItems: any[] = [];
  let movements: any[] = [];

  try {
    const [itemsRes, assignmentsRes, empRes, catRes, supRes, poRes, kpiRes, lowRes, movRes] = await Promise.all([
      getInventoryItems().catch(() => null),
      getInventoryAssignments().catch(() => null),
      getInventoryEmployees().catch(() => null),
      getInventoryCategories().catch(() => null),
      getSuppliers().catch(() => null),
      getPurchaseOrders().catch(() => null),
      getInventoryKPIs().catch(() => null),
      getLowStockItems().catch(() => null),
      getStockMovements().catch(() => null),
    ]);

    items = safeDataArray(itemsRes);
    assignments = safeDataArray(assignmentsRes);
    employees = safeDataArray(empRes);
    categories = safeDataArray(catRes);
    suppliers = safeDataArray(supRes);
    purchaseOrders = safeDataArray(poRes);
    
    if (kpiRes && typeof kpiRes === "object") {
      const rawKpis = (kpiRes as any)?.data || kpiRes;
      kpis = {
        totalItems: rawKpis?.totalItems ?? items.length,
        lowStockCount: rawKpis?.lowStockCount ?? 0,
        activeAssignments: rawKpis?.activeAssignments ?? assignments.length,
        totalStockValue: rawKpis?.totalStockValue ?? 0,
      };
    }

    lowStockItems = safeDataArray(lowRes);
    movements = safeDataArray(movRes);
  } catch (err) {
    console.error("Inventory page SSR load error:", err);
  }

  return (
    <InventoryClient
      initialItems={items}
      initialAssignments={assignments}
      initialEmployees={employees}
      initialCategories={categories}
      initialSuppliers={suppliers}
      initialPurchaseOrders={purchaseOrders}
      initialKpis={kpis}
      initialLowStockItems={lowStockItems}
      initialMovements={movements}
    />
  );
}
