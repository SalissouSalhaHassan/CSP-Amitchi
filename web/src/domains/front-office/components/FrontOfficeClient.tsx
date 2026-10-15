"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, Shield, Mail, MessageSquare, Plus, X, Check, RefreshCw,
  Clock, Search, Trash2, Edit2, AlertCircle, CheckCircle2,
  ArrowRight, FileText, Phone, BadgeCheck, UserCheck, MapPin,
  AlertTriangle, Inbox, Send, ChevronDown,
} from "lucide-react";
import {
  saveVisitor, checkoutVisitor, deleteVisitor, getAllVisitors,
  saveGatePass, returnGatePass, deleteGatePass, getGatePasses,
  saveMail, deleteMail, getMailRegistry,
  saveComplaint, resolveComplaint, deleteComplaint, getComplaints,
  getFrontOfficeKPIs,
} from "@/domains/front-office/actions/front-office.actions";

// ─── Types & Constants ────────────────────────────────────────────────────────

type Tab = "visitors" | "gatepasses" | "mail" | "complaints";

const VISITOR_TYPES = ["Parent / Tuteur", "Fournisseur", "Autorité scolaire", "Journaliste / Presse", "Candidat à l'emploi", "Autre"];
const PURPOSES = ["Retrait d'un élève", "Rencontre avec la Direction", "Paiement de frais", "Renseignements", "Dépôt de dossier", "Inspection / Contrôle", "Livraison", "Autre"];
const MAIL_TYPES = ["Entrant", "Sortant", "Interne"];
const MAIL_CATEGORIES = ["Administratif", "Pédagogique", "Financier", "Juridique / Légal", "MEN / Ministère", "Partenariat", "Autre"];
const MAIL_PRIORITIES = ["Urgent", "Normal", "Faible"];
const COMPLAINT_TYPES = ["Réclamation", "Suggestion", "Félicitation", "Autre"];
const COMPLAINT_CATEGORIES = ["Pédagogique", "Administratif", "Cantine", "Transport", "Sécurité", "Comportement enseignant", "Infrastructure", "Autre"];

