"use server";

import { db } from "@/infrastructure/database";
import {
  inventoryItems,
  inventoryCategories,
  inventoryAssignments,
  inventoryStockMovements,
  inventorySuppliers,
  inventoryPurchaseOrders,
} from "@/infrastructure/database/schema/inventory";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, desc, and, sql, lt, lte, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

// ─── Utility: Ensure extended columns ──────────────────────────────────────

let isInventorySchemaInitialized = false;
let inventoryInitPromise: Promise<void> | null = null;

async function ensureInventoryExtensions() {
  if (isInventorySchemaInitialized) return;
  if (inventoryInitPromise) return inventoryInitPromise;

  inventoryInitPromise = (async () => {
    try {
      const alters = [
        `ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS school_id INTEGER`,
        `ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS description TEXT`,
        `ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Package'`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_threshold INTEGER DEFAULT 5`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS brand_model VARCHAR(150)`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100)`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_asset BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS assigned_room VARCHAR(100)`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150)`,
        `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS notes TEXT`,
        `CREATE TABLE IF NOT EXISTS inventory_stock_movements (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
          movement_type VARCHAR(50) NOT NULL,
          quantity INTEGER NOT NULL,
          unit_cost DOUBLE PRECISION DEFAULT 0,
          reference_doc VARCHAR(100),
          performed_by VARCHAR(150) DEFAULT 'Gestionnaire de Stock',
          notes TEXT,
          movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_suppliers (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          name VARCHAR(150) NOT NULL,
          contact_person VARCHAR(100),
          phone VARCHAR(50),
          email VARCHAR(100),
          address TEXT,
          category VARCHAR(100) DEFAULT 'Fournitures',
          tax_id VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          order_number VARCHAR(100) NOT NULL UNIQUE,
          supplier_id INTEGER REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          expected_delivery_date TIMESTAMP,
          total_amount DOUBLE PRECISION DEFAULT 0 NOT NULL,
          status VARCHAR(50) DEFAULT 'Commandé',
          items_json TEXT,
          approved_by VARCHAR(150) DEFAULT 'Direction',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS actual_return_date TIMESTAMP`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS condition_at_assignment VARCHAR(50) DEFAULT 'Bon état'`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS condition_at_return VARCHAR(50)`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS notes TEXT`,
        `ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(150) DEFAULT 'Intendant'`,
      ];
      for (const stmt of alters) {
        await db.execute(sql.raw(stmt)).catch(() => {});
      }
      isInventorySchemaInitialized = true;
    } catch (e) {
      console.warn("Inventory schema check warning:", e);
    } finally {
      inventoryInitPromise = null;
    }
  })();

  return inventoryInitPromise;
}

// ─── KPIs ───────────────────────────────────────────────────────────────────

