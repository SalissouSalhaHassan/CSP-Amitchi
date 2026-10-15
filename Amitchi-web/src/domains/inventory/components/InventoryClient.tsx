"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Package, Users, AlertTriangle, TrendingUp, Search, Plus,
  Trash2, ArrowDownToLine, ArrowUpFromLine, RotateCcw, ShoppingCart,
  Building2, ChevronRight, X, Check, RefreshCw, Layers, ClipboardList,
  Cpu, BookOpen, Shirt, FlaskConical, Wrench, Archive, BadgeDollarSign,
  FileText, Eye, Edit2, AlertCircle, Download, Boxes, Barcode,
} from "lucide-react";
import {
  getInventoryItems,
  saveInventoryItem,
  deleteInventoryItem,
  recordStockMovement,
  getInventoryAssignments,
  assignItem,
  returnItem,
  getInventoryCategories,
  saveCategory,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getPurchaseOrders,
  savePurchaseOrder,
  updatePurchaseOrderStatus,
  getInventoryKPIs,
  getLowStockItems,
  getStockMovements,
} from "@/domains/inventory/actions/inventory.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InventoryClientProps {
  initialItems: any[];
  initialAssignments: any[];
  initialEmployees: any[];
  initialCategories: any[];
  initialSuppliers: any[];
  initialPurchaseOrders: any[];
  initialKpis: any;
  initialLowStockItems: any[];
  initialMovements: any[];
}

type Tab = "stock" | "movements" | "assignments" | "suppliers" | "orders";

const CONDITIONS = ["Neuf", "Bon état", "Moyen", "Endommagé", "En réparation"];
const MOVEMENT_TYPES = ["Entrée (Achat)", "Sortie (Consommation)", "Retour en stock", "Rebut / Déclassement", "Ajustement inventaire"];
const LOCATIONS = ["Magasin Principal", "Salle Info", "Laboratoire Sciences", "Bibliothèque", "Salle des Professeurs", "Secrétariat", "Direction", "Internat", "Réfectoire"];
const SUPPLIER_CATEGORIES = ["Fournitures", "Informatique & High-Tech", "Mobilier", "Sciences & Laboratoire", "Uniformes & Tenues", "Matériel Sportif", "Papeterie", "Autres"];
const PO_STATUSES = ["Brouillon", "Commandé", "Reçu partiellement", "Reçu totalement", "Annulé"];
const CAT_ICONS: Record<string, any> = {
  Package, BookOpen, Cpu, Shirt, FlaskConical, Wrench, Archive, Boxes, Users,
};

const CATEGORY_PRESETS = [
  { name: "Livres & Manuels", icon: "BookOpen" },
  { name: "Informatique & High-Tech", icon: "Cpu" },
  { name: "Uniformes & Tenues", icon: "Shirt" },
  { name: "Sciences & Laboratoire", icon: "FlaskConical" },
  { name: "Mobilier & Équipements", icon: "Wrench" },
  { name: "Fournitures de Bureau", icon: "Archive" },
  { name: "Sport & Loisirs", icon: "Boxes" },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmtCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " CFA";
}

function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    "En possession": "bg-blue-100 text-blue-700",
    "Retourné complet": "bg-green-100 text-green-700",
    "Retourné endommagé": "bg-orange-100 text-orange-700",
    "Perdu / Déclaré manquant": "bg-red-100 text-red-700",
    "Commandé": "bg-blue-100 text-blue-700",
    "Reçu partiellement": "bg-yellow-100 text-yellow-700",
    "Reçu totalement": "bg-green-100 text-green-700",
    "Annulé": "bg-red-100 text-red-700",
    "Brouillon": "bg-gray-100 text-gray-600",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

function stockBadge(qty: number, threshold: number) {
  if (qty === 0) return { cls: "bg-red-100 text-red-700 border border-red-200", label: "Rupture" };
  if (qty <= threshold) return { cls: "bg-orange-100 text-orange-700 border border-orange-200", label: "Critique" };
  return { cls: "bg-green-100 text-green-700 border border-green-200", label: "Disponible" };
}