function fmtDateTime(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    "En cours": "bg-blue-100 text-blue-700 border border-blue-200",
    "Sorti": "bg-orange-100 text-orange-700 border border-orange-200",
    "Retourné": "bg-green-100 text-green-700 border border-green-200",
    "Reçu": "bg-blue-100 text-blue-700",
    "En traitement": "bg-yellow-100 text-yellow-700",
    "Classé": "bg-gray-100 text-gray-600",
    "Envoyé": "bg-emerald-100 text-emerald-700",
    "Ouverte": "bg-red-100 text-red-700",
    "Résolue": "bg-green-100 text-green-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

function priorityBadge(priority: string) {
  if (priority === "Urgent") return "bg-red-100 text-red-700 border border-red-200";
  if (priority === "Normal") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-500";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialVisitors: any[];
  initialGatePasses: any[];
  initialMail: any[];
  initialComplaints: any[];
  initialKpis: any;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FrontOfficeClient({
  initialVisitors, initialGatePasses, initialMail, initialComplaints, initialKpis,
}: Props) {
  const [visitors, setVisitors] = useState<any[]>(initialVisitors);
  const [gatePasses, setGatePasses] = useState<any[]>(initialGatePasses);
  const [mail, setMail] = useState<any[]>(initialMail);
  const [complaints, setComplaints] = useState<any[]>(initialComplaints);
  const [kpis, setKpis] = useState<any>(initialKpis);

  const [activeTab, setActiveTab] = useState<Tab>("visitors");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Visitor Modal ──
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [editVisitor, setEditVisitor] = useState<any | null>(null);
  const [vForm, setVForm] = useState({
    visitorName: "", phone: "", idCardNumber: "", visitorType: "Parent / Tuteur",
    purpose: "Renseignements", meetingWith: "", studentName: "", badgeNumber: "", notes: "",
  });

  // ── Gate Pass Modal ──
  const [showGPModal, setShowGPModal] = useState(false);
  const [gpForm, setGpForm] = useState({
    studentName: "", studentClass: "", reason: "", authorizedBy: "Direction",
    parentContact: "", expectedReturnTime: "", escort: "", notes: "",
  });

  // ── Mail Modal ──
  const [showMailModal, setShowMailModal] = useState(false);
  const [editMail, setEditMail] = useState<any | null>(null);
  const [mForm, setMForm] = useState({
    mailType: "Entrant", referenceNumber: "", subject: "", senderOrRecipient: "",
    mailDate: new Date().toISOString().split("T")[0], assignedTo: "", category: "Administratif",
    priority: "Normal", status: "Reçu", notes: "",
  });

  // ── Complaint Modal ──
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [editComplaint, setEditComplaint] = useState<any | null>(null);
  const [cForm, setCForm] = useState({
    type: "Réclamation", submittedBy: "", contact: "", subject: "",
    description: "", category: "Pédagogique", priority: "Normale", assignedTo: "",
  });

  // ─── Filters ──────────────────────────────────────────────────────────────
  const filteredVisitors = useMemo(() => {
    const q = search.toLowerCase();
    return visitors.filter(v => !q || v.visitor_name?.toLowerCase().includes(q) || v.purpose?.toLowerCase().includes(q));
  }, [visitors, search]);

  const filteredGP = useMemo(() => {
    const q = search.toLowerCase();
    return gatePasses.filter(g => !q || g.student_name?.toLowerCase().includes(q) || g.reason?.toLowerCase().includes(q));
  }, [gatePasses, search]);

  const filteredMail = useMemo(() => {
    const q = search.toLowerCase();
    return mail.filter(m => !q || m.subject?.toLowerCase().includes(q) || m.sender_or_recipient?.toLowerCase().includes(q) || m.reference_number?.toLowerCase().includes(q));
  }, [mail, search]);

  const filteredComplaints = useMemo(() => {
    const q = search.toLowerCase();
    return complaints.filter(c => !q || c.subject?.toLowerCase().includes(q) || c.submitted_by?.toLowerCase().includes(q));
  }, [complaints, search]);

  // ─── Refresh ──────────────────────────────────────────────────────────────
  async function refreshAll() {
    setLoading(true);
    try {
      const [v, g, m, c, k] = await Promise.all([
        getAllVisitors(), getGatePasses(), getMailRegistry(), getComplaints(), getFrontOfficeKPIs(),
      ]);
      setVisitors((v as any)?.data ?? []);
      setGatePasses((g as any)?.data ?? []);
      setMail((m as any)?.data ?? []);
      setComplaints((c as any)?.data ?? []);
      setKpis((k as any)?.data ?? kpis);
    } finally { setLoading(false); }
  }

  // ─── Visitor Handlers ─────────────────────────────────────────────────────
  function openVisitorModal(v?: any) {
    if (v) {
      setEditVisitor(v);
      setVForm({
        visitorName: v.visitor_name ?? "", phone: v.phone ?? "", idCardNumber: v.id_card_number ?? "",
        visitorType: v.visitor_type ?? "Parent / Tuteur", purpose: v.purpose ?? "Renseignements",
        meetingWith: v.meeting_with ?? "", studentName: v.student_name ?? "",
        badgeNumber: v.badge_number ?? "", notes: v.notes ?? "",
      });
    } else {
      setEditVisitor(null);
      setVForm({ visitorName: "", phone: "", idCardNumber: "", visitorType: "Parent / Tuteur", purpose: "Renseignements", meetingWith: "", studentName: "", badgeNumber: "", notes: "" });
    }
    setShowVisitorModal(true);
  }

  async function handleSaveVisitor() {
    if (!vForm.visitorName.trim()) return toast.error("Nom du visiteur requis");
    setLoading(true);
    try {
      const res = await saveVisitor({ ...vForm, id: editVisitor?.id });
      if ((res as any)?.success) { toast.success("Visiteur enregistré !"); setShowVisitorModal(false); await refreshAll(); }
      else toast.error("Erreur");
    } finally { setLoading(false); }
  }

  async function handleCheckout(id: number) {
    setLoading(true);
    try { await checkoutVisitor(id); toast.success("Sortie enregistrée !"); await refreshAll(); }
    finally { setLoading(false); }
  }

  // ─── Gate Pass Handlers ───────────────────────────────────────────────────
  async function handleSaveGP() {
    if (!gpForm.studentName.trim() || !gpForm.reason.trim()) return toast.error("Nom de l'élève et motif requis");
    setLoading(true);
    try {
      const res = await saveGatePass({ ...gpForm });
      if ((res as any)?.success) { toast.success("Taux de sortie créé !"); setShowGPModal(false); await refreshAll(); }
    } finally { setLoading(false); }
  }

  async function handleReturnGP(id: number) {
    setLoading(true);
    try { await returnGatePass(id); toast.success("Retour enregistré !"); await refreshAll(); }
    finally { setLoading(false); }
  }

  // ─── Mail Handlers ────────────────────────────────────────────────────────
  function openMailModal(m?: any) {
    if (m) {
      setEditMail(m);
      setMForm({
        mailType: m.mail_type ?? "Entrant", referenceNumber: m.reference_number ?? "",
        subject: m.subject ?? "", senderOrRecipient: m.sender_or_recipient ?? "",
        mailDate: m.mail_date ? new Date(m.mail_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        assignedTo: m.assigned_to ?? "", category: m.category ?? "Administratif",
        priority: m.priority ?? "Normal", status: m.status ?? "Reçu", notes: m.notes ?? "",
      });
    } else {
      setEditMail(null);
      setMForm({ mailType: "Entrant", referenceNumber: "", subject: "", senderOrRecipient: "", mailDate: new Date().toISOString().split("T")[0], assignedTo: "", category: "Administratif", priority: "Normal", status: "Reçu", notes: "" });
    }
    setShowMailModal(true);
  }

  async function handleSaveMail() {
    if (!mForm.subject.trim() || !mForm.senderOrRecipient.trim()) return toast.error("Objet et expéditeur/destinataire requis");
    setLoading(true);
    try {
      const res = await saveMail({ ...mForm, id: editMail?.id });
      if ((res as any)?.success) { toast.success("Courrier enregistré !"); setShowMailModal(false); await refreshAll(); }
    } finally { setLoading(false); }
  }

  // ─── Complaint Handlers ───────────────────────────────────────────────────
  function openComplaintModal(c?: any) {
    if (c) {
      setEditComplaint(c);
      setCForm({
        type: c.type ?? "Réclamation", submittedBy: c.submitted_by ?? "", contact: c.contact ?? "",
        subject: c.subject ?? "", description: c.description ?? "",
        category: c.category ?? "Pédagogique", priority: c.priority ?? "Normale", assignedTo: c.assigned_to ?? "",
      });
    } else {
      setEditComplaint(null);
      setCForm({ type: "Réclamation", submittedBy: "", contact: "", subject: "", description: "", category: "Pédagogique", priority: "Normale", assignedTo: "" });
    }
    setShowComplaintModal(true);
  }

  async function handleSaveComplaint() {
    if (!cForm.submittedBy.trim() || !cForm.subject.trim() || !cForm.description.trim())
      return toast.error("Champs obligatoires manquants");
    setLoading(true);
    try {
      const res = await saveComplaint({ ...cForm, id: editComplaint?.id });
      if ((res as any)?.success) { toast.success("Enregistré !"); setShowComplaintModal(false); await refreshAll(); }
    } finally { setLoading(false); }
  }

  async function handleResolve(id: number) {
    const notes = prompt("Notes de résolution :");
    if (notes === null) return;
    setLoading(true);
    try { await resolveComplaint(id, notes); toast.success("Réclamation résolue !"); await refreshAll(); }
    finally { setLoading(false); }
  }

  // ─── Tabs Config ──────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any; count: number; color: string }[] = [
    { id: "visitors", label: "🚶 Visiteurs du Jour", icon: Users, count: kpis.visitorsToday, color: "text-blue-600" },
    { id: "gatepasses", label: "🔑 Sorties Élèves (Gate Pass)", icon: Shield, count: kpis.activeGatePasses, color: "text-orange-600" },
    { id: "mail", label: "📬 Registre Courrier", icon: Mail, count: kpis.pendingMail, color: "text-emerald-600" },
    { id: "complaints", label: "📝 Réclamations & Suggestions", icon: MessageSquare, count: kpis.openComplaints, color: "text-purple-600" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 text-white px-6 py-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BadgeCheck className="w-7 h-7" /> Accueil & Front Office
              </h1>
              <p className="text-violet-200 text-sm mt-1">Visiteurs · Sorties Élèves · Courrier Administratif · Réclamations</p>
            </div>
            <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Visiteurs aujourd'hui", value: kpis.visitorsToday, icon: Users, color: "from-blue-500/20 to-blue-600/20" },
              { label: "Élèves sortis (actifs)", value: kpis.activeGatePasses, icon: Shield, color: "from-orange-500/20 to-red-500/20" },
              { label: "Courriers en attente", value: kpis.pendingMail, icon: Inbox, color: "from-emerald-500/20 to-green-500/20" },
              { label: "Réclamations ouvertes", value: kpis.openComplaints, icon: AlertCircle, color: "from-purple-500/20 to-pink-500/20" },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.color} backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center`}>
                <k.icon className="w-5 h-5 mx-auto mb-1 text-white/80" />
                <div className="text-2xl font-bold text-white">{k.value}</div>
                <div className="text-xs text-violet-200">{k.label}</div>
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
              onClick={() => { setActiveTab(t.id); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id ? "border-violet-600 text-violet-700 bg-violet-50/50" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Search + Action toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {activeTab === "visitors" && (
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => openVisitorModal()}>
              <Plus className="w-4 h-4 mr-1" /> Nouveau Visiteur
            </Button>
          )}
          {activeTab === "gatepasses" && (
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { setShowGPModal(true); setGpForm({ studentName: "", studentClass: "", reason: "", authorizedBy: "Direction", parentContact: "", expectedReturnTime: "", escort: "", notes: "" }); }}>
              <Plus className="w-4 h-4 mr-1" /> Nouveau Gate Pass
            </Button>
          )}
          {activeTab === "mail" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openMailModal()}>
              <Plus className="w-4 h-4 mr-1" /> Enregistrer Courrier
            </Button>
          )}
          {activeTab === "complaints" && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => openComplaintModal()}>
              <Plus className="w-4 h-4 mr-1" /> Nouvelle Réclamation
            </Button>
          )}
        </div>

        {/* ═══════ TAB 1: VISITORS ═══════ */}
        {activeTab === "visitors" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Visiteur</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type / Motif</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Rencontre avec</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Entrée</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Sortie</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Aucun visiteur enregistré aujourd'hui
                    </td></tr>
                  ) : filteredVisitors.map(v => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{v.visitor_name}</div>
                        {v.phone && <div className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</div>}
                        {v.id_card_number && <div className="text-xs text-gray-400">CNI: {v.id_card_number}</div>}
                        {v.badge_number && <div className="text-xs text-violet-600 font-medium">Badge: {v.badge_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full inline-block mb-1">{v.visitor_type}</div>
                        <div className="text-sm text-gray-700">{v.purpose}</div>
                        {v.student_name && <div className="text-xs text-gray-400">Élève: {v.student_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.meeting_with ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm font-bold text-gray-700">{v.time_in ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {v.time_out
                          ? <span className="font-mono text-sm text-gray-500">{v.time_out}</span>
                          : <button onClick={() => handleCheckout(v.id)} className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1 mx-auto">
                              <ArrowRight className="w-3 h-3" /> Sortie
                            </button>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(v.status ?? "En cours")}`}>{v.status ?? "En cours"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openVisitorModal(v)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { await deleteVisitor(v.id); await refreshAll(); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════ TAB 2: GATE PASS ═══════ */}
        {activeTab === "gatepasses" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">N° Pass</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Élève</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Motif</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Autorisé par</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Heure Sortie</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Retour prévu</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGP.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                      <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Aucun taux de sortie enregistré
                    </td></tr>
                  ) : filteredGP.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-orange-700 text-xs">{g.pass_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{g.student_name}</div>
                        <div className="text-xs text-gray-400">{g.student_class ?? ""}</div>
                        {g.parent_contact && <div className="text-xs text-gray-400"><Phone className="w-3 h-3 inline mr-1" />{g.parent_contact}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">{g.reason}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{g.authorized_by}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{fmtDateTime(g.exit_time)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{fmtDateTime(g.expected_return_time)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(g.status)}`}>{g.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {g.status === "Sorti" && (
                            <button onClick={() => handleReturnGP(g.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Retour
                            </button>
                          )}
                          <button onClick={async () => { await deleteGatePass(g.id); await refreshAll(); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════ TAB 3: MAIL REGISTRY ═══════ */}
        {activeTab === "mail" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Référence</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Objet</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Expéditeur / Destinataire</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Priorité</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigné à</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMail.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                      <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Aucun courrier enregistré
                    </td></tr>
                  ) : filteredMail.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-emerald-700">{m.reference_number}</div>
                        <div className="text-xs text-gray-400">{fmtDate(m.mail_date)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${m.mail_type === "Entrant" ? "bg-blue-100 text-blue-700" : m.mail_type === "Sortant" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                          {m.mail_type === "Entrant" ? <><Inbox className="w-3 h-3 inline mr-0.5" />Entrant</> : m.mail_type === "Sortant" ? <><Send className="w-3 h-3 inline mr-0.5" />Sortant</> : "Interne"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 max-w-xs">{m.subject}</div>
                        <div className="text-xs text-gray-400">{m.category}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.sender_or_recipient}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityBadge(m.priority ?? "Normal")}`}>{m.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(m.status)}`}>{m.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.assigned_to ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openMailModal(m)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { await deleteMail(m.id); await refreshAll(); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════ TAB 4: COMPLAINTS ═══════ */}
        {activeTab === "complaints" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Soumis par</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Objet</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Priorité</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Aucune réclamation enregistrée
                    </td></tr>
                  ) : filteredComplaints.map(c => (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${c.status === "Ouverte" && c.priority === "Urgent" ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${c.type === "Réclamation" ? "bg-red-100 text-red-700" : c.type === "Suggestion" ? "bg-blue-100 text-blue-700" : c.type === "Félicitation" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.submitted_by}</div>
                        {c.contact && <div className="text-xs text-gray-400">{c.contact}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 max-w-xs">{c.subject}</div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">{c.description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityBadge(c.priority ?? "Normale")}`}>{c.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(c.status)}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {c.status === "Ouverte" && (
                            <button onClick={() => handleResolve(c.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Résoudre
                            </button>
                          )}
                          <button onClick={() => openComplaintModal(c)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { await deleteComplaint(c.id); await refreshAll(); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* Visitor Modal */}
      {showVisitorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editVisitor ? "Modifier le Visiteur" : "Enregistrer un Visiteur"}</h3>
              <button onClick={() => setShowVisitorModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom & Prénom *</label>
                <Input value={vForm.visitorName} onChange={e => setVForm(f => ({ ...f, visitorName: e.target.value }))} placeholder="Nom complet du visiteur" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                <Input value={vForm.phone} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} placeholder="+227 ..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">N° CNI / Pièce d'identité</label>
                <Input value={vForm.idCardNumber} onChange={e => setVForm(f => ({ ...f, idCardNumber: e.target.value }))} placeholder="ex: NE-12345678" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type de visiteur</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vForm.visitorType} onChange={e => setVForm(f => ({ ...f, visitorType: e.target.value }))}>
                  {VISITOR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Motif de visite *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vForm.purpose} onChange={e => setVForm(f => ({ ...f, purpose: e.target.value }))}>
                  {PURPOSES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Rencontre avec</label>
                <Input value={vForm.meetingWith} onChange={e => setVForm(f => ({ ...f, meetingWith: e.target.value }))} placeholder="Directeur / Enseignant / Caissier..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom de l'élève concerné</label>
                <Input value={vForm.studentName} onChange={e => setVForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Si applicable..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">N° Badge remis</label>
                <Input value={vForm.badgeNumber} onChange={e => setVForm(f => ({ ...f, badgeNumber: e.target.value }))} placeholder="ex: V-042" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vForm.notes} onChange={e => setVForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVisitorModal(false)}>Annuler</Button>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSaveVisitor} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gate Pass Modal */}
      {showGPModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Shield className="w-5 h-5 text-orange-600" /> Taux de Sortie (Gate Pass)</h3>
              <button onClick={() => setShowGPModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom de l'élève *</label>
                <Input value={gpForm.studentName} onChange={e => setGpForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Nom complet" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Classe</label>
                <Input value={gpForm.studentClass} onChange={e => setGpForm(f => ({ ...f, studentClass: e.target.value }))} placeholder="ex: 3ème A" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contact parent</label>
                <Input value={gpForm.parentContact} onChange={e => setGpForm(f => ({ ...f, parentContact: e.target.value }))} placeholder="+227 ..." />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Motif de sortie *</label>
                <Input value={gpForm.reason} onChange={e => setGpForm(f => ({ ...f, reason: e.target.value }))} placeholder="ex: Consultation médicale, Deuil familial..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Autorisé par</label>
                <Input value={gpForm.authorizedBy} onChange={e => setGpForm(f => ({ ...f, authorizedBy: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Retour prévu</label>
                <Input type="datetime-local" value={gpForm.expectedReturnTime} onChange={e => setGpForm(f => ({ ...f, expectedReturnTime: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Accompagné par</label>
                <Input value={gpForm.escort} onChange={e => setGpForm(f => ({ ...f, escort: e.target.value }))} placeholder="Nom du responsable accompagnateur" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <Input value={gpForm.notes} onChange={e => setGpForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowGPModal(false)}>Annuler</Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSaveGP} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Shield className="w-4 h-4 mr-1" />} Émettre le Pass
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mail Modal */}
      {showMailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editMail ? "Modifier le Courrier" : "Enregistrer un Courrier"}</h3>
              <button onClick={() => setShowMailModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={mForm.mailType} onChange={e => setMForm(f => ({ ...f, mailType: e.target.value }))}>
                  {MAIL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">N° Référence</label>
                <Input value={mForm.referenceNumber} onChange={e => setMForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Auto-généré si vide" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Objet *</label>
                <Input value={mForm.subject} onChange={e => setMForm(f => ({ ...f, subject: e.target.value }))} placeholder="Objet du courrier" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">{mForm.mailType === "Entrant" ? "Expéditeur" : "Destinataire"} *</label>
                <Input value={mForm.senderOrRecipient} onChange={e => setMForm(f => ({ ...f, senderOrRecipient: e.target.value }))} placeholder="Nom / Organisme" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date du courrier</label>
                <Input type="date" value={mForm.mailDate} onChange={e => setMForm(f => ({ ...f, mailDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Catégorie</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={mForm.category} onChange={e => setMForm(f => ({ ...f, category: e.target.value }))}>
                  {MAIL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Priorité</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={mForm.priority} onChange={e => setMForm(f => ({ ...f, priority: e.target.value }))}>
                  {MAIL_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Assigné à</label>
                <Input value={mForm.assignedTo} onChange={e => setMForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Nom du responsable" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={mForm.notes} onChange={e => setMForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMailModal(false)}>Annuler</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveMail} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editComplaint ? "Modifier" : "Nouvelle Réclamation / Suggestion"}</h3>
              <button onClick={() => setShowComplaintModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cForm.type} onChange={e => setCForm(f => ({ ...f, type: e.target.value }))}>
                  {COMPLAINT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Priorité</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cForm.priority} onChange={e => setCForm(f => ({ ...f, priority: e.target.value }))}>
                  {["Urgente", "Normale", "Faible"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Soumis par *</label>
                <Input value={cForm.submittedBy} onChange={e => setCForm(f => ({ ...f, submittedBy: e.target.value }))} placeholder="Nom du parent / élève / enseignant" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contact</label>
                <Input value={cForm.contact} onChange={e => setCForm(f => ({ ...f, contact: e.target.value }))} placeholder="Tél / Email" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Objet *</label>
                <Input value={cForm.subject} onChange={e => setCForm(f => ({ ...f, subject: e.target.value }))} placeholder="Résumé de la réclamation" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Catégorie</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))}>
                  {COMPLAINT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Assigné à</label>
                <Input value={cForm.assignedTo} onChange={e => setCForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Responsable" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description complète *</label>
                <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cForm.description} onChange={e => setCForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez en détail la réclamation ou suggestion..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowComplaintModal(false)}>Annuler</Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveComplaint} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
