"use client";

import { useState, useRef, useTransition, useOptimistic, useCallback } from "react";
import {
  MessageSquare, Mail, Send, Trash2, Plus, Users, GraduationCap,
  Briefcase, ChevronRight, ShieldCheck, Eye, ChevronDown, Bold,
  Italic, Link2, Smile, Code2, CheckCircle2, Clock, TrendingUp,
  Info, X, Pencil, LayoutGrid, Calendar, Bell, Star, Zap,
  Hash, FileText, BarChart3, RefreshCw, Filter, Search,
  AlertCircle, ArrowRight, Sparkles, ChevronUp, Edit3,
  Copy, BookTemplate, CalendarClock, UserCheck, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendMessage,
  saveMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  scheduleMessage,
  cancelScheduledMessage,
} from "@/domains/messaging/actions/messaging.actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "composer" | "modeles" | "planifie" | "historique";
type Channel = "SMS" | "Email" | "WhatsApp";
type TargetKey = "parents" | "classe" | "staff" | "all" | "test";

interface Template {
  id: number; title: string; msgType: string;
  content: string; category?: string | null; createdAt?: Date | null;
}
interface LogEntry {
  id: number; msgType: string; targetAudience: string; subject?: string | null;
  content: string; status: string | null; sentBy: string | null;
  sentAt: Date | null; recipientCount?: number | null;
}
interface ScheduledMsg {
  id: number; msgType: string; targetAudience: string; subject?: string | null;
  content: string; scheduledAt: Date; status: string | null; createdBy?: string | null;
}
interface Stats {
  totalSMS?: number; totalEmail?: number; monthSMS?: number; monthEmail?: number;
  todaySMS?: number; todayEmail?: number; templateCount?: number;
  studentCount?: number; staffCount?: number;
}
interface Props {
  templates: Template[]; logs: LogEntry[];
  stats: Stats; scheduled: ScheduledMsg[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const VARS = ["{nom}", "{classe}", "{date}", "{ecole}", "{montant}", "{telephone}"];
const TARGETS: { key: TargetKey; label: string; sub: string; icon: React.ReactNode; color: string }[] = [
  { key: "parents", label: "Tous les Parents", sub: "Envoyer à tous les parents", icon: <Users size={18} />, color: "indigo" },
  { key: "classe",  label: "Classe Spécifique", sub: "Sélectionner une classe", icon: <GraduationCap size={18} />, color: "violet" },
  { key: "staff",   label: "Tout le Personnel", sub: "Envoyer à tout le staff", icon: <Briefcase size={18} />, color: "blue" },
  { key: "all",     label: "Tous (Parents + Staff)", sub: "Diffusion générale", icon: <Users size={18} />, color: "purple" },
  { key: "test",    label: "Numéro de Test", sub: "Envoi de test individuel", icon: <CheckCircle2 size={18} />, color: "emerald" },
];
const SMART_TEMPLATES = [
  { icon: "💰", title: "Rappel de frais", category: "Finance", content: "Cher(e) parent de {nom},\n\nNous vous informons qu'un solde de frais scolaires est en attente de règlement.\n\nMerci de vous rapprocher de l'administration.\n\n{ecole}" },
  { icon: "📅", title: "Absence signalée", category: "Absence", content: "Cher(e) parent,\n\nVotre enfant {nom} de la classe {classe} était absent(e) le {date}.\n\nVeuillez contacter l'administration pour tout renseignement.\n\n{ecole}" },
  { icon: "🎓", title: "Réunion parents", category: "Événement", content: "Cher(e) parent,\n\nNous vous convions à la réunion parents-professeurs le {date}.\nVotre présence est vivement souhaitée.\n\n{ecole}" },
  { icon: "📊", title: "Résultats disponibles", category: "Académique", content: "Cher(e) parent de {nom},\n\nLes résultats du trimestre sont disponibles. Rendez-vous sur votre espace parent ou contactez-nous.\n\n{ecole}" },
];
const CATEGORY_COLORS: Record<string, string> = {
  "Général": "slate", "Finance": "emerald", "Absence": "rose",
  "Événement": "amber", "Académique": "indigo",
};

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Micro Components ─────────────────────────────────────────────────────────

function Sparkline({ color, data }: { color: string; data: number[] }) {
  const w = 100, h = 40;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
    return `${x},${y}`;
  }).join(" ");
  const area = `M ${pts.split(" ")[0]} L ${pts} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-9" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gl-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#gl-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ icon, bg, label, value, sub, trend, trendUp, sparkData, sparkColor }: {
  icon: React.ReactNode; bg: string; label: string; value: number | string;
  sub: string; trend?: string; trendUp?: boolean;
  sparkData?: number[]; sparkColor?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none tabular-nums">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-slate-400">{sub}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-bold ${trendUp ? "text-emerald-500" : "text-rose-500"}`}>
              {trendUp ? <TrendingUp size={10} /> : <ChevronDown size={10} />}
              {trend}
            </span>
          )}
        </div>
      </div>
      {sparkData && sparkColor && (
        <div className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          <Sparkline color={sparkColor} data={sparkData} />
        </div>
      )}
    </div>
  );
}