export async function getInventoryKPIs() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const [totalItemsRes, lowStockRes, assignedRes, totalValueRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM inventory_items WHERE school_id = ${schoolId}`).catch(() => [{ count: 0 }]),
      db.execute(sql`SELECT COUNT(*) as count FROM inventory_items WHERE school_id = ${schoolId} AND quantity <= min_threshold`).catch(() => [{ count: 0 }]),
      db.execute(sql`SELECT COUNT(*) as count FROM inventory_assignments WHERE school_id = ${schoolId} AND status = 'En possession'`).catch(() => [{ count: 0 }]),
      db.execute(sql`SELECT COALESCE(SUM(quantity * unit_price), 0) as value FROM inventory_items WHERE school_id = ${schoolId}`).catch(() => [{ value: 0 }]),
    ]);

    return {
      totalItems: Number((totalItemsRes as any[])[0]?.count ?? 0),
      lowStockCount: Number((lowStockRes as any[])[0]?.count ?? 0),
      activeAssignments: Number((assignedRes as any[])[0]?.count ?? 0),
      totalStockValue: Number((totalValueRes as any[])[0]?.value ?? 0),
    };
  });
}

// ─── Items ──────────────────────────────────────────────────────────────────

export async function getInventoryItems(search?: string, categoryId?: number) {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT i.*, c.name as category_name, c.icon as category_icon
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE i.school_id = ${schoolId}
        ${search ? sql`AND (LOWER(i.name) LIKE ${'%' + search.toLowerCase() + '%'} OR LOWER(i.sku) LIKE ${'%' + search.toLowerCase() + '%'})` : sql``}
        ${categoryId ? sql`AND i.category_id = ${categoryId}` : sql``}
      ORDER BY i.created_at DESC
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function saveInventoryItem(data: {
  id?: number;
  name: string;
  sku?: string;
  categoryId?: number;
  quantity: number;
  minThreshold: number;
  unitPrice: number;
  condition: string;
  location: string;
  brandModel?: string;
  serialNumber?: string;
  isAsset?: boolean;
  assignedRoom?: string;
  supplierName?: string;
  notes?: string;
}) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`
        UPDATE inventory_items SET
          name = ${data.name},
          sku = ${data.sku ?? null},
          category_id = ${data.categoryId ?? null},
          quantity = ${data.quantity},
          min_threshold = ${data.minThreshold},
          unit_price = ${data.unitPrice},
          condition = ${data.condition},
          location = ${data.location},
          brand_model = ${data.brandModel ?? null},
          serial_number = ${data.serialNumber ?? null},
          is_asset = ${data.isAsset ?? false},
          assigned_room = ${data.assignedRoom ?? null},
          supplier_name = ${data.supplierName ?? null},
          notes = ${data.notes ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO inventory_items
          (school_id, name, sku, category_id, quantity, min_threshold, unit_price, condition, location, brand_model, serial_number, is_asset, assigned_room, supplier_name, notes)
        VALUES
          (${schoolId}, ${data.name}, ${data.sku ?? null}, ${data.categoryId ?? null}, ${data.quantity}, ${data.minThreshold}, ${data.unitPrice}, ${data.condition}, ${data.location}, ${data.brandModel ?? null}, ${data.serialNumber ?? null}, ${data.isAsset ?? false}, ${data.assignedRoom ?? null}, ${data.supplierName ?? null}, ${data.notes ?? null})
      `);
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function deleteInventoryItem(id: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM inventory_items WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Stock Movements ────────────────────────────────────────────────────────

export async function getStockMovements(itemId?: number) {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT m.*, i.name as item_name, i.sku as item_sku
      FROM inventory_stock_movements m
      LEFT JOIN inventory_items i ON m.item_id = i.id
      WHERE m.school_id = ${schoolId}
        ${itemId ? sql`AND m.item_id = ${itemId}` : sql``}
      ORDER BY m.movement_date DESC
      LIMIT 200
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function recordStockMovement(data: {
  itemId: number;
  movementType: string; // 'Entrée (Achat)', 'Sortie (Consommation)', 'Retour en stock', 'Rebut / Déclassement', 'Ajustement inventaire'
  quantity: number;
  unitCost?: number;
  referenceDoc?: string;
  performedBy?: string;
  notes?: string;
}) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    // Insert movement
    await db.execute(sql`
      INSERT INTO inventory_stock_movements
        (school_id, item_id, movement_type, quantity, unit_cost, reference_doc, performed_by, notes)
      VALUES
        (${schoolId}, ${data.itemId}, ${data.movementType}, ${data.quantity}, ${data.unitCost ?? 0}, ${data.referenceDoc ?? null}, ${data.performedBy ?? 'Gestionnaire de Stock'}, ${data.notes ?? null})
    `);

    // Adjust item quantity
    const isEntry = ['Entrée (Achat)', 'Retour en stock'].includes(data.movementType);
    const isExit = ['Sortie (Consommation)', 'Rebut / Déclassement'].includes(data.movementType);
    const isAdjust = data.movementType === 'Ajustement inventaire';

    if (isEntry) {
      await db.execute(sql`UPDATE inventory_items SET quantity = quantity + ${data.quantity} WHERE id = ${data.itemId} AND school_id = ${schoolId}`);
    } else if (isExit) {
      await db.execute(sql`UPDATE inventory_items SET quantity = GREATEST(0, quantity - ${data.quantity}) WHERE id = ${data.itemId} AND school_id = ${schoolId}`);
    } else if (isAdjust) {
      await db.execute(sql`UPDATE inventory_items SET quantity = ${data.quantity} WHERE id = ${data.itemId} AND school_id = ${schoolId}`);
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export async function getInventoryAssignments() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT a.*, i.name as item_name, i.sku as item_sku, i.condition as item_condition,
             e.nom_complet as employee_name, e.poste as employee_post
      FROM inventory_assignments a
      LEFT JOIN inventory_items i ON a.item_id = i.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.school_id = ${schoolId}
      ORDER BY a.assigned_date DESC
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function assignItem(data: {
  itemId: number;
  employeeId: number;
  assignedQty: number;
  conditionAtAssignment?: string;
  expectedReturnDate?: string;
  notes?: string;
  assignedBy?: string;
}) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    // Check stock
    const stockRes = await db.execute(sql`SELECT quantity FROM inventory_items WHERE id = ${data.itemId} AND school_id = ${schoolId}`).catch(() => []);
    const stock = Number((stockRes as any[])[0]?.quantity ?? 0);
    if (stock < data.assignedQty) {
      return { success: false, error: `Stock insuffisant. Disponible: ${stock}` };
    }

    await db.execute(sql`
      INSERT INTO inventory_assignments
        (school_id, item_id, employee_id, assigned_qty, condition_at_assignment, expected_return_date, notes, assigned_by)
      VALUES
        (${schoolId}, ${data.itemId}, ${data.employeeId}, ${data.assignedQty},
         ${data.conditionAtAssignment ?? 'Bon état'},
         ${data.expectedReturnDate ? new Date(data.expectedReturnDate) : null},
         ${data.notes ?? null}, ${data.assignedBy ?? 'Intendant'})
    `);

    // Deduct stock
    await db.execute(sql`UPDATE inventory_items SET quantity = quantity - ${data.assignedQty} WHERE id = ${data.itemId} AND school_id = ${schoolId}`);

    // Record movement
    await db.execute(sql`
      INSERT INTO inventory_stock_movements (school_id, item_id, movement_type, quantity, performed_by, notes)
      VALUES (${schoolId}, ${data.itemId}, 'Sortie (Affectation)', ${data.assignedQty}, ${data.assignedBy ?? 'Intendant'}, 'Affectation employé')
    `).catch(() => {});

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function returnItem(assignmentId: number, conditionAtReturn: string) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    const assignRes = await db.execute(sql`
      SELECT * FROM inventory_assignments WHERE id = ${assignmentId} AND school_id = ${schoolId}
    `).catch(() => []);
    const assignment = (assignRes as any[])[0];
    if (!assignment) return { success: false, error: "Affectation introuvable" };

    await db.execute(sql`
      UPDATE inventory_assignments SET
        status = 'Retourné complet',
        actual_return_date = NOW(),
        condition_at_return = ${conditionAtReturn}
      WHERE id = ${assignmentId}
    `);

    // Restore stock
    await db.execute(sql`UPDATE inventory_items SET quantity = quantity + ${assignment.assigned_qty} WHERE id = ${assignment.item_id} AND school_id = ${schoolId}`);

    await db.execute(sql`
      INSERT INTO inventory_stock_movements (school_id, item_id, movement_type, quantity, performed_by, notes)
      VALUES (${schoolId}, ${assignment.item_id}, 'Retour en stock', ${assignment.assigned_qty}, 'Intendant', 'Retour par employé')
    `).catch(() => {});

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getInventoryCategories() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT c.*, COUNT(i.id) as item_count
      FROM inventory_categories c
      LEFT JOIN inventory_items i ON c.id = i.category_id AND i.school_id = ${schoolId}
      WHERE c.school_id = ${schoolId} OR c.school_id IS NULL
      GROUP BY c.id
      ORDER BY c.name ASC
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function saveCategory(data: { id?: number; name: string; description?: string; icon?: string }) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`UPDATE inventory_categories SET name = ${data.name}, description = ${data.description ?? null}, icon = ${data.icon ?? 'Package'} WHERE id = ${data.id}`);
    } else {
      await db.execute(sql`INSERT INTO inventory_categories (school_id, name, description, icon) VALUES (${schoolId}, ${data.name}, ${data.description ?? null}, ${data.icon ?? 'Package'})`);
    }
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Suppliers ──────────────────────────────────────────────────────────────

export async function getSuppliers() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT s.*, COUNT(po.id) as order_count, COALESCE(SUM(po.total_amount), 0) as total_ordered
      FROM inventory_suppliers s
      LEFT JOIN inventory_purchase_orders po ON s.id = po.supplier_id
      WHERE s.school_id = ${schoolId}
      GROUP BY s.id
      ORDER BY s.name ASC
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function saveSupplier(data: {
  id?: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  taxId?: string;
}) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`
        UPDATE inventory_suppliers SET
          name = ${data.name}, contact_person = ${data.contactPerson ?? null},
          phone = ${data.phone ?? null}, email = ${data.email ?? null},
          address = ${data.address ?? null}, category = ${data.category ?? 'Fournitures'},
          tax_id = ${data.taxId ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO inventory_suppliers (school_id, name, contact_person, phone, email, address, category, tax_id)
        VALUES (${schoolId}, ${data.name}, ${data.contactPerson ?? null}, ${data.phone ?? null},
                ${data.email ?? null}, ${data.address ?? null}, ${data.category ?? 'Fournitures'}, ${data.taxId ?? null})
      `);
    }
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function deleteSupplier(id: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM inventory_suppliers WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

export async function getPurchaseOrders() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    const rows = await db.execute(sql`
      SELECT po.*, s.name as supplier_name, s.phone as supplier_phone
      FROM inventory_purchase_orders po
      LEFT JOIN inventory_suppliers s ON po.supplier_id = s.id
      WHERE po.school_id = ${schoolId}
      ORDER BY po.order_date DESC
    `).catch(() => [] as any[]);

    return { data: rows };
  });
}

export async function savePurchaseOrder(data: {
  id?: number;
  supplierId?: number;
  expectedDeliveryDate?: string;
  totalAmount: number;
  status: string;
  itemsJson: string;
  approvedBy?: string;
  notes?: string;
}) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`
        UPDATE inventory_purchase_orders SET
          supplier_id = ${data.supplierId ?? null},
          expected_delivery_date = ${data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null},
          total_amount = ${data.totalAmount},
          status = ${data.status},
          items_json = ${data.itemsJson},
          approved_by = ${data.approvedBy ?? 'Direction'},
          notes = ${data.notes ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      // Generate order number
      const year = new Date().getFullYear();
      const countRes = await db.execute(sql`SELECT COUNT(*) as c FROM inventory_purchase_orders WHERE school_id = ${schoolId}`).catch(() => [{ c: 0 }]);
      const num = String(Number((countRes as any[])[0]?.c ?? 0) + 1).padStart(3, "0");
      const orderNumber = `BC-${year}-${num}`;

      await db.execute(sql`
        INSERT INTO inventory_purchase_orders
          (school_id, order_number, supplier_id, expected_delivery_date, total_amount, status, items_json, approved_by, notes)
        VALUES
          (${schoolId}, ${orderNumber}, ${data.supplierId ?? null},
           ${data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null},
           ${data.totalAmount}, ${data.status}, ${data.itemsJson},
           ${data.approvedBy ?? 'Direction'}, ${data.notes ?? null})
      `);
    }
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function updatePurchaseOrderStatus(id: number, status: string) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`UPDATE inventory_purchase_orders SET status = ${status} WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

// ─── Employees list for assignment ──────────────────────────────────────────

export async function getInventoryEmployees() {
  return protectedDbAction("Inventory", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT id, nom_complet, poste, telephone FROM employees WHERE school_id = ${schoolId} ORDER BY nom_complet ASC
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

// ─── Low stock items ─────────────────────────────────────────────────────────

export async function getLowStockItems() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryExtensions();
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE i.school_id = ${schoolId} AND i.quantity <= i.min_threshold
      ORDER BY i.quantity ASC
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}