function movementBadge(type: string) {
  if (type.startsWith("Entrée") || type === "Retour en stock") return "bg-green-100 text-green-700";
  if (type.startsWith("Sortie") || type === "Rebut / Déclassement") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InventoryClient({
  initialItems, initialAssignments, initialEmployees,
  initialCategories, initialSuppliers, initialPurchaseOrders,
  initialKpis, initialLowStockItems, initialMovements,
}: InventoryClientProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [assignments, setAssignments] = useState<any[]>(initialAssignments);
  const [employees] = useState<any[]>(initialEmployees);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [suppliers, setSuppliers] = useState<any[]>(initialSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(initialPurchaseOrders);
  const [kpis, setKpis] = useState<any>(initialKpis);
  const [lowStockItems, setLowStockItems] = useState<any[]>(initialLowStockItems);
  const [movements, setMovements] = useState<any[]>(initialMovements);

  const [activeTab, setActiveTab] = useState<Tab>("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Item Modal ──
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "", sku: "", categoryId: 0, quantity: 1, minThreshold: 5, unitPrice: 0,
    condition: "Neuf", location: "Magasin Principal", brandModel: "", serialNumber: "",
    isAsset: false, assignedRoom: "", supplierName: "", notes: "",
  });

  // ── Movement Modal ──
  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ itemId: 0, movementType: "Entrée (Achat)", quantity: 1, unitCost: 0, referenceDoc: "", performedBy: "Gestionnaire de Stock", notes: "" });

  // ── Assignment Modal ──
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ itemId: 0, employeeId: 0, assignedQty: 1, conditionAtAssignment: "Bon état", expectedReturnDate: "", notes: "", assignedBy: "Intendant" });

  // ── Supplier Modal ──
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "", category: "Fournitures", taxId: "" });

  // ── Purchase Order Modal ──
  const [showPOModal, setShowPOModal] = useState(false);
  const [editPO, setEditPO] = useState<any | null>(null);
  const [poLines, setPoLines] = useState<{ name: string; qty: number; unitPrice: number }[]>([{ name: "", qty: 1, unitPrice: 0 }]);
  const [poForm, setPoForm] = useState({ supplierId: 0, expectedDeliveryDate: "", status: "Commandé", approvedBy: "Direction", notes: "" });

  // ── Category Modal ──
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ id: 0, name: "", description: "", icon: "Package" });

  const poTotal = useMemo(() => poLines.reduce((s, l) => s + l.qty * l.unitPrice, 0), [poLines]);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      !q || i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.category_name?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // ── Refresh helpers ──
  async function refreshAll() {
    setLoading(true);
    try {
      const [it, as, ca, su, po, ki, lo, mo] = await Promise.all([
        getInventoryItems(), getInventoryAssignments(), getInventoryCategories(),
        getSuppliers(), getPurchaseOrders(), getInventoryKPIs(), getLowStockItems(), getStockMovements(),
      ]);
      setItems((it as any)?.data ?? []);
      setAssignments((as as any)?.data ?? []);
      setCategories((ca as any)?.data ?? []);
      setSuppliers((su as any)?.data ?? []);
      setPurchaseOrders((po as any)?.data ?? []);
      setKpis((ki as any)?.data ?? kpis);
      setLowStockItems((lo as any)?.data ?? []);
      setMovements((mo as any)?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  // ── Item CRUD ──
  function openItemModal(item?: any) {
    if (item) {
      setEditItem(item);
      setItemForm({
        name: item.name ?? "", sku: item.sku ?? "", categoryId: item.category_id ?? 0,
        quantity: item.quantity ?? 0, minThreshold: item.min_threshold ?? 5,
        unitPrice: item.unit_price ?? 0, condition: item.condition ?? "Neuf",
        location: item.location ?? "Magasin Principal", brandModel: item.brand_model ?? "",
        serialNumber: item.serial_number ?? "", isAsset: item.is_asset ?? false,
        assignedRoom: item.assigned_room ?? "", supplierName: item.supplier_name ?? "", notes: item.notes ?? "",
      });
    } else {
      setEditItem(null);
      setItemForm({ name: "", sku: "", categoryId: 0, quantity: 1, minThreshold: 5, unitPrice: 0, condition: "Neuf", location: "Magasin Principal", brandModel: "", serialNumber: "", isAsset: false, assignedRoom: "", supplierName: "", notes: "" });
    }
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim()) return toast.error("Nom de l'article requis");
    setLoading(true);
    try {
      const res = await saveInventoryItem({ ...itemForm, id: editItem?.id, categoryId: itemForm.categoryId || undefined });
      if ((res as any)?.success) { toast.success("Article sauvegardé !"); setShowItemModal(false); await refreshAll(); }
      else toast.error("Erreur lors de la sauvegarde");
    } finally { setLoading(false); }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm("Supprimer cet article ?")) return;
    setLoading(true);
    try {
      await deleteInventoryItem(id);
      toast.success("Article supprimé");
      await refreshAll();
    } finally { setLoading(false); }
  }

  // ── Movement ──
  function openMovModal(itemId?: number) {
    setMovForm({ itemId: itemId ?? 0, movementType: "Entrée (Achat)", quantity: 1, unitCost: 0, referenceDoc: "", performedBy: "Gestionnaire de Stock", notes: "" });
    setShowMovModal(true);
  }

  async function handleMovement() {
    if (!movForm.itemId) return toast.error("Sélectionnez un article");
    if (movForm.quantity < 1) return toast.error("Quantité invalide");
    setLoading(true);
    try {
      const res = await recordStockMovement({ ...movForm });
      if ((res as any)?.success) { toast.success("Mouvement enregistré !"); setShowMovModal(false); await refreshAll(); }
      else toast.error((res as any)?.error ?? "Erreur");
    } finally { setLoading(false); }
  }

  // ── Assignment ──
  function openAssignModal(itemId?: number) {
    setAssignForm({ itemId: itemId ?? 0, employeeId: 0, assignedQty: 1, conditionAtAssignment: "Bon état", expectedReturnDate: "", notes: "", assignedBy: "Intendant" });
    setShowAssignModal(true);
  }

  async function handleAssign() {
    if (!assignForm.itemId || !assignForm.employeeId) return toast.error("Article et employé requis");
    setLoading(true);
    try {
      const res = await assignItem({ ...assignForm, employeeId: Number(assignForm.employeeId), itemId: Number(assignForm.itemId) });
      if ((res as any)?.success) { toast.success("Affectation créée !"); setShowAssignModal(false); await refreshAll(); }
      else toast.error((res as any)?.error ?? "Erreur");
    } finally { setLoading(false); }
  }

  async function handleReturn(assignmentId: number) {
    const cond = prompt("État du matériel au retour :", "Bon état");
    if (!cond) return;
    setLoading(true);
    try {
      await returnItem(assignmentId, cond);
      toast.success("Retour enregistré !");
      await refreshAll();
    } finally { setLoading(false); }
  }

  // ── Supplier ──
  function openSupplierModal(s?: any) {
    if (s) {
      setEditSupplier(s);
      setSupplierForm({ name: s.name ?? "", contactPerson: s.contact_person ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", category: s.category ?? "Fournitures", taxId: s.tax_id ?? "" });
    } else {
      setEditSupplier(null);
      setSupplierForm({ name: "", contactPerson: "", phone: "", email: "", address: "", category: "Fournitures", taxId: "" });
    }
    setShowSupplierModal(true);
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name.trim()) return toast.error("Nom du fournisseur requis");
    setLoading(true);
    try {
      await saveSupplier({ ...supplierForm, id: editSupplier?.id });
      toast.success("Fournisseur sauvegardé !");
      setShowSupplierModal(false);
      await refreshAll();
    } finally { setLoading(false); }
  }

  async function handleDeleteSupplier(id: number) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    await deleteSupplier(id);
    toast.success("Fournisseur supprimé");
    await refreshAll();
  }

  // ── Purchase Order ──
  function openPOModal(po?: any) {
    if (po) {
      setEditPO(po);
      setPoForm({ supplierId: po.supplier_id ?? 0, expectedDeliveryDate: po.expected_delivery_date ? po.expected_delivery_date.split("T")[0] : "", status: po.status ?? "Commandé", approvedBy: po.approved_by ?? "Direction", notes: po.notes ?? "" });
      try { setPoLines(JSON.parse(po.items_json ?? "[]")); } catch { setPoLines([{ name: "", qty: 1, unitPrice: 0 }]); }
    } else {
      setEditPO(null);
      setPoForm({ supplierId: 0, expectedDeliveryDate: "", status: "Commandé", approvedBy: "Direction", notes: "" });
      setPoLines([{ name: "", qty: 1, unitPrice: 0 }]);
    }
    setShowPOModal(true);
  }

  async function handleSavePO() {
    if (poLines.length === 0) return toast.error("Ajoutez au moins une ligne");
    setLoading(true);
    try {
      await savePurchaseOrder({ ...poForm, supplierId: poForm.supplierId || undefined, id: editPO?.id, totalAmount: poTotal, itemsJson: JSON.stringify(poLines) });
      toast.success("Bon de commande sauvegardé !");
      setShowPOModal(false);
      await refreshAll();
    } finally { setLoading(false); }
  }

  // ── Category ──
  async function handleSaveCategory() {
    if (!catForm.name.trim()) return toast.error("Nom requis");
    await saveCategory({ id: catForm.id || undefined, name: catForm.name, description: catForm.description, icon: catForm.icon });
    toast.success("Catégorie sauvegardée !");
    setShowCatModal(false);
    await refreshAll();
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "stock", label: "📦 Catalogue Stock", icon: Package, count: items.length },
    { id: "movements", label: "🔄 Mouvements", icon: TrendingUp, count: movements.length },
    { id: "assignments", label: "🔑 Affectations", icon: Users, count: assignments.filter(a => a.status === "En possession").length },
    { id: "suppliers", label: "🏭 Fournisseurs", icon: Building2, count: suppliers.length },
    { id: "orders", label: "📋 Bons de Commande", icon: ShoppingCart, count: purchaseOrders.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 text-white px-6 py-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Boxes className="w-7 h-7" /> Gestion des Stocks & Patrimoine Scolaire
              </h1>
              <p className="text-blue-200 text-sm mt-1">Inventaire · Mouvements · Affectations · Fournisseurs · Bons de Commande</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {lowStockItems.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> {lowStockItems.length} articles en stock critique
                </span>
              )}
              <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={refreshAll} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Articles en stock", value: kpis.totalItems, icon: Package, color: "from-blue-500/20 to-blue-600/20" },
              { label: "Stock critique / Rupture", value: kpis.lowStockCount, icon: AlertTriangle, color: "from-red-500/20 to-orange-500/20" },
              { label: "Affectations actives", value: kpis.activeAssignments, icon: Users, color: "from-purple-500/20 to-pink-500/20" },
              { label: "Valeur totale du stock", value: fmtCFA(kpis.totalStockValue), icon: BadgeDollarSign, color: "from-green-500/20 to-emerald-500/20" },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.color} backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center`}>
                <k.icon className="w-5 h-5 mx-auto mb-1 text-white/80" />
                <div className="text-xl font-bold text-white">{k.value}</div>
                <div className="text-xs text-blue-200">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ═══════ TAB 1: STOCK CATALOGUE ═══════ */}
        {activeTab === "stock" && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Rechercher article, SKU, catégorie..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setCatForm({ id: 0, name: "", description: "", icon: "Package" }); setShowCatModal(true); }}>
                  <Layers className="w-4 h-4 mr-1" /> Catégorie
                </Button>
                <Button size="sm" variant="outline" onClick={() => openMovModal()}>
                  <ArrowDownToLine className="w-4 h-4 mr-1" /> Mouvement
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAssignModal()}>
                  <Users className="w-4 h-4 mr-1" /> Affecter
                </Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openItemModal()}>
                  <Plus className="w-4 h-4 mr-1" /> Nouvel Article
                </Button>
              </div>
            </div>

            {/* Categories quick filter */}
            {categories.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {categories.map((c: any) => {
                  const Icon = CAT_ICONS[c.icon] ?? Package;
                  return (
                    <button key={c.id} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-all whitespace-nowrap">
                      <Icon className="w-3.5 h-3.5 text-indigo-500" /> {c.name} <span className="text-gray-400">({c.item_count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Low stock alert */}
            {lowStockItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <AlertCircle className="w-4 h-4" /> Stock Critique — {lowStockItems.length} article(s) à réapprovisionner
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStockItems.map((item: any) => (
                    <span key={item.id} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">
                      {item.name} — <strong>{item.quantity}</strong> / seuil: {item.min_threshold}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Items table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Article / SKU</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Qté</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Emplacement</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Valeur</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">État</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Aucun article trouvé
                      </td></tr>
                    ) : filteredItems.map((item: any) => {
                      const sb = stockBadge(item.quantity, item.min_threshold ?? 5);
                      const Icon = CAT_ICONS[item.category_icon] ?? Package;
                      return (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{item.name}</div>
                            {item.sku && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Barcode className="w-3 h-3" />{item.sku}</div>}
                            {item.brand_model && <div className="text-xs text-gray-400">{item.brand_model}</div>}
                            {item.is_asset && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Immobilisation</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Icon className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs">{item.category_name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-bold text-lg text-gray-800">{item.quantity}</div>
                            <div className="text-xs text-gray-400">min: {item.min_threshold ?? 5}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${sb.cls}`}>{sb.label}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{item.location ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                            {fmtCFA((item.unit_price ?? 0) * (item.quantity ?? 0))}
                            <div className="text-gray-400">{fmtCFA(item.unit_price ?? 0)}/u</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.condition}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button title="Mouvement" onClick={() => openMovModal(item.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                              <button title="Affecter" onClick={() => openAssignModal(item.id)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                                <Users className="w-3.5 h-3.5" />
                              </button>
                              <button title="Modifier" onClick={() => openItemModal(item)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button title="Supprimer" onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TAB 2: MOVEMENTS ═══════ */}
        {activeTab === "movements" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Mouvements de Stock</h2>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openMovModal()}>
                <Plus className="w-4 h-4 mr-1" /> Nouveau Mouvement
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Article</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Type</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Qté</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Réf. Document</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Par</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Aucun mouvement enregistré
                      </td></tr>
                    ) : movements.map((m: any) => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-800">{m.item_name ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${movementBadge(m.movement_type)}`}>{m.movement_type}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">{m.quantity}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.reference_doc ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{m.performed_by}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(m.movement_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{m.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TAB 3: ASSIGNMENTS ═══════ */}
        {activeTab === "assignments" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Affectations de Matériel</h2>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openAssignModal()}>
                <Plus className="w-4 h-4 mr-1" /> Nouvelle Affectation
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Article</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Employé</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Qté</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date Affectation</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Retour prévu</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Par</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Aucune affectation enregistrée
                      </td></tr>
                    ) : assignments.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{a.item_name}</div>
                          {a.item_sku && <div className="text-xs text-gray-400">{a.item_sku}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-700">{a.employee_name ?? "—"}</div>
                          <div className="text-xs text-gray-400">{a.employee_post ?? ""}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">{a.assigned_qty}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(a.status)}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.assigned_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.expected_return_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{a.assigned_by ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {a.status === "En possession" && (
                            <button onClick={() => handleReturn(a.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1 mx-auto">
                              <RotateCcw className="w-3 h-3" /> Retour
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TAB 4: SUPPLIERS ═══════ */}
        {activeTab === "suppliers" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Fournisseurs</h2>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openSupplierModal()}>
                <Plus className="w-4 h-4 mr-1" /> Nouveau Fournisseur
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.length === 0 ? (
                <div className="col-span-3 text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  Aucun fournisseur enregistré
                </div>
              ) : suppliers.map((s: any) => (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-800">{s.name}</div>
                      <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">{s.category}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openSupplierModal(s)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {s.contact_person && <div className="text-xs text-gray-600 flex items-center gap-1"><Users className="w-3 h-3" /> {s.contact_person}</div>}
                  {s.phone && <div className="text-xs text-gray-500 mt-1">📞 {s.phone}</div>}
                  {s.email && <div className="text-xs text-gray-500 mt-0.5">✉️ {s.email}</div>}
                  {s.tax_id && <div className="text-xs text-gray-400 mt-0.5">NIF: {s.tax_id}</div>}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>{s.order_count} commande(s)</span>
                    <span className="font-semibold text-indigo-600">{fmtCFA(Number(s.total_ordered ?? 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ TAB 5: PURCHASE ORDERS ═══════ */}
        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Bons de Commande</h2>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openPOModal()}>
                <Plus className="w-4 h-4 mr-1" /> Nouveau BC
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">N° BC</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Fournisseur</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date Commande</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Livraison prévue</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Aucun bon de commande
                      </td></tr>
                    ) : purchaseOrders.map((po: any) => (
                      <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-700">{po.order_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-700">{po.supplier_name ?? "Fournisseur direct"}</div>
                          {po.supplier_phone && <div className="text-xs text-gray-400">{po.supplier_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(po.status)}`}>{po.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtCFA(po.total_amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(po.order_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(po.expected_delivery_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openPOModal(po)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {po.status === "Commandé" && (
                              <button onClick={() => { updatePurchaseOrderStatus(po.id, "Reçu totalement"); refreshAll(); }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200">
                                <Check className="w-3 h-3 inline mr-0.5" />Reçu
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* ── Item Modal ── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editItem ? "Modifier l'Article" : "Nouvel Article"}</h3>
              <button onClick={() => setShowItemModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom de l'article *</label>
                <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Ordinateur Dell Latitude 5420" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Code Barre / SKU</label>
                <Input value={itemForm.sku} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value }))} placeholder="ex: INF-001" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Catégorie</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: Number(e.target.value) }))}>
                  <option value={0}>— Sélectionner —</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Quantité</label>
                <Input type="number" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: Number(e.target.value) }))} min={0} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Seuil d'alerte critique</label>
                <Input type="number" value={itemForm.minThreshold} onChange={e => setItemForm(f => ({ ...f, minThreshold: Number(e.target.value) }))} min={0} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prix unitaire (CFA)</label>
                <Input type="number" value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: Number(e.target.value) }))} min={0} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">État / Condition</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={itemForm.condition} onChange={e => setItemForm(f => ({ ...f, condition: e.target.value }))}>
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Emplacement / Magasin</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={itemForm.location} onChange={e => setItemForm(f => ({ ...f, location: e.target.value }))}>
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Marque / Modèle</label>
                <Input value={itemForm.brandModel} onChange={e => setItemForm(f => ({ ...f, brandModel: e.target.value }))} placeholder="ex: Dell Latitude 5420" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">N° Série</label>
                <Input value={itemForm.serialNumber} onChange={e => setItemForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="ex: SN-20240001" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Salle / Local affecté</label>
                <Input value={itemForm.assignedRoom} onChange={e => setItemForm(f => ({ ...f, assignedRoom: e.target.value }))} placeholder="ex: Salle Info 1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fournisseur</label>
                <Input value={itemForm.supplierName} onChange={e => setItemForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="Nom du fournisseur" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_asset" checked={itemForm.isAsset} onChange={e => setItemForm(f => ({ ...f, isAsset: e.target.checked }))} className="rounded" />
                <label htmlFor="is_asset" className="text-sm text-gray-700">Bien durable / Immobilisation</label>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes / Observations</label>
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowItemModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveItem} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Movement Modal ── */}
      {showMovModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">Enregistrer un Mouvement</h3>
              <button onClick={() => setShowMovModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Article *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={movForm.itemId} onChange={e => setMovForm(f => ({ ...f, itemId: Number(e.target.value) }))}>
                  <option value={0}>— Sélectionner un article —</option>
                  {items.map((i: any) => <option key={i.id} value={i.id}>{i.name} (stock: {i.quantity})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type de mouvement *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={movForm.movementType} onChange={e => setMovForm(f => ({ ...f, movementType: e.target.value }))}>
                  {MOVEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Quantité *</label>
                  <Input type="number" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: Number(e.target.value) }))} min={1} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Coût unitaire (CFA)</label>
                  <Input type="number" value={movForm.unitCost} onChange={e => setMovForm(f => ({ ...f, unitCost: Number(e.target.value) }))} min={0} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Réf. Document (Facture / BL)</label>
                <Input value={movForm.referenceDoc} onChange={e => setMovForm(f => ({ ...f, referenceDoc: e.target.value }))} placeholder="ex: BL-2026-0045" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Effectué par</label>
                <Input value={movForm.performedBy} onChange={e => setMovForm(f => ({ ...f, performedBy: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <Input value={movForm.notes} onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMovModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleMovement} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assignment Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">Affecter du Matériel</h3>
              <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Article *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={assignForm.itemId} onChange={e => setAssignForm(f => ({ ...f, itemId: Number(e.target.value) }))}>
                  <option value={0}>— Sélectionner un article —</option>
                  {items.filter(i => i.quantity > 0).map((i: any) => <option key={i.id} value={i.id}>{i.name} (dispo: {i.quantity})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Employé / Personnel *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={assignForm.employeeId} onChange={e => setAssignForm(f => ({ ...f, employeeId: Number(e.target.value) }))}>
                  <option value={0}>— Sélectionner —</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nom_complet} — {e.poste}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Quantité</label>
                  <Input type="number" value={assignForm.assignedQty} onChange={e => setAssignForm(f => ({ ...f, assignedQty: Number(e.target.value) }))} min={1} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">État à l'affectation</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={assignForm.conditionAtAssignment} onChange={e => setAssignForm(f => ({ ...f, conditionAtAssignment: e.target.value }))}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date de retour prévue</label>
                <Input type="date" value={assignForm.expectedReturnDate} onChange={e => setAssignForm(f => ({ ...f, expectedReturnDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Affecté par</label>
                <Input value={assignForm.assignedBy} onChange={e => setAssignForm(f => ({ ...f, assignedBy: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <Input value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAssign} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Affecter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier Modal ── */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editSupplier ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}</h3>
              <button onClick={() => setShowSupplierModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Raison sociale *</label>
                <Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom commercial" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contact / Représentant</label>
                <Input value={supplierForm.contactPerson} onChange={e => setSupplierForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Nom du contact" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                <Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} placeholder="+227 ..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                <Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Spécialité</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={supplierForm.category} onChange={e => setSupplierForm(f => ({ ...f, category: e.target.value }))}>
                  {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">NIF / RCCM</label>
                <Input value={supplierForm.taxId} onChange={e => setSupplierForm(f => ({ ...f, taxId: e.target.value }))} placeholder="..." />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Adresse</label>
                <Input value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse complète" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSupplierModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveSupplier} disabled={loading}>
                <Check className="w-4 h-4 mr-1" /> Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase Order Modal ── */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editPO ? `Modifier ${editPO.order_number}` : "Nouveau Bon de Commande"}</h3>
              <button onClick={() => setShowPOModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fournisseur</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={poForm.supplierId} onChange={e => setPoForm(f => ({ ...f, supplierId: Number(e.target.value) }))}>
                    <option value={0}>— Sélectionner —</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Date de livraison prévue</label>
                  <Input type="date" value={poForm.expectedDeliveryDate} onChange={e => setPoForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Statut</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={poForm.status} onChange={e => setPoForm(f => ({ ...f, status: e.target.value }))}>
                    {PO_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Approuvé par</label>
                  <Input value={poForm.approvedBy} onChange={e => setPoForm(f => ({ ...f, approvedBy: e.target.value }))} />
                </div>
              </div>

              {/* PO Lines */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-700">Lignes de commande</label>
                  <button onClick={() => setPoLines(l => [...l, { name: "", qty: 1, unitPrice: 0 }])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Ajouter une ligne
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Désignation</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Qté</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">P.U. (CFA)</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poLines.map((line, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-1.5">
                            <Input className="h-8 text-xs" value={line.name} onChange={e => { const l = [...poLines]; l[idx].name = e.target.value; setPoLines(l); }} placeholder="Article..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input className="h-8 text-xs text-center w-20" type="number" value={line.qty} onChange={e => { const l = [...poLines]; l[idx].qty = Number(e.target.value); setPoLines(l); }} min={1} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input className="h-8 text-xs text-right w-28" type="number" value={line.unitPrice} onChange={e => { const l = [...poLines]; l[idx].unitPrice = Number(e.target.value); setPoLines(l); }} min={0} />
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700">{fmtCFA(line.qty * line.unitPrice)}</td>
                          <td className="px-2 py-1.5">
                            <button onClick={() => setPoLines(l => l.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50 border-t border-gray-200">
                        <td colSpan={3} className="px-3 py-2 text-sm font-bold text-indigo-700 text-right">TOTAL</td>
                        <td className="px-3 py-2 text-right font-bold text-indigo-700">{fmtCFA(poTotal)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPOModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSavePO} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer le BC
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Modal ── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">Nouvelle Catégorie</h3>
              <button onClick={() => setShowCatModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom *</label>
                <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Informatique & High-Tech" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Icône</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CAT_ICONS).map(([key, Icon]: any) => (
                    <button key={key} onClick={() => setCatForm(f => ({ ...f, icon: key }))} className={`p-2 rounded-lg border-2 transition-all ${catForm.icon === key ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Catégories prédéfinies</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_PRESETS.map(p => (
                    <button key={p.name} onClick={() => setCatForm(f => ({ ...f, name: p.name, icon: p.icon }))} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCatModal(false)}>Annuler</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveCategory}>
                <Check className="w-4 h-4 mr-1" /> Créer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
