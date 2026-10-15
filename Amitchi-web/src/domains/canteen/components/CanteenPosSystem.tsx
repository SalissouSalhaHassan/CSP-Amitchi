"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Search, ShoppingCart, CreditCard, Trash2, User, Wallet, Sparkles, 
  ArrowLeft, Clock, Calendar, Store, Plus, Minus, Check, X, Printer, 
  FileText, Package, Settings, Lock, RotateCcw, AlertTriangle, ChevronDown, 
  DollarSign, CheckCircle2, RefreshCw, Barcode, Eye, Loader2, Download, TrendingUp, Filter, Pencil
} from "lucide-react";
import { 
  createCanteenItem, 
  updateCanteenItem, 
  deleteCanteenItem, 
  getCanteenItems, 
  getCanteenInvoices, 
  createCanteenInvoice, 
  voidCanteenInvoice, 
  updateCanteenInvoice,
  getCanteenStudents,
  getActiveSchoolProfile
} from "@/domains/canteen/actions/canteen.actions";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  code?: string;
}

interface CanteenPosSystemProps {
  initialItems?: any[];
  initialInvoices?: any[];
  schoolName?: string;
}

export default function CanteenPosSystem({ 
  initialItems = [], 
  initialInvoices = [],
  schoolName = ""
}: CanteenPosSystemProps) {
  // Active Main View Tab: 'pos' | 'articles' | 'invoices'
  const [activeTab, setActiveTab] = useState<"pos" | "articles" | "invoices">("pos");

  // Loading & Processing state
  const [isValidatingSale, setIsValidatingSale] = useState(false);

  // School Name State
  const [displaySchoolName, setDisplaySchoolName] = useState<string>(schoolName || "Établissement Scolaire");

  // Real Database State
  const [items, setItems] = useState<any[]>(initialItems);
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [students, setStudents] = useState<any[]>([]);

  // Clock & Date state
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data from PostgreSQL database
  useEffect(() => {
    getActiveSchoolProfile().then((res: any) => {
      if (res.data?.schoolName) setDisplaySchoolName(res.data.schoolName);
    });
    getCanteenItems().then((res: any) => {
      const dbItems = res.data?.data || res.data || [];
      if (Array.isArray(dbItems)) setItems(dbItems);
    });
    getCanteenInvoices().then((res: any) => {
      const dbInvoices = res.data?.data || res.data || [];
      if (Array.isArray(dbInvoices)) setInvoices(dbInvoices);
    });
    getCanteenStudents().then((res: any) => {
      const dbStudents = res.data?.data || res.data || [];
      if (Array.isArray(dbStudents)) setStudents(dbStudents);
    });
  }, []);

  // ─── POS STATE ─────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null);

  // Client Selection
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id?: number; name: string; balance?: number }>({ name: "CLIENT COMPTANT" });
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Payment State
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Carte" | "Mobile Money" | "Crédit" | "Dépôt/Avance">("Cash");
  const [cashierName] = useState("admin");
  const [pointOfSaleLocation, setPointOfSaleLocation] = useState("CANTINE");

  // Modals
  const [printableReceipt, setPrintableReceipt] = useState<any | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleForm, setArticleForm] = useState({ id: 0, name: "", code: "", price: 0, category: "Snacks", stock: 100 });
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any | null>(null);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    id: 0,
    invoiceNumber: "",
    clientName: "CLIENT COMPTANT",
    paymentMethod: "Cash",
    status: "Payée"
  });

  const handleSaveEditedInvoice = async () => {
    if (!editingInvoice) return;

    const res = await updateCanteenInvoice(editingInvoice.id, {
      clientName: editInvoiceForm.clientName,
      paymentMethod: editInvoiceForm.paymentMethod,
      status: editInvoiceForm.status,
    }) as any;

    if (res.success || res.data?.success) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? {
        ...inv,
        clientName: editInvoiceForm.clientName,
        paymentMethod: editInvoiceForm.paymentMethod,
        status: editInvoiceForm.status,
      } : inv));
      toast.success(`Facture ${editInvoiceForm.invoiceNumber} modifiée avec succès !`);
      setEditingInvoice(null);
    } else {
      toast.error(res.error || res.data?.error || "Erreur lors de la modification de la facture.");
    }
  };

  // Categories List
  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)));
    return ["Tous", ...cats];
  }, [items]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
                            item.code?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = selectedCategory === "Tous" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, productSearch, selectedCategory]);

  // Filtered Clients for dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearch) return students.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return students.filter((s: any) => 
      (s.nomEtudiant && s.nomEtudiant.toLowerCase().includes(q)) || 
      (s.numAdmission && s.numAdmission.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [students, clientSearch]);

  // Invoices Tab Filtering & Analytics States
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState("Tous");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("Tous");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState("Tous");

  // Memoized Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = invoiceSearchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
        (inv.cashierName && inv.cashierName.toLowerCase().includes(q));

      const matchPayment = invoicePaymentFilter === "Tous" || inv.paymentMethod === invoicePaymentFilter;
      const matchStatus = invoiceStatusFilter === "Tous" || (inv.status || "Payée") === invoiceStatusFilter;

      let matchDate = true;
      if (invoiceDateFilter === "Aujourd'hui" && inv.createdAt) {
        const invDate = new Date(inv.createdAt).toDateString();
        const today = new Date().toDateString();
        matchDate = invDate === today;
      }

      return matchSearch && matchPayment && matchStatus && matchDate;
    });
  }, [invoices, invoiceSearchQuery, invoicePaymentFilter, invoiceStatusFilter, invoiceDateFilter]);

  // Memoized Invoice Key Metrics
  const invoiceMetrics = useMemo(() => {
    const validInvoices = invoices.filter(inv => inv.status !== "Annulée");
    const voidedInvoices = invoices.filter(inv => inv.status === "Annulée");
    const totalRevenue = validInvoices.reduce((sum, inv) => sum + (inv.totalTtc || 0), 0);
    const avgBasket = validInvoices.length > 0 ? totalRevenue / validInvoices.length : 0;
    return {
      totalCount: invoices.length,
      validCount: validInvoices.length,
      voidedCount: voidedInvoices.length,
      totalRevenue,
      avgBasket,
    };
  }, [invoices]);

  // Export Invoices to CSV
  const exportInvoicesToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("Aucune facture à exporter.");
      return;
    }
    const headers = ["N° Facture", "Date", "Client", "Mode Paiement", "Montant Total (FCFA)", "Statut", "Caissier"];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.createdAt).toLocaleString('fr-FR'),
      `"${inv.clientName || 'CLIENT COMPTANT'}"`,
      inv.paymentMethod || 'Cash',
      inv.totalTtc || 0,
      inv.status || 'Payée',
      inv.cashierName || 'admin'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rapport_Ventes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport CSV téléchargé avec succès !");
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const tva = 0; // Tax
  const totalTtc = subtotal + tva;

  const numAmountReceived = Number(amountReceived) || 0;
  const changeGiven = Math.max(0, numAmountReceived - totalTtc);

  // Cart Actions
  const addToCart = (product: any) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === product.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, category: product.category, code: product.code }];
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index].quantity = newQty;
      return next;
    });
  };

  const removeCartRow = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    setSelectedCartIndex(null);
  };

  const clearTicket = () => {
    setCart([]);
    setSelectedCartIndex(null);
    setAmountReceived("");
    setSelectedClient({ name: "CLIENT COMPTANT" });
  };

  // Process Checkout
  const handleValidateSale = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide. Veuillez ajouter des produits.");
      return;
    }

    if (isValidatingSale) return;
    setIsValidatingSale(true);

    try {
      const currentCart = [...cart];

      const payload = {
        clientName: selectedClient.name,
        studentId: selectedClient.id || undefined,
        subtotal,
        tva,
        totalTtc,
        amountReceived: numAmountReceived || totalTtc,
        changeGiven: numAmountReceived > totalTtc ? changeGiven : 0,
        paymentMethod,
        itemsJson: JSON.stringify(currentCart),
        cashierName,
      };

      const res = await createCanteenInvoice(payload) as any;
      if (res.success || res.data?.success) {
        const createdInvoice = res.data?.data || res.data || res;
        setInvoices(prev => [createdInvoice, ...prev]);
        setPrintableReceipt(createdInvoice);

        // Deduct stock locally in UI state immediately
        setItems(prevItems => prevItems.map(prod => {
          const cartItem = currentCart.find(c => c.id === prod.id || c.name === prod.name || (c.code && c.code === prod.code));
          if (cartItem) {
            const currentStock = prod.stock ?? 100;
            return { ...prod, stock: Math.max(0, currentStock - (cartItem.quantity || 1)) };
          }
          return prod;
        }));

        // Re-fetch fresh items from server to stay 100% in sync with PostgreSQL
        getCanteenItems().then((freshRes: any) => {
          const freshData = freshRes.data?.data || freshRes.data || [];
          if (Array.isArray(freshData) && freshData.length > 0) {
            setItems(freshData);
          }
        }).catch(() => {});

        toast.success(`Vente enregistrée avec succès ! Facture: ${createdInvoice.invoiceNumber || ''}`);
        clearTicket();
      } else {
        toast.error(res.error || res.data?.error || "Erreur lors de la validation de la vente.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la validation de la vente.");
    } finally {
      setIsValidatingSale(false);
    }
  };

  // Article Form Handlers
  const handleSaveArticle = async () => {
    if (!articleForm.name.trim() || articleForm.price < 0) {
      toast.error("Veuillez renseigner un nom et un prix valide.");
      return;
    }

    if (isEditingArticle) {
      const res = await updateCanteenItem(articleForm.id, articleForm) as any;
      if (res.success || res.data?.success) {
        toast.success("Article mis à jour avec succès !");
        setShowArticleModal(false);
        const refreshRes = await getCanteenItems() as any;
        const freshData = refreshRes.data?.data || refreshRes.data || [];
        if (Array.isArray(freshData) && freshData.length > 0) setItems(freshData);
      } else {
        toast.error(res.error || res.data?.error || "Erreur lors de la mise à jour");
      }
    } else {
      const res = await createCanteenItem(articleForm) as any;
      if (res.success || res.data?.success) {
        toast.success("Article ajouté avec succès !");
        setShowArticleModal(false);
        const refreshRes = await getCanteenItems() as any;
        const freshData = refreshRes.data?.data || refreshRes.data || [];
        if (Array.isArray(freshData) && freshData.length > 0) setItems(freshData);
      } else {
        toast.error(res.error || res.data?.error || "Erreur lors de la création du produit");
      }
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (confirm("Supprimer cet article ?")) {
      const res = await deleteCanteenItem(id) as any;
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success("Article supprimé !");
      }
    }
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} F CFA`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ─── TOP SYSTEM HEADER BAR ─── */}
      <div className="h-16 bg-[#1e293b] border-b border-slate-700/60 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()} 
            className="h-10 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold gap-2 text-xs border border-slate-700"
          >
            <ArrowLeft size={16} /> Retour
          </Button>

          <div className="flex items-center gap-2 border-l border-slate-700/80 pl-4">
            <Store className="text-purple-400" size={22} />
            <span className="font-black text-lg tracking-wider text-white uppercase">{displaySchoolName}</span>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-700/80 ml-6">
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all gap-2 flex items-center ${
                activeTab === "pos" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingCart size={14} /> Point de Vente (POS)
            </button>
            <button
              onClick={() => setActiveTab("articles")}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all gap-2 flex items-center ${
                activeTab === "articles" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <Package size={14} /> Gestion des Articles ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all gap-2 flex items-center ${
                activeTab === "invoices" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText size={14} /> Gestion des Factures ({invoices.length})
            </button>
          </div>
        </div>

        {/* Right Info Pointers */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700/60 text-xs font-bold">
            <span className="flex items-center gap-1 text-slate-300"><Calendar size={14} className="text-purple-400" /> {currentDate}</span>
            <span className="w-px h-3 bg-slate-700"></span>
            <span className="flex items-center gap-1 text-slate-300"><Clock size={14} className="text-purple-400" /> {currentTime}</span>
            <span className="w-px h-3 bg-slate-700"></span>
            <select
              value={pointOfSaleLocation}
              onChange={(e) => setPointOfSaleLocation(e.target.value)}
              className="bg-transparent text-purple-300 font-extrabold uppercase outline-none cursor-pointer"
            >
              <option value="BOUTIQUE" className="bg-slate-800 text-white">BOUTIQUE</option>
              <option value="CANTINE" className="bg-slate-800 text-white">CANTINE</option>
              <option value="RESTAURANT" className="bg-slate-800 text-white">RESTAURANT</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200">
            <User size={14} className="text-purple-400" />
            <span>Caissier: <strong className="text-white">{cashierName}</strong></span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: POINT DE VENTE (POS) VIEW ─── */}
      {activeTab === "pos" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main 3-Columns Grid */}
          <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
            
            {/* COLUMN 1: PRODUITS (Left) */}
            <div className="col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl">
              {/* Column Header Banner */}
              <div className="h-12 bg-purple-600 text-white font-black text-center flex items-center justify-center uppercase tracking-widest text-xs shadow-md">
                PRODUITS
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Recherche..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 text-sm font-bold text-white outline-none focus:border-purple-500 placeholder:text-slate-500"
                  />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>

                {/* Categories Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-colors ${
                        selectedCategory === cat ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-2.5 content-start">
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-white text-slate-900 p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 active:scale-95 transition-all flex flex-col items-center justify-between h-28 text-center group relative overflow-hidden"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                      <Package size={18} />
                    </div>
                    <span className="font-extrabold text-[11px] leading-tight uppercase line-clamp-2 text-slate-800 group-hover:text-purple-700">
                      {prod.name}
                    </span>
                    <span className="font-black text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 w-full">
                      {formatCurrency(prod.price)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Column 1 Bottom Toolbar */}
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
                <Button 
                  onClick={() => {
                    setIsEditingArticle(false);
                    setArticleForm({ id: 0, name: "", code: "", price: 0, category: "Snacks", stock: 100 });
                    setShowArticleModal(true);
                  }}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl gap-2 shadow-md shadow-blue-600/20"
                >
                  <Plus size={16} /> + AJOUTER RAPIDE
                </Button>
                <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl bg-slate-800 text-slate-300 hover:text-white">
                  <Settings size={18} />
                </Button>
              </div>
            </div>

            {/* COLUMN 2: TICKET DE CAISSE (Middle) */}
            <div className="col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl">
              {/* Column Header Banner */}
              <div className="h-12 bg-purple-600 text-white font-black text-center flex items-center justify-center uppercase tracking-widest text-xs shadow-md">
                TICKET DE CAISSE
              </div>

              {/* Cart Table Header */}
              <div className="grid grid-cols-12 bg-slate-950 px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                <span className="col-span-5">PRODUIT</span>
                <span className="col-span-2 text-center">QUANTITÉ</span>
                <span className="col-span-2 text-right">PRIX</span>
                <span className="col-span-3 text-right">TOTAL</span>
              </div>

              {/* Cart Table Items */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/40 divide-y divide-slate-800/60">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3">
                    <ShoppingCart size={48} className="text-slate-700 stroke-1" />
                    <p className="font-bold text-xs">Aucun article dans le ticket</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedCartIndex(idx)}
                      className={`grid grid-cols-12 px-4 py-3 text-xs items-center cursor-pointer transition-colors ${
                        selectedCartIndex === idx ? "bg-purple-900/40 border-l-4 border-purple-500" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="col-span-5 font-extrabold uppercase text-slate-100 truncate pr-2">
                        {item.name}
                      </span>

                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateCartQty(idx, -1); }}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="font-black text-white px-1.5">{item.quantity}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateCartQty(idx, 1); }}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>

                      <span className="col-span-2 text-right font-bold text-slate-400 text-[11px]">
                        {item.price.toLocaleString('fr-FR')}
                      </span>

                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <span className="font-black text-white text-xs">
                          {(item.price * item.quantity).toLocaleString('fr-FR')} F
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeCartRow(idx); }}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotals Box */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Total HT:</span>
                  <span className="font-black text-slate-200">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>TVA:</span>
                  <span className="font-black text-slate-200">{formatCurrency(tva)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="font-black text-sm text-slate-300 uppercase">Total TTC:</span>
                  <span className="text-2xl font-black text-blue-400 tracking-tight">{formatCurrency(totalTtc)}</span>
                </div>

                {/* Cart Modifier Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => { if (selectedCartIndex !== null) updateCartQty(selectedCartIndex, 1); }}
                    className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} /> Ajouter
                  </button>
                  <button
                    onClick={() => { if (selectedCartIndex !== null) updateCartQty(selectedCartIndex, -1); }}
                    className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Minus size={16} /> Réduire
                  </button>
                  <button
                    onClick={() => { if (selectedCartIndex !== null) removeCartRow(selectedCartIndex); }}
                    className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <X size={16} /> Supprimer
                  </button>
                </div>

                {/* Historical Log info bar */}
                <div className="mt-2 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] font-bold text-slate-400 text-center">
                  HISTORIQUE PRIX EN COURS: <span className="text-slate-500">Aucun changement de prix validé pour cette vente.</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: PAIEMENT (Right) */}
            <div className="col-span-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-xl p-4 space-y-4">
              
              {/* Top Payment Banner Header */}
              <div className="h-10 bg-purple-600 text-white font-black text-center flex items-center justify-center uppercase tracking-widest text-xs rounded-xl shadow-md">
                PAIEMENT
              </div>

              {/* Big Total Display */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TOTAL À PAYER :</span>
                <div className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalTtc)}</div>
              </div>

              {/* Amount Received & Change Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Montant Reçu:</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full h-12 bg-white text-slate-900 border-none rounded-xl px-4 text-right font-black text-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex justify-between items-center">
                  <span className="text-[11px] font-bold text-emerald-300">Monnaie:</span>
                  <span className="text-lg font-black text-emerald-400">{formatCurrency(changeGiven)}</span>
                </div>
              </div>

              {/* Client Selection */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>CLIENT</span>
                  <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    Dette: 0,00 F
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                  />
                  
                  {/* Selected Client Badge */}
                  <div className="mt-1 flex items-center justify-between bg-slate-800 p-2 rounded-xl border border-slate-700 text-xs font-black text-white">
                    <span>{selectedClient.name}</span>
                    <button 
                      onClick={() => setSelectedClient({ name: "CLIENT COMPTANT" })}
                      className="text-slate-400 hover:text-rose-400 text-[10px]"
                    >
                      Effacer
                    </button>
                  </div>

                  {/* Dropdown Search Results */}
                  {showClientDropdown && (
                    <div className="absolute top-12 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-700">
                      <button
                        onClick={() => {
                          setSelectedClient({ name: "CLIENT COMPTANT" });
                          setShowClientDropdown(false);
                        }}
                        className="w-full p-2 text-left font-black text-xs text-purple-300 hover:bg-slate-700 uppercase"
                      >
                        + CLIENT COMPTANT (Passant)
                      </button>
                      {filteredClients.map((st: any) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            setSelectedClient({ id: st.id, name: st.nomEtudiant || "Élève" });
                            setShowClientDropdown(false);
                            setClientSearch("");
                          }}
                          className="w-full p-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-700 flex justify-between"
                        >
                          <span>{st.nomEtudiant}</span>
                          <span className="text-[10px] text-slate-400">{st.classe || "Élève"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods Buttons */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">MODE DE PAIEMENT</label>
                <div className="space-y-1.5">
                  {(["Cash", "Carte", "Mobile Money", "Crédit", "Dépôt/Avance"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMethod(mode)}
                      className={`w-full h-10 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === mode 
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <CreditCard size={14} /> {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── BOTTOM FULL WIDTH TOOLBAR ─── */}
          <div className="h-16 bg-[#1e293b] border-t border-slate-700 px-4 flex items-center gap-3 shrink-0 shadow-2xl">
            <Button
              onClick={clearTicket}
              className="h-12 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-2 shadow-md"
            >
              <ShoppingCart size={16} /> Nouveau Ticket
            </Button>

            <Button
              onClick={() => toast.info("Ticket mis en attente")}
              className="h-12 px-6 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 font-black text-xs gap-2"
            >
              <Clock size={16} /> Mettre en attente
            </Button>

            <Button
              onClick={clearTicket}
              className="h-12 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs gap-2 shadow-md"
            >
              <Trash2 size={16} /> Supprimer Ticket
            </Button>

            {/* LARGE GREEN VALIDATE SALE BUTTON */}
            <Button
              onClick={handleValidateSale}
              disabled={cart.length === 0 || isValidatingSale}
              className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider gap-3 shadow-xl shadow-emerald-500/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isValidatingSale ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> VALIDATION EN COURS...
                </>
              ) : (
                <>
                  <Check size={20} /> VALIDER VENTE
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                if (printableReceipt || invoices.length > 0) {
                  setPrintableReceipt(printableReceipt || invoices[0]);
                } else {
                  toast.error("Aucune facture disponible pour l'impression.");
                }
              }}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs gap-2 shadow-md"
            >
              <Printer size={16} /> Imprimer Facture
            </Button>

            <Button
              onClick={() => setShowRegisterModal(true)}
              className="h-12 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-black text-xs gap-2"
            >
              <Lock size={16} /> Fermer Caisse
            </Button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: GESTION DES ARTICLES ─── */}
      {activeTab === "articles" && (
        <div className="flex-1 p-8 overflow-y-auto bg-slate-950 space-y-6">
          <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-white">Gestion des Articles / Produits</h2>
              <p className="text-xs font-bold text-slate-400">Ajouter, modifier ou supprimer les articles de la cantine et boutique.</p>
            </div>
            <Button
              onClick={() => {
                setIsEditingArticle(false);
                setArticleForm({ 
                  id: 0, 
                  name: "", 
                  code: `ART-${String(items.length + 1).padStart(3, '0')}`, 
                  price: 0, 
                  category: "Snacks", 
                  stock: 100 
                });
                setShowArticleModal(true);
              }}
              className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black gap-2 shadow-lg shadow-purple-600/30"
            >
              <Plus size={18} /> Nouveau Produit
            </Button>
          </div>

          {/* Articles Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-black uppercase border-b border-slate-800">
                  <th className="p-4">Code</th>
                  <th className="p-4">Désignation</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4 text-right">Prix Unitaire</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm font-bold">
                {items.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-800/50">
                    <td className="p-4 text-purple-400 font-mono text-xs">
                      {art.code || `ART-${String(art.id).padStart(3, '0')}`}
                    </td>
                    <td className="p-4 text-white font-extrabold">{art.name}</td>
                    <td className="p-4">
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-xs font-black border border-slate-700">
                        {art.category || "Général"}
                      </span>
                    </td>
                    <td className="p-4 text-right text-emerald-400 font-black">{formatCurrency(art.price)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                        (art.stock ?? 100) < 10 ? "bg-rose-950 text-rose-400 border border-rose-800" : "bg-slate-800 text-slate-200"
                      }`}>
                        {art.stock ?? 100}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setIsEditingArticle(true);
                            setArticleForm({ id: art.id, name: art.name, code: art.code || "", price: art.price, category: art.category || "Snacks", stock: art.stock || 100 });
                            setShowArticleModal(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-purple-400 flex items-center justify-center"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(art.id)}
                          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: GESTION ADVANCÉE DES FACTURES & VENTES (WORLD-CLASS POS INVOICES) ─── */}
      {activeTab === "invoices" && (
        <div className="flex-1 p-8 overflow-y-auto bg-slate-950 space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center flex-wrap gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-wide">Gestion des Factures & Ventes</h2>
                  <p className="text-xs font-bold text-slate-400">Système avancé d'historique, de contrôle et d'analyse globale des caisses.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={exportInvoicesToCSV}
              className="h-11 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Download size={16} /> Exporter Rapport CSV
            </Button>
          </div>

          {/* KPI Analytics Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 rounded-3xl border border-emerald-900/40 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Revenu Total</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(invoiceMetrics.totalRevenue)}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Cumul des ventes valides encaissées</p>
            </div>

            {/* Card 2: Total Invoices */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Total Factures</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {invoiceMetrics.totalCount} <span className="text-xs text-slate-500 font-sans">factures</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Toutes transactions confondues</p>
            </div>

            {/* Card 3: Average Basket */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Panier Moyen</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {formatCurrency(invoiceMetrics.avgBasket)}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Valeur moyenne par ticket de caisse</p>
            </div>

            {/* Card 4: Voided Sales */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Factures Annulées</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-400 font-mono">
                {invoiceMetrics.voidedCount} <span className="text-xs text-slate-500 font-sans">annulations</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Ventes annulées hors chiffre d'affaires</p>
            </div>
          </div>

          {/* Interactive Search & Filter Bar */}
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-xl">
            {/* Live Search */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Rechercher par N° Facture, Client, Caissier..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              {/* Payment Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase font-black">Paiement:</span>
                <select
                  value={invoicePaymentFilter}
                  onChange={(e) => setInvoicePaymentFilter(e.target.value)}
                  className="h-11 bg-slate-950 border border-slate-700 rounded-2xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                >
                  <option value="Tous">Tous</option>
                  <option value="Cash">Cash</option>
                  <option value="Carte">Carte</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Crédit">Crédit</option>
                  <option value="Dépôt/Avance">Dépôt/Avance</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase font-black">Statut:</span>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="h-11 bg-slate-950 border border-slate-700 rounded-2xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                >
                  <option value="Tous">Tous</option>
                  <option value="Payée">Payée</option>
                  <option value="Annulée">Annulée</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase font-black">Date:</span>
                <select
                  value={invoiceDateFilter}
                  onChange={(e) => setInvoiceDateFilter(e.target.value)}
                  className="h-11 bg-slate-950 border border-slate-700 rounded-2xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                >
                  <option value="Tous">Historique Global</option>
                  <option value="Aujourd'hui">Aujourd'hui</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-black uppercase border-b border-slate-800">
                  <th className="p-4">N° Facture</th>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Mode Paiement</th>
                  <th className="p-4 text-right">Montant Total</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm font-bold">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                      Aucune facture ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/60 transition-all">
                      <td className="p-4 text-purple-400 font-mono text-xs font-black tracking-wider">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4 text-slate-300 text-xs">
                        {new Date(inv.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-4 text-white font-extrabold">
                        {inv.clientName || "CLIENT COMPTANT"}
                      </td>
                      <td className="p-4 text-xs">
                        <span className={`px-3 py-1 rounded-xl font-extrabold text-[11px] border ${
                          inv.paymentMethod === "Carte" ? "bg-blue-950/70 text-blue-400 border-blue-800" :
                          inv.paymentMethod === "Mobile Money" ? "bg-purple-950/70 text-purple-400 border-purple-800" :
                          inv.paymentMethod === "Crédit" ? "bg-amber-950/70 text-amber-400 border-amber-800" :
                          "bg-slate-800 text-slate-200 border-slate-700"
                        }`}>
                          {inv.paymentMethod || "Cash"}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400 text-base font-mono">
                        {formatCurrency(inv.totalTtc || 0)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                          inv.status === "Annulée" 
                            ? "bg-rose-950/80 text-rose-400 border-rose-800" 
                            : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${inv.status === "Annulée" ? "bg-rose-500" : "bg-emerald-500"}`} />
                          {inv.status || "Payée"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setPrintableReceipt(inv)}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700"
                            title="Imprimer Reçu"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceDetails(inv)}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700"
                            title="Détails"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingInvoice(inv);
                              setEditInvoiceForm({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                clientName: inv.clientName || "CLIENT COMPTANT",
                                paymentMethod: inv.paymentMethod || "Cash",
                                status: inv.status || "Payée"
                              });
                            }}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700"
                            title="Modifier Facture"
                          >
                            <Pencil size={15} />
                          </button>
                          {inv.status !== "Annulée" && (
                            <button
                              onClick={async () => {
                                if (confirm(`Êtes-vous sûr de vouloir annuler la facture ${inv.invoiceNumber} ?`)) {
                                  const res = await voidCanteenInvoice(inv.id) as any;
                                  if (res.success || res.data?.success) {
                                    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "Annulée" } : i));
                                    toast.success(`Facture ${inv.invoiceNumber} annulée avec succès.`);
                                  } else {
                                    toast.error("Erreur lors de l'annulation.");
                                  }
                                }
                              }}
                              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700"
                              title="Annuler Facture"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECEIPT PRINT PREVIEW (FACTURE) ─── */}
      {printableReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 font-mono text-xs relative">
            <button 
              onClick={() => setPrintableReceipt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
            >
              <X size={20} />
            </button>

            <div className="text-center border-b border-slate-200 pb-3 space-y-1">
              <h3 className="font-black text-lg text-slate-900 tracking-wider">{displaySchoolName}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Point de Vente - Ticket de Caisse</p>
              <p className="text-[10px] text-slate-400 font-semibold">{new Date(printableReceipt.createdAt || Date.now()).toLocaleString('fr-FR')}</p>
              <p className="text-[10px] text-purple-700 font-bold">{printableReceipt.invoiceNumber}</p>
            </div>

            <div className="space-y-1 text-[11px] font-bold text-slate-700">
              <div className="flex justify-between"><span>Client:</span> <span>{printableReceipt.clientName}</span></div>
              <div className="flex justify-between"><span>Caissier:</span> <span>{printableReceipt.cashierName || "admin"}</span></div>
              <div className="flex justify-between"><span>Mode Paiement:</span> <span>{printableReceipt.paymentMethod || "Cash"}</span></div>
            </div>

            {/* Items List */}
            <div className="border-t border-b border-slate-200 py-3 space-y-2">
              {JSON.parse(printableReceipt.itemsJson || "[]").map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-[11px] font-bold">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-1 text-right">
              <div className="flex justify-between text-xs font-bold"><span>Total HT:</span> <span>{formatCurrency(printableReceipt.subtotal || 0)}</span></div>
              <div className="flex justify-between text-xs font-bold"><span>TVA:</span> <span>{formatCurrency(printableReceipt.tva || 0)}</span></div>
              <div className="flex justify-between text-sm font-black text-purple-700 pt-1 border-t border-slate-200">
                <span>TOTAL TTC:</span> <span>{formatCurrency(printableReceipt.totalTtc || 0)}</span>
              </div>
              {printableReceipt.amountReceived > 0 && (
                <>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Reçu:</span> <span>{formatCurrency(printableReceipt.amountReceived)}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600"><span>Monnaie Rendue:</span> <span>{formatCurrency(printableReceipt.changeGiven || 0)}</span></div>
                </>
              )}
            </div>

            <div className="pt-4 flex gap-2">
              <Button 
                onClick={() => window.print()}
                className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-2 text-xs"
              >
                <Printer size={16} /> Imprimer
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setPrintableReceipt(null)}
                className="h-11 px-4 border border-slate-200 font-bold rounded-xl text-xs"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD / EDIT ARTICLE ─── */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setShowArticleModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white">
              {isEditingArticle ? "Modifier l'Article" : "Nouveau Produit / Article"}
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Désignation Produit *</label>
                <input 
                  type="text"
                  placeholder="Ex: BOITE ARDOISE INF"
                  value={articleForm.name}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code Produit</label>
                  <input 
                    type="text"
                    placeholder="ART-001"
                    value={articleForm.code}
                    onChange={(e) => setArticleForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-purple-500 uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Prix (F CFA) *</label>
                  <input 
                    type="number"
                    placeholder="1000"
                    value={articleForm.price}
                    onChange={(e) => setArticleForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Catégorie</label>
                  <select
                    value={articleForm.category}
                    onChange={(e) => setArticleForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                  >
                    <option value="Snacks">Snacks</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Repas">Repas</option>
                    <option value="Fournitures">Fournitures</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quantité Stock</label>
                  <input 
                    type="number"
                    value={articleForm.stock}
                    onChange={(e) => setArticleForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setShowArticleModal(false)}
                className="h-11 px-4 font-bold text-xs"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveArticle}
                className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: INVOICE DETAILS ─── */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setSelectedInvoiceDetails(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white">Détails de la Facture</h3>
            <p className="text-xs font-bold text-purple-400">{selectedInvoiceDetails.invoiceNumber}</p>

            <div className="space-y-2 text-xs font-bold bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between"><span>Client:</span> <span>{selectedInvoiceDetails.clientName}</span></div>
              <div className="flex justify-between"><span>Date:</span> <span>{new Date(selectedInvoiceDetails.createdAt).toLocaleString('fr-FR')}</span></div>
              <div className="flex justify-between"><span>Mode de Paiement:</span> <span>{selectedInvoiceDetails.paymentMethod}</span></div>
              <div className="flex justify-between"><span>Caissier:</span> <span>{selectedInvoiceDetails.cashierName || "admin"}</span></div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Articles Achetés</label>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                {JSON.parse(selectedInvoiceDetails.itemsJson || "[]").map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs font-bold">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-lg font-black text-emerald-400">
              <span>Montant Total TTC:</span>
              <span>{formatCurrency(selectedInvoiceDetails.totalTtc)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button 
                onClick={() => {
                  setPrintableReceipt(selectedInvoiceDetails);
                  setSelectedInvoiceDetails(null);
                }}
                className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs gap-2"
              >
                <Printer size={16} /> Imprimer Reçu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: FERMER CAISSE ─── */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white">Clôture de Caisse</h3>
            <p className="text-xs font-bold text-slate-400">Résumé des encaissements de la journée.</p>

            <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="flex justify-between text-xs font-bold"><span>Total Ventes Aujourd'hui:</span> <span className="text-white">{invoices.length} factures</span></div>
              <div className="flex justify-between text-xs font-bold"><span>Total Encaissé Cash:</span> <span className="text-emerald-400">{formatCurrency(invoices.filter(i => i.paymentMethod === "Cash").reduce((s, i) => s + (i.totalTtc || 0), 0))}</span></div>
              <div className="flex justify-between text-xs font-bold"><span>Total Encaissé Carte/Mobile:</span> <span className="text-blue-400">{formatCurrency(invoices.filter(i => i.paymentMethod !== "Cash").reduce((s, i) => s + (i.totalTtc || 0), 0))}</span></div>
              <div className="flex justify-between text-sm font-black text-purple-400 pt-2 border-t border-slate-800">
                <span>SOLDE GENERAL CAISSE:</span> 
                <span>{formatCurrency(invoices.reduce((s, i) => s + (i.totalTtc || 0), 0))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button 
                onClick={() => {
                  toast.success("Caisse clôturée avec succès !");
                  setShowRegisterModal(false);
                }}
                className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs gap-2"
              >
                <Lock size={16} /> Valider la Clôture
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: MODIFIER LA FACTURE ─── */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setEditingInvoice(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-black text-white">Modifier la Facture</h3>
              <p className="text-xs font-bold text-purple-400 font-mono tracking-wider">{editInvoiceForm.invoiceNumber}</p>
            </div>

            <div className="space-y-4">
              {/* Client Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nom du Client</label>
                <input 
                  type="text"
                  placeholder="Ex: CLIENT COMPTANT"
                  value={editInvoiceForm.clientName}
                  onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Mode of Payment & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Mode de Paiement</label>
                  <select
                    value={editInvoiceForm.paymentMethod}
                    onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Carte">Carte</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Crédit">Crédit</option>
                    <option value="Dépôt/Avance">Dépôt/Avance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Statut Facture</label>
                  <select
                    value={editInvoiceForm.status}
                    onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-purple-500"
                  >
                    <option value="Payée">Payée</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setEditingInvoice(null)}
                className="h-11 px-4 font-bold text-xs"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveEditedInvoice}
                className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Enregistrer Modifs
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