function Badge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    SMS: "bg-indigo-50 text-indigo-600",
    Email: "bg-purple-50 text-purple-600",
    WhatsApp: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black", colors[type] || "bg-slate-50 text-slate-500")}>
      {type === "SMS" ? <MessageSquare size={9} /> : type === "Email" ? <Mail size={9} /> : <MessageCircle size={9} />}
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (status === "Envoyé" || status === "En attente" && false)
    return <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={12} className="text-emerald-500" />Envoyé</span>;
  if (status === "En attente")
    return <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock size={12} className="text-amber-500" />En attente</span>;
  if (status === "Annulé")
    return <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><X size={12} />Annulé</span>;
  return <span className="flex items-center gap-1 text-xs font-bold text-rose-600"><AlertCircle size={12} />Échoué</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MessagerieUI({ templates: initTemplates, logs, stats, scheduled: initScheduled }: Props) {
  const [tab, setTab] = useState<Tab>("composer");
  const [channel, setChannel] = useState<Channel>("SMS");
  const [targetKey, setTargetKey] = useState<TargetKey>("parents");
  const [testRecipient, setTestRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [filterType, setFilterType] = useState("Tous");
  const [searchLog, setSearchLog] = useState("");

  // Templates state
  const [templates, setTemplates] = useState<Template[]>(initTemplates);
  const [showTplForm, setShowTplForm] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);
  const [tplTitle, setTplTitle] = useState("");
  const [tplContent, setTplContent] = useState("");
  const [tplType, setTplType] = useState<Channel>("SMS");
  const [tplCategory, setTplCategory] = useState("Général");

  // Schedule state
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>(initScheduled);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();

  const charCount = message.length;
  const smsUnits = Math.max(1, Math.ceil(charCount / 160));
  const targetObj = TARGETS.find(t => t.key === targetKey)!;
  const targetLabel = targetObj.label;

  const estimatedRecipients = (() => {
    if (targetKey === "test") return 1;
    if (targetKey === "parents") return stats.studentCount || 0;
    if (targetKey === "staff") return stats.staffCount || 0;
    if (targetKey === "all") return (stats.studentCount || 0) + (stats.staffCount || 0);
    return 30; // classe
  })();

  // ── Insert variable ──
  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) { setMessage(m => m + v); return; }
    const s = ta.selectionStart ?? message.length;
    const e = ta.selectionEnd ?? message.length;
    
    const isWrap = v === "**" || v === "_" || v === "*";
    let next = "";
    let cursorPosition = s + v.length;

    if (isWrap) {
      const selectedText = message.slice(s, e);
      if (selectedText) {
        next = message.slice(0, s) + v + selectedText + v + message.slice(e);
        cursorPosition = e + (v.length * 2);
      } else {
        next = message.slice(0, s) + v + v + message.slice(e);
        cursorPosition = s + v.length;
      }
    } else {
      next = message.slice(0, s) + v + message.slice(e);
      cursorPosition = s + v.length;
    }

    setMessage(next);
    setTimeout(() => { 
      ta.focus(); 
      ta.selectionStart = ta.selectionEnd = cursorPosition; 
    }, 0);
    setShowVars(false);
  };

  // ── Send ──
  const handleSend = async () => {
    if (!message.trim()) { toast.error("Le message est vide !"); return; }
    if (channel === "Email" && !subject.trim()) { toast.error("L'objet de l'email est requis."); return; }
    if (targetKey === "test" && !testRecipient.trim()) { toast.error("Le destinataire de test est requis."); return; }
    setSending(true);
    try {
      const res = await sendMessage({
        msgType: channel, targetAudience: targetLabel,
        content: message, subject: subject || undefined,
        recipientCount: estimatedRecipients,
        testRecipient: targetKey === "test" ? testRecipient : undefined,
      });
      if ((res as any)?.error) { toast.error((res as any).error); }
      else {
        toast.success(`✅ ${channel} envoyé à ${estimatedRecipients} destinataires !`);
        setMessage(""); setSubject(""); setTestRecipient(""); setShowPreview(false);
      }
    } catch { toast.error("Erreur lors de l'envoi."); }
    setSending(false);
  };

  // ── Schedule ──
  const handleSchedule = async () => {
    if (!message.trim()) { toast.error("Message vide !"); return; }
    if (!scheduleDate || !scheduleTime) { toast.error("Veuillez choisir la date et l'heure."); return; }
    const scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
    startTransition(async () => {
      const res = await scheduleMessage({
        msgType: channel, targetAudience: targetLabel,
        content: message, subject: subject || undefined, scheduledAt,
      });
      if ((res as any)?.error) { toast.error((res as any).error); }
      else {
        toast.success("Message planifié avec succès !");
        setShowScheduleForm(false); setScheduleDate(""); setScheduleTime("");
      }
    });
  };

  // ── Template CRUD ──
  const openNewTpl = () => {
    setEditingTpl(null); setTplTitle(""); setTplContent("");
    setTplType("SMS"); setTplCategory("Général"); setShowTplForm(true);
  };
  const openEditTpl = (t: Template) => {
    setEditingTpl(t); setTplTitle(t.title); setTplContent(t.content);
    setTplType(t.msgType as Channel); setTplCategory(t.category || "Général");
    setShowTplForm(true);
  };
  const handleSaveTpl = async () => {
    if (!tplTitle.trim() || !tplContent.trim()) { toast.error("Titre et contenu requis."); return; }
    startTransition(async () => {
      if (editingTpl) {
        const res = await updateMessageTemplate(editingTpl.id, { title: tplTitle, msgType: tplType, content: tplContent, category: tplCategory });
        if ((res as any)?.error) toast.error((res as any).error);
        else {
          setTemplates(ts => ts.map(t => t.id === editingTpl.id ? { ...t, title: tplTitle, msgType: tplType, content: tplContent, category: tplCategory } : t));
          toast.success("Modèle mis à jour !"); setShowTplForm(false);
        }
      } else {
        const res = await saveMessageTemplate({ title: tplTitle, msgType: tplType, content: tplContent, category: tplCategory });
        if ((res as any)?.error) toast.error((res as any).error);
        else {
          setTemplates(ts => [{ id: Date.now(), title: tplTitle, msgType: tplType, content: tplContent, category: tplCategory }, ...ts]);
          toast.success("Modèle enregistré !"); setShowTplForm(false);
        }
      }
    });
  };
  const handleDeleteTpl = async (id: number) => {
    startTransition(async () => {
      const res = await deleteMessageTemplate(id);
      if ((res as any)?.error) toast.error((res as any).error);
      else { setTemplates(ts => ts.filter(t => t.id !== id)); toast.success("Modèle supprimé."); }
    });
  };
  const useTpl = (t: Template) => {
    setMessage(t.content); setChannel(t.msgType as Channel); setTab("composer");
    toast.success(`Modèle "${t.title}" chargé ✓`);
  };
  const copyTpl = (t: Template) => {
    navigator.clipboard.writeText(t.content);
    toast.success("Contenu copié !");
  };

  const handleCancelScheduled = async (id: number) => {
    startTransition(async () => {
      const res = await cancelScheduledMessage(id);
      if ((res as any)?.error) toast.error((res as any).error);
      else {
        setScheduled(s => s.map(m => m.id === id ? { ...m, status: "Annulé" } : m));
        toast.success("Message annulé.");
      }
    });
  };

  // Filtered logs
  const filteredLogs = logs.filter(l => {
    const matchType = filterType === "Tous" || l.msgType === filterType;
    const matchSearch = !searchLog || l.targetAudience.toLowerCase().includes(searchLog.toLowerCase()) || l.content.toLowerCase().includes(searchLog.toLowerCase());
    return matchType && matchSearch;
  });

  const tabItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "composer",   label: "COMPOSER",   icon: <Pencil size={13} /> },
    { id: "modeles",    label: "MODÈLES",    icon: <LayoutGrid size={13} />, badge: templates.length },
    { id: "planifie",   label: "PLANIFIÉS",  icon: <CalendarClock size={13} />, badge: scheduled.filter(s => s.status === "En attente").length || undefined },
    { id: "historique", label: "HISTORIQUE", icon: <Clock size={13} />, badge: logs.length || undefined },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <MessageSquare size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Messagerie</h1>
            <p className="text-slate-400 text-sm mt-0.5">Centre de communication · SMS & Email</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTab("composer"); setShowScheduleForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <CalendarClock size={15} className="text-indigo-500" />
            Planifier
          </button>
          <button
            onClick={() => setTab("composer")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            <Send size={15} />
            Nouveau Message
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare size={22} className="text-indigo-600" />} bg="bg-indigo-50"
          label="SMS ce mois" value={stats.monthSMS ?? 0} sub={`+${stats.todaySMS ?? 0} aujourd'hui`}
          trend="+12%" trendUp
          sparkData={[20,35,28,45,40,55,50,65,60,75,70,stats.monthSMS ?? 80]}
          sparkColor="#6366f1"
        />
        <StatCard
          icon={<Mail size={22} className="text-purple-600" />} bg="bg-purple-50"
          label="Emails ce mois" value={stats.monthEmail ?? 0} sub={`+${stats.todayEmail ?? 0} aujourd'hui`}
          trend="+8%" trendUp
          sparkData={[10,20,18,30,25,40,35,48,42,55,50,stats.monthEmail ?? 60]}
          sparkColor="#9333ea"
        />
        <StatCard
          icon={<LayoutGrid size={22} className="text-amber-600" />} bg="bg-amber-50"
          label="Modèles" value={stats.templateCount ?? templates.length}
          sub="Disponibles" />
        <StatCard
          icon={<Users size={22} className="text-emerald-600" />} bg="bg-emerald-50"
          label="Destinataires" value={(stats.studentCount ?? 0) + (stats.staffCount ?? 0)}
          sub={`${stats.studentCount ?? 0} élèves · ${stats.staffCount ?? 0} staff`}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm">
        {tabItems.map(({ id, label, icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all relative",
              tab === id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            {icon} {label}
            {badge !== undefined && badge > 0 && (
              <span className={cn(
                "min-w-5 h-5 px-1 rounded-full text-[10px] font-black grid place-items-center",
                tab === id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
              )}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ COMPOSER ══════════════ */}
      {tab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left: Config */}
          <div className="lg:col-span-4 space-y-4">

            {/* Cible */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={13} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible de l&apos;envoi</span>
              </div>
              {TARGETS.map(({ key, label, sub, icon, color }) => (
                <button
                  key={key}
                  onClick={() => setTargetKey(key)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left",
                    targetKey === key
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                    targetKey === key ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", targetKey === key ? "text-indigo-700" : "text-slate-700")}>{label}</p>
                    <p className="text-xs text-slate-400 truncate">{sub}</p>
                  </div>
                  {targetKey === key && <CheckCircle2 size={15} className="text-indigo-500 flex-shrink-0" />}
                </button>
              ))}

              {targetKey === "test" && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                  <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Numéro / Email de Test</label>
                  <input
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder={channel === "Email" ? "exemple@mail.com" : "+227 90 00 00 00"}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                  />
                </div>
              )}

              {/* Recipient count */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <UserCheck size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-600">
                  ~<span className="text-indigo-600 text-sm">{estimatedRecipients}</span> destinataires estimés
                </span>
              </div>
            </div>

            {/* Canal */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Send size={13} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal de communication</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["SMS", "Email", "WhatsApp"] as Channel[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      channel === c
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "border-slate-100 text-slate-500 hover:border-indigo-200"
                    )}
                  >
                    {channel === c && <CheckCircle2 size={12} className="absolute top-2 right-2 text-white/80" />}
                    {c === "SMS" ? <MessageSquare size={22} /> : c === "Email" ? <Mail size={22} /> : <MessageCircle size={22} />}
                    <span className="text-sm font-black">{c}</span>
                    <span className={cn("text-[10px]", channel === c ? "text-indigo-200" : "text-slate-400")}>
                      {c === "SMS" ? "Rapide & direct" : c === "Email" ? "Détaillé & formel" : "Instantané & gratuit"}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">Communication sécurisée</span>
              </div>
            </div>

            {/* Smart templates shortcut */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modèles rapides</span>
              </div>
              <div className="space-y-2">
                {SMART_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setMessage(t.content); toast.success(`"${t.title}" chargé`); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-left transition-all group"
                  >
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400">{t.category}</p>
                    </div>
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">

              {/* Editor header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenu du message</span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowVars(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Hash size={12} className="text-indigo-500" />
                    Variables
                    <ChevronDown size={11} className={cn("transition-transform", showVars && "rotate-180")} />
                  </button>
                  {showVars && (
                    <div className="absolute right-0 top-9 z-30 bg-white rounded-2xl border border-slate-100 shadow-2xl p-3 w-52 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pb-1">Cliquer pour insérer</p>
                      {VARS.map(v => (
                        <button
                          key={v}
                          onClick={() => insertVar(v)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject (email) */}
              {channel === "Email" && (
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Objet de l'email..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-slate-50"
                />
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 rounded-xl border border-slate-100 bg-slate-50 flex-wrap">
                {[
                  { Icon: Bold, action: () => insertVar("**") },
                  { Icon: Italic, action: () => insertVar("_") },
                  { Icon: Link2, action: () => insertVar("https://") },
                  { Icon: Smile, action: () => insertVar("😊") },
                ].map(({ Icon, action }, i) => (
                  <button key={i} onClick={action} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition-colors">
                    <Icon size={13} />
                  </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <span className="text-[10px] text-slate-400 font-bold">FORMAT</span>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tapez votre message ici... Utilisez {nom}, {classe}, {date} pour personnaliser."
                className="w-full min-h-[180px] resize-none rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-medium leading-relaxed transition-all"
              />

              {/* Counter */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400">
                    <span className={cn(charCount > 160 && channel === "SMS" ? "text-amber-500" : "text-slate-400")}>{charCount}</span> / 160 caractères
                  </span>
                  {channel === "SMS" && (
                    <span className={cn("text-[11px] font-bold", smsUnits > 1 ? "text-amber-500" : "text-slate-400")}>
                      = {smsUnits} SMS
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-300 font-medium">
                  Cible: <strong className="text-indigo-400">{targetLabel}</strong>
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Eye size={15} />
                  {showPreview ? "Masquer" : "Aperçu"}
                </button>

                {/* Schedule button */}
                <button
                  onClick={() => setShowScheduleForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-amber-50 hover:border-amber-200 transition-all"
                >
                  <CalendarClock size={15} className="text-amber-500" />
                  Planifier
                </button>

                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  {sending ? "Envoi en cours..." : `ENVOYER (${estimatedRecipients} dest.)`}
                </button>
              </div>

              {/* Tip */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  Utilisez les variables pour personnaliser chaque message. Le mot <code className="font-mono bg-amber-100 px-1 rounded">{"{nom}"}</code> sera remplacé par le prénom de chaque destinataire.
                </p>
              </div>
            </div>

            {/* Schedule Form */}
            {showScheduleForm && (
              <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-amber-500" />
                    <h3 className="font-black text-slate-800">Planifier l&apos;envoi</h3>
                  </div>
                  <button onClick={() => setShowScheduleForm(false)} className="text-slate-300 hover:text-slate-500"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Date d&apos;envoi</label>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Heure d&apos;envoi</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                </div>
                <button
                  onClick={handleSchedule}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all disabled:opacity-50"
                >
                  {isPending ? "Planification..." : "✓ Confirmer la planification"}
                </button>
              </div>
            )}

            {/* Preview */}
            {showPreview && message && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Aperçu · Exemple</span>
                  <button onClick={() => setShowPreview(false)} className="text-slate-300 hover:text-slate-500"><X size={15} /></button>
                </div>
                {channel === "Email" && subject && (
                  <p className="text-xs font-bold text-slate-500">Objet: <span className="text-slate-800">{subject}</span></p>
                )}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4 border border-indigo-100">
                  <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                    {message
                      .replace("{nom}", "Ahmed Benali")
                      .replace("{classe}", "6ème A")
                      .replace("{date}", new Date().toLocaleDateString("fr-FR"))
                      .replace("{ecole}", "École Primaire Al-Nour")
                      .replace("{montant}", "15 000 FCFA")
                      .replace("{telephone}", "+221 77 000 0000")}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  Exemple avec: <strong className="text-slate-600">Ahmed Benali</strong> · Classe <strong className="text-slate-600">6ème A</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ MODÈLES ══════════════ */}
      {tab === "modeles" && (
        <div className="space-y-5">
          {/* Form */}
          {showTplForm && (
            <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-lg">
                  {editingTpl ? "Modifier le modèle" : "Nouveau modèle"}
                </h3>
                <button onClick={() => setShowTplForm(false)} className="text-slate-300 hover:text-slate-500"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Titre du modèle</label>
                  <input value={tplTitle} onChange={e => setTplTitle(e.target.value)}
                    placeholder="Ex: Rappel de frais scolaires"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Type</label>
                  <div className="flex gap-2">
                    {(["SMS", "Email", "WhatsApp"] as Channel[]).map(c => (
                      <button key={c} onClick={() => setTplType(c)}
                        className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                          tplType === c ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-indigo-200")}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Catégorie</label>
                  <select value={tplCategory} onChange={e => setTplCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Contenu</label>
                <textarea value={tplContent} onChange={e => setTplContent(e.target.value)}
                  placeholder="Contenu du modèle... Variables: {nom}, {classe}, {date}, {ecole}, {montant}" rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowTplForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>
                <button onClick={handleSaveTpl} disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-all">
                  {isPending ? "Enregistrement..." : editingTpl ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {["Tous", ...Object.keys(CATEGORY_COLORS)].map(cat => (
              <button key={cat}
                className="px-4 py-2 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                {cat}
              </button>
            ))}
            <button onClick={openNewTpl}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Plus size={15} /> Nouveau modèle
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* New card */}
            <button onClick={openNewTpl}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors shadow-sm">
                <Plus size={28} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Nouveau Modèle</p>
            </button>

            {templates.map(t => (
              <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-100 transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-xl", t.msgType === "SMS" ? "bg-indigo-50 text-indigo-500" : t.msgType === "Email" ? "bg-purple-50 text-purple-500" : "bg-emerald-50 text-emerald-500")}>
                      {t.msgType === "SMS" ? <MessageSquare size={15} /> : t.msgType === "Email" ? <Mail size={15} /> : <MessageCircle size={15} />}
                    </div>
                    <Badge type={t.msgType} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyTpl(t)} title="Copier" className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"><Copy size={13} /></button>
                    <button onClick={() => openEditTpl(t)} title="Modifier" className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all"><Edit3 size={13} /></button>
                    <button onClick={() => handleDeleteTpl(t.id)} title="Supprimer" className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={13} /></button>
                  </div>
                </div>
                {t.category && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.category}</span>
                )}
                <h4 className="font-black text-slate-900 text-base mb-2">{t.title}</h4>
                <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed flex-1">{t.content}</p>
                <button onClick={() => useTpl(t)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  Utiliser ce modèle →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ PLANIFIÉS ══════════════ */}
      {tab === "planifie" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800 text-lg">Messages planifiés</h2>
              <p className="text-sm text-slate-400 mt-0.5">Programmez des envois automatiques à une date et heure précises</p>
            </div>
            <button
              onClick={() => setTab("composer")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={15} /> Planifier un message
            </button>
          </div>

          {scheduled.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4 text-slate-300">
              <CalendarClock size={52} />
              <p className="font-black text-slate-400 text-lg">Aucun message planifié</p>
              <p className="text-sm text-slate-400">Composez un message et cliquez sur &ldquo;Planifier&rdquo;</p>
              <button onClick={() => setTab("composer")} className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all">
                <Plus size={14} /> Créer un message
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduled.map(msg => (
                <div key={msg.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                    msg.msgType === "SMS" ? "bg-indigo-50 text-indigo-500" : msg.msgType === "Email" ? "bg-purple-50 text-purple-500" : "bg-emerald-50 text-emerald-500")}>
                    {msg.msgType === "SMS" ? <MessageSquare size={20} /> : msg.msgType === "Email" ? <Mail size={20} /> : <MessageCircle size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-800 truncate">{msg.targetAudience}</span>
                      <Badge type={msg.msgType} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">{msg.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <CalendarClock size={11} />
                        {new Date(msg.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusPill status={msg.status} />
                    {msg.status === "En attente" && (
                      <button
                        onClick={() => handleCancelScheduled(msg.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-100 text-rose-500 text-xs font-bold hover:bg-rose-50 transition-all"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ HISTORIQUE ══════════════ */}
      {tab === "historique" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchLog}
                onChange={e => setSearchLog(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              {["Tous", "SMS", "Email", "WhatsApp"].map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    filterType === f ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-indigo-200")}>
                  {f}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400 font-medium">{filteredLogs.length} messages</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                <MessageCircle size={48} />
                <p className="font-bold text-slate-400 text-lg">Aucun message trouvé</p>
                <p className="text-sm">L&apos;historique de vos envois apparaîtra ici.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Date & Heure", "Type", "Cible", "Destinataires", "Aperçu", "Statut", "Envoyé par"].map(h => (
                        <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="px-5 py-4"><Badge type={log.msgType} /></td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700 max-w-[140px] truncate">{log.targetAudience}</td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                            <Users size={11} />
                            {log.recipientCount ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 max-w-[160px]">
                          <p className="text-xs text-slate-400 truncate">{log.content}</p>
                        </td>
                        <td className="px-5 py-4"><StatusPill status={log.status} /></td>
                        <td className="px-5 py-4 text-xs text-slate-400 font-medium">{log.sentBy || "Admin"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
