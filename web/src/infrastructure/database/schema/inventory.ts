import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { employees } from "./hr";
import { schools } from "./auth";

export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("Package"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("inventory_categories_school_id_idx").on(table.schoolId),
}));

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }), // Barcode / Code-barres
  categoryId: integer("category_id").references(() => inventoryCategories.id, { onDelete: "set null" }),
  quantity: integer("quantity").default(0).notNull(),
  minThreshold: integer("min_threshold").default(5).notNull(), // Seuil d'alerte critique
  unitPrice: doublePrecision("unit_price").default(0), // CFA
  condition: varchar("condition", { length: 50 }).default("Neuf"), // 'Neuf', 'Bon état', 'Moyen', 'Endommagé', 'En réparation'
  location: varchar("location", { length: 255 }).default("Magasin Principal"), // 'Magasin Principal', 'Labo SVT', 'Salle Info', etc.
  brandModel: varchar("brand_model", { length: 150 }), // e.g. "Dell Latitude 5420", "Epson EB-X06"
  serialNumber: varchar("serial_number", { length: 100 }),
  isAsset: boolean("is_asset").default(false), // Immobilisation / Bien durable
  assignedRoom: varchar("assigned_room", { length: 100 }), // e.g. "Salle 102", "Amphithéâtre"
  supplierName: varchar("supplier_name", { length: 150 }),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("inventory_items_school_id_idx").on(table.schoolId),
  categoryIdx: index("inventory_items_category_idx").on(table.categoryId),
  skuIdx: index("inventory_items_sku_idx").on(table.sku),
}));

export const inventoryStockMovements = pgTable("inventory_stock_movements", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => inventoryItems.id, { onDelete: "cascade" }).notNull(),
  movementType: varchar("movement_type", { length: 50 }).notNull(), // 'Entrée (Achat)', 'Sortie (Consommation)', 'Retour en stock', 'Rebut / Déclassement', 'Ajustement inventaire'
  quantity: integer("quantity").notNull(), // positive integer
  unitCost: doublePrecision("unit_cost").default(0),
  referenceDoc: varchar("reference_doc", { length: 100 }), // e.g. "BL-8492", "Facture 2026-03"
  performedBy: varchar("performed_by", { length: 150 }).default("Gestionnaire de Stock"),
  notes: text("notes"),
  movementDate: timestamp("movement_date").defaultNow().notNull(),
}, (table) => ({
  schoolIdIdx: index("inventory_stock_movements_school_id_idx").on(table.schoolId),
  itemIdIdx: index("inventory_stock_movements_item_id_idx").on(table.itemId),
  dateIdx: index("inventory_stock_movements_date_idx").on(table.movementDate),
}));

export const inventoryAssignments = pgTable("inventory_assignments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => inventoryItems.id, { onDelete: "cascade" }).notNull(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  assignedQty: integer("assigned_qty").default(1).notNull(),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  expectedReturnDate: timestamp("expected_return_date"),
  actualReturnDate: timestamp("actual_return_date"),
  conditionAtAssignment: varchar("condition_at_assignment", { length: 50 }).default("Bon état"),
  conditionAtReturn: varchar("condition_at_return", { length: 50 }),
  status: varchar("status", { length: 50 }).default("En possession"), // 'En possession', 'Retourné complet', 'Retourné endommagé', 'Perdu / Déclaré manquant'
  notes: text("notes"),
  assignedBy: varchar("assigned_by", { length: 150 }).default("Intendant"),
}, (table) => ({
  schoolIdIdx: index("inventory_assignments_school_id_idx").on(table.schoolId),
  itemIdIdx: index("inventory_assignments_item_id_idx").on(table.itemId),
  employeeIdIdx: index("inventory_assignments_employee_id_idx").on(table.employeeId),
}));

export const inventorySuppliers = pgTable("inventory_suppliers", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  category: varchar("category", { length: 100 }).default("Fournitures"), // 'Fournitures', 'Informatique & High-Tech', 'Mobilier', 'Sciences & Laboratoire', 'Uniformes'
  taxId: varchar("tax_id", { length: 50 }), // NIF / RCCM
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("inventory_suppliers_school_id_idx").on(table.schoolId),
}));

export const inventoryPurchaseOrders = pgTable("inventory_purchase_orders", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(), // e.g. "BC-2026-001"
  supplierId: integer("supplier_id").references(() => inventorySuppliers.id, { onDelete: "set null" }),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  totalAmount: doublePrecision("total_amount").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("Commandé"), // 'Brouillon', 'Commandé', 'Reçu partiellement', 'Reçu totalement', 'Annulé'
  itemsJson: text("items_json"), // Array of { name, quantity, unitPrice, total }
  approvedBy: varchar("approved_by", { length: 150 }).default("Direction"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("inventory_purchase_orders_school_id_idx").on(table.schoolId),
  supplierIdIdx: index("inventory_purchase_orders_supplier_id_idx").on(table.supplierId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const inventoryCategoriesRelations = relations(inventoryCategories, ({ many }) => ({
  items: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  category: one(inventoryCategories, {
    fields: [inventoryItems.categoryId],
    references: [inventoryCategories.id],
  }),
  assignments: many(inventoryAssignments),
  movements: many(inventoryStockMovements),
}));

export const inventoryStockMovementsRelations = relations(inventoryStockMovements, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryStockMovements.itemId],
    references: [inventoryItems.id],
  }),
}));

export const inventoryAssignmentsRelations = relations(inventoryAssignments, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryAssignments.itemId],
    references: [inventoryItems.id],
  }),
  employee: one(employees, {
    fields: [inventoryAssignments.employeeId],
    references: [employees.id],
  }),
}));

export const inventorySuppliersRelations = relations(inventorySuppliers, ({ many }) => ({
  purchaseOrders: many(inventoryPurchaseOrders),
}));

export const inventoryPurchaseOrdersRelations = relations(inventoryPurchaseOrders, ({ one }) => ({
  supplier: one(inventorySuppliers, {
    fields: [inventoryPurchaseOrders.supplierId],
    references: [inventorySuppliers.id],
  }),
}));
