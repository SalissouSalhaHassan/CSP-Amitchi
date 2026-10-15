"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  GraduationCap, Award, Search, QrCode, Plus, X, Check,
  RefreshCw, Trash2, Edit2, Shield, ShieldOff, ExternalLink,
  Users, FileCheck, Phone, Mail, MapPin, BookOpen,
  CheckCircle, XCircle, AlertCircle, Download, Eye,
  Calendar, Star, BarChart3, Building, ChevronDown,
} from "lucide-react";
import {
  getAlumni, saveAlumnus, deleteAlumnus,
  getCertificates, issueCertificate, revokeCertificate, deleteCertificate,
  verifyCertificate, getAlumniStats, getAlumniKPIs,
} from "@/domains/alumni/actions/alumni.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "registry" | "certificates" | "verify" | "stats";

const LEVELS = ["BEPC", "Baccalauréat", "BT", "BP", "CAP", "BEP", "Licence", "Master", "Autre"];
const SERIES = ["A1", "A2", "B", "C", "D", "E", "G1", "G2", "G3", "H", "TI", "Scientifique", "Littéraire"];
const MENTIONS = ["Excellent", "Très Bien", "Bien", "Assez Bien", "Passable"];
const SITUATIONS = ["Inconnu", "Étudiant(e)", "En emploi", "Auto-entrepreneur", "Chômeur(se)", "À l'étranger"];
const CERT_TYPES = [
  "Attestation de Réussite",
  "Diplôme de BEPC",
  "Diplôme de Baccalauréat",
  "Attestation de Fréquentation",
  "Relevé de Notes",
  "Certificat de Scolarité",
  "Diplôme de Formation Professionnelle",
];

function mentionColor(mention?: string) {
  if (!mention) return "bg-gray-100 text-gray-500";
  if (mention === "Excellent" || mention === "Très Bien") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (mention === "Bien" || mention === "Assez Bien") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  initialAlumni: any[];
  initialCerts: any[];
  initialKpis: any;
  initialStats: any;
}

// ─── QR Code URL Generator ────────────────────────────────────────────────────
function getQrUrl(code: string, size = 150) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(`Vérification: ${code}`)}`;
}

// ─── ALUMNI REGISTRY TABLE ────────────────────────────────────────────────────

function AlumniTable({
  alumni, onEdit, onDelete, onIssueCert, loading,
}: {
  alumni: any[];
  onEdit: (a: any) => void;
  onDelete: (id: number) => void;
  onIssueCert: (a: any) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Diplômé(e)</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Promotion</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Niveau / Série</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Note / Mention</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Situation actuelle</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Attestations</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alumni.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Aucun diplômé enregistré</p>
                </td>
              </tr>
            ) : alumni.map(a => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {a.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{a.full_name}</p>
                      {a.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</p>}
                      {a.email && <p className="text-xs text-gray-400 truncate max-w-[160px]">{a.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-indigo-100 text-indigo-700 font-bold text-sm px-3 py-1 rounded-full">{a.graduation_year}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-700">{a.level_completed}</p>
                  {a.series_or_track && <p className="text-xs text-gray-400">Série {a.series_or_track}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  {a.final_grade && <p className="font-bold text-gray-800 mb-1">{a.final_grade}</p>}
                  {a.mention && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mentionColor(a.mention)}`}>{a.mention}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.current_situation === "En emploi" ? "bg-green-100 text-green-700" : a.current_situation === "Étudiant(e)" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.current_situation ?? "Inconnu"}
                  </span>
                  {a.current_employer && <p className="text-xs text-gray-400 mt-0.5">{a.current_employer}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-bold ${Number(a.cert_count) > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                    {a.cert_count ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onIssueCert(a)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Émettre attestation">
                      <Award className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(a)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(a.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CERTIFICATE CARD ─────────────────────────────────────────────────────────

function CertCard({ cert, onRevoke, onDelete }: { cert: any; onRevoke: (id: number) => void; onDelete: (id: number) => void }) {
  const [showQr, setShowQr] = useState(false);
  const qrUrl = getQrUrl(cert.verification_code);
  const verifyUrl = `/verify/${cert.verification_code}`;

  return (
    <div className={`bg-white rounded-2xl border-2 ${cert.is_valid ? "border-emerald-200" : "border-red-200 opacity-60"} shadow-sm p-5 relative overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-violet-600 to-indigo-600" />

      {/* Status banner */}
      <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${cert.is_valid ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
        {cert.is_valid ? "✓ VALIDE" : "✗ RÉVOQUÉ"}
      </div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">{cert.full_name}</h3>
            <p className="text-xs text-violet-600 font-semibold">{cert.certificate_type}</p>
          </div>
        </div>

        {/* Certificate details grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">N° Certificat</p>
            <p className="font-bold text-gray-700 font-mono">{cert.certificate_number}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">Promotion</p>
            <p className="font-bold text-indigo-700">{cert.graduation_year}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">Niveau</p>
            <p className="font-semibold text-gray-700">{cert.level_completed}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">Mention</p>
            <p className={`font-bold text-xs px-1.5 py-0.5 rounded-full inline-block ${mentionColor(cert.mention)}`}>{cert.mention ?? "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">Note finale</p>
            <p className="font-bold text-gray-800">{cert.final_grade ?? "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 font-medium">Date d'émission</p>
            <p className="font-semibold text-gray-600">{fmtDate(cert.issued_date)}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 mb-4">
          <p className="text-gray-400 font-medium text-xs">École</p>
          <p className="font-semibold text-gray-700 text-sm">{cert.school_name}</p>
          {cert.director_name && <p className="text-xs text-gray-400">Directeur: {cert.director_name}</p>}
        </div>

        {/* QR Code section */}
        <button
          onClick={() => setShowQr(!showQr)}
          className="w-full flex items-center justify-between bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl px-3 py-2 text-xs font-semibold text-violet-700 transition-colors mb-3"
        >
          <span className="flex items-center gap-2"><QrCode className="w-4 h-4" /> Code QR de vérification</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showQr ? "rotate-180" : ""}`} />
        </button>

        {showQr && (
          <div className="bg-violet-50 rounded-xl p-4 mb-3 text-center border border-violet-100">
            {/* QR Code image */}
            <img
              src={qrUrl}
              alt="QR Code vérification"
              className="w-28 h-28 mx-auto rounded-lg border-4 border-white shadow-md mb-2"
            />
            <p className="text-xs text-gray-500 font-medium mb-1">Code de vérification</p>
            <p className="font-mono text-xs text-violet-700 bg-white border border-violet-200 rounded-lg px-2 py-1 break-all">{cert.verification_code}</p>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 underline"
            >
              <ExternalLink className="w-3 h-3" /> Ouvrir la page de vérification
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {cert.is_valid && (
            <button
              onClick={() => onRevoke(cert.id)}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors font-semibold"
            >
              <ShieldOff className="w-3.5 h-3.5" /> Révoquer
            </button>
          )}
          <button
            onClick={() => onDelete(cert.id)}
            className="flex items-center justify-center gap-1 text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {cert.revoked_reason && (
          <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-2 py-1">
            Motif révocation: {cert.revoked_reason}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AlumniClient({ initialAlumni, initialCerts, initialKpis, initialStats }: Props) {
  const [alumni, setAlumni] = useState<any[]>(initialAlumni);
  const [certs, setCerts] = useState<any[]>(initialCerts);
  const [kpis, setKpis] = useState<any>(initialKpis);
  const [stats, setStats] = useState<any>(initialStats);

  const [activeTab, setActiveTab] = useState<Tab>("registry");
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // ── Alumni Modal ──
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [editAlumnus, setEditAlumnus] = useState<any | null>(null);
  const [aForm, setAForm] = useState({
    fullName: "", gender: "M", dateOfBirth: "", nationality: "Nigérienne",
    phone: "", email: "", address: "", graduationYear: new Date().getFullYear(),
    levelCompleted: "Baccalauréat", seriesOrTrack: "", finalGrade: "", mention: "Bien",
    examCenter: "", examRegistrationNumber: "", currentSituation: "Inconnu",
    currentEmployer: "", higherEducationInstitution: "", higherEducationField: "", notes: "",
  });

  // ── Certificate Issuance Modal ──
  const [showCertModal, setShowCertModal] = useState(false);
  const [certTarget, setCertTarget] = useState<any | null>(null);
  const [certForm, setCertForm] = useState({
    certificateType: "Attestation de Réussite",
    schoolName: "", directorName: "", issuedBy: "Administration", notes: "",
  });
  const [newCertResult, setNewCertResult] = useState<{ certNumber: string; verificationCode: string } | null>(null);

  // ── Verify Modal ──
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // ── Cert filter ──
  const [certAlumniFilter, setCertAlumniFilter] = useState<string>("");

  // ─── Filters ──────────────────────────────────────────────────────────────
  const filteredAlumni = useMemo(() => {
    return alumni.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.full_name?.toLowerCase().includes(q) || a.phone?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
      const matchYear = !filterYear || String(a.graduation_year) === filterYear;
      const matchLevel = !filterLevel || a.level_completed?.toLowerCase().includes(filterLevel.toLowerCase());
      return matchSearch && matchYear && matchLevel;
    });
  }, [alumni, search, filterYear, filterLevel]);

  const filteredCerts = useMemo(() => {
    const q = certAlumniFilter.toLowerCase();
    return certs.filter(c => !q || c.full_name?.toLowerCase().includes(q) || c.certificate_number?.toLowerCase().includes(q));
  }, [certs, certAlumniFilter]);

  const years = useMemo(() => {
    const ys = [...new Set(alumni.map(a => a.graduation_year))].sort((a, b) => b - a);
    return ys;
  }, [alumni]);

  // ─── Refresh ──────────────────────────────────────────────────────────────
  async function refreshAll() {
    setLoading(true);
    try {
      const [a, c, k, s] = await Promise.all([
        getAlumni(), getCertificates(), getAlumniKPIs(), getAlumniStats(),
      ]);
      setAlumni((a as any)?.data ?? []);
      setCerts((c as any)?.data ?? []);
      setKpis((k as any)?.data ?? kpis);
      setStats((s as any)?.data ?? stats);
    } finally { setLoading(false); }
  }

  // ─── Alumni Handlers ──────────────────────────────────────────────────────
  function openAlumniModal(a?: any) {
    if (a) {
      setEditAlumnus(a);
      setAForm({
        fullName: a.full_name ?? "", gender: a.gender ?? "M",
        dateOfBirth: a.date_of_birth ? new Date(a.date_of_birth).toISOString().split("T")[0] : "",
        nationality: a.nationality ?? "Nigérienne", phone: a.phone ?? "", email: a.email ?? "",
        address: a.address ?? "", graduationYear: a.graduation_year ?? new Date().getFullYear(),
        levelCompleted: a.level_completed ?? "Baccalauréat", seriesOrTrack: a.series_or_track ?? "",
        finalGrade: a.final_grade ?? "", mention: a.mention ?? "Bien",
        examCenter: a.exam_center ?? "", examRegistrationNumber: a.exam_registration_number ?? "",
        currentSituation: a.current_situation ?? "Inconnu", currentEmployer: a.current_employer ?? "",
        higherEducationInstitution: a.higher_education_institution ?? "",
        higherEducationField: a.higher_education_field ?? "", notes: a.notes ?? "",
      });
    } else {
      setEditAlumnus(null);
      setAForm({
        fullName: "", gender: "M", dateOfBirth: "", nationality: "Nigérienne",
        phone: "", email: "", address: "", graduationYear: new Date().getFullYear(),
        levelCompleted: "Baccalauréat", seriesOrTrack: "", finalGrade: "", mention: "Bien",
        examCenter: "", examRegistrationNumber: "", currentSituation: "Inconnu",
        currentEmployer: "", higherEducationInstitution: "", higherEducationField: "", notes: "",
      });
    }
    setShowAlumniModal(true);
  }

  async function handleSaveAlumnus() {
    if (!aForm.fullName.trim()) return toast.error("Nom complet requis");
    if (!aForm.graduationYear) return toast.error("Année de promotion requise");
    setLoading(true);
    try {
      const res = await saveAlumnus({ ...aForm, id: editAlumnus?.id });
      if ((res as any)?.success) {
        toast.success(editAlumnus ? "Diplômé modifié !" : "Diplômé enregistré !");
        setShowAlumniModal(false);
        await refreshAll();
      } else { 
        toast.error((res as any)?.error || "Erreur d'enregistrement"); 
      }
    } finally { setLoading(false); }
  }

  async function handleDeleteAlumnus(id: number) {
    if (!confirm("Supprimer ce diplômé et tous ses certificats ?")) return;
    setLoading(true);
    try { await deleteAlumnus(id); toast.success("Supprimé"); await refreshAll(); }
    finally { setLoading(false); }
  }

  // ─── Certificate Handlers ─────────────────────────────────────────────────
  function openIssueCertModal(a: any) {
    setCertTarget(a);
    setCertForm({ certificateType: "Attestation de Réussite", schoolName: "", directorName: "", issuedBy: "Administration", notes: "" });
    setNewCertResult(null);
    setShowCertModal(true);
  }

  async function handleIssueCert() {
    if (!certTarget) return;
    setLoading(true);
    try {
      const res = await issueCertificate({ alumniId: certTarget.id, ...certForm });
      if ((res as any)?.success) {
        setNewCertResult({ certNumber: (res as any).certNumber, verificationCode: (res as any).verificationCode });
        toast.success("Attestation émise avec succès !");
        await refreshAll();
      } else { toast.error((res as any)?.error ?? "Erreur"); }
    } finally { setLoading(false); }
  }

  async function handleRevoke(id: number) {
    const reason = prompt("Motif de révocation :");
    if (reason === null) return;
    setLoading(true);
    try { await revokeCertificate(id, reason || "Non spécifié"); toast.success("Certificat révoqué"); await refreshAll(); }
    finally { setLoading(false); }
  }

  async function handleDeleteCert(id: number) {
    if (!confirm("Supprimer définitivement ce certificat ?")) return;
    setLoading(true);
    try { await deleteCertificate(id); toast.success("Supprimé"); await refreshAll(); }
    finally { setLoading(false); }
  }

  // ─── Verification Handler ─────────────────────────────────────────────────
  async function handleVerify() {
    if (!verifyCode.trim()) return toast.error("Entrez un code de vérification");
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await verifyCertificate(verifyCode.trim());
      setVerifyResult(res);
    } finally { setVerifyLoading(false); }
  }

  // ─── Tabs Config ──────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "registry", label: "🎓 Registre des Diplômés", icon: Users, badge: kpis.totalAlumni },
    { id: "certificates", label: "📜 Attestations & Diplômes", icon: Award, badge: kpis.certificatesIssued },
    { id: "verify", label: "🔍 Vérification QR", icon: QrCode },
    { id: "stats", label: "📊 Statistiques", icon: BarChart3 },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white px-6 py-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="w-7 h-7" /> Portail des Diplômés & Attestations Numériques
              </h1>
              <p className="text-violet-200 text-sm mt-1">Registre alumni · Diplômes numériques · Vérification QR anti-fraude</p>
            </div>
            <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Total Diplômés", value: kpis.totalAlumni, icon: GraduationCap, color: "from-violet-500/20 to-purple-600/20" },
              { label: "Attestations émises", value: kpis.certificatesIssued, icon: Award, color: "from-emerald-500/20 to-green-600/20" },
              { label: "Promotion en cours", value: kpis.graduatedThisYear, icon: Star, color: "from-amber-500/20 to-orange-500/20" },
              { label: "Avec coordonnées", value: kpis.withContact, icon: Phone, color: "from-blue-500/20 to-cyan-500/20" },
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

      {/* ── Tabs ── */}
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
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ═══ TAB 1: REGISTRY ═══ */}
        {activeTab === "registry" && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Rechercher par nom, téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">Toutes les promotions</option>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                <option value="">Tous les niveaux</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => openAlumniModal()}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter Diplômé
              </Button>
            </div>

            <div className="mb-3 text-sm text-gray-500">
              {filteredAlumni.length} diplômé{filteredAlumni.length > 1 ? "s" : ""} trouvé{filteredAlumni.length > 1 ? "s" : ""}
            </div>

            <AlumniTable
              alumni={filteredAlumni}
              onEdit={openAlumniModal}
              onDelete={handleDeleteAlumnus}
              onIssueCert={openIssueCertModal}
              loading={loading}
            />
          </>
        )}

        {/* ═══ TAB 2: CERTIFICATES ═══ */}
        {activeTab === "certificates" && (
          <>
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Rechercher par nom ou numéro..." value={certAlumniFilter} onChange={e => setCertAlumniFilter(e.target.value)} />
              </div>
            </div>

            {filteredCerts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Award className="w-14 h-14 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Aucun certificat émis</p>
                <p className="text-sm mt-1">Accédez à l'onglet "Registre" pour émettre des attestations</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCerts.map(c => (
                  <CertCard key={c.id} cert={c} onRevoke={handleRevoke} onDelete={handleDeleteCert} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ TAB 3: VERIFY ═══ */}
        {activeTab === "verify" && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Vérification d'Attestation</h2>
                <p className="text-gray-500 text-sm mt-1">Entrez le code de vérification figurant sur le diplôme ou scannez le QR code</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Code de vérification</label>
                  <Input
                    placeholder="ex: a3f2b1e9c4d8..."
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleVerify()}
                    className="font-mono text-sm"
                  />
                </div>
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={handleVerify} disabled={verifyLoading}>
                  {verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Vérifier l'authenticité
                </Button>
              </div>

              {/* Verify result */}
              {verifyResult && (
                <div className={`mt-6 rounded-2xl p-6 border-2 ${verifyResult.valid ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                  <div className="flex items-center gap-3 mb-4">
                    {verifyResult.valid
                      ? <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                      : <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    }
                    <div>
                      <p className={`font-bold text-lg ${verifyResult.valid ? "text-emerald-700" : "text-red-700"}`}>
                        {verifyResult.valid ? "✓ Certificat AUTHENTIQUE" : "✗ Certificat NON VALIDE"}
                      </p>
                      {verifyResult.revoked && <p className="text-xs text-red-600">Révoqué — {verifyResult.revokedReason}</p>}
                      {!verifyResult.valid && !verifyResult.revoked && <p className="text-xs text-red-600">{verifyResult.message}</p>}
                    </div>
                  </div>

                  {verifyResult.certificate && (
                    <div className="space-y-2 text-sm">
                      {[
                        ["Bénéficiaire", verifyResult.certificate.full_name],
                        ["Type", verifyResult.certificate.certificate_type],
                        ["N° Certificat", verifyResult.certificate.certificate_number],
                        ["Niveau", verifyResult.certificate.level_completed],
                        ["Promotion", verifyResult.certificate.graduation_year],
                        ["Mention", verifyResult.certificate.mention ?? "—"],
                        ["Note", verifyResult.certificate.final_grade ?? "—"],
                        ["École", verifyResult.certificate.school_name],
                        ["Date d'émission", fmtDate(verifyResult.certificate.issued_date)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between py-1 border-b border-white/50">
                          <span className="font-medium text-gray-500 text-xs">{label}</span>
                          <span className="font-bold text-gray-700 text-xs text-right max-w-[60%]">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 4: STATS ═══ */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* By Year */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-violet-600" /> Diplômés par promotion
              </h3>
              <div className="space-y-3">
                {(stats?.byYear ?? []).map((row: any) => {
                  const maxCount = Math.max(...(stats?.byYear ?? []).map((r: any) => Number(r.count)), 1);
                  const pct = Math.round((Number(row.count) / maxCount) * 100);
                  return (
                    <div key={row.graduation_year}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{row.graduation_year}</span>
                        <span className="font-bold text-violet-700">{row.count} diplômé{Number(row.count) > 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!(stats?.byYear?.length) && <p className="text-gray-400 text-sm text-center py-4">Aucune donnée</p>}
              </div>
            </div>

            {/* By Level */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-600" /> Par niveau d'études
              </h3>
              <div className="space-y-3">
                {(stats?.byLevel ?? []).map((row: any) => {
                  const maxCount = Math.max(...(stats?.byLevel ?? []).map((r: any) => Number(r.count)), 1);
                  const pct = Math.round((Number(row.count) / maxCount) * 100);
                  return (
                    <div key={row.level_completed}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{row.level_completed}</span>
                        <span className="font-bold text-emerald-700">{row.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!(stats?.byLevel?.length) && <p className="text-gray-400 text-sm text-center py-4">Aucune donnée</p>}
              </div>
            </div>

            {/* By Mention */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-500" /> Répartition des mentions
              </h3>
              <div className="space-y-3">
                {(stats?.byMention ?? []).map((row: any) => {
                  const maxCount = Math.max(...(stats?.byMention ?? []).map((r: any) => Number(r.count)), 1);
                  const pct = Math.round((Number(row.count) / maxCount) * 100);
                  return (
                    <div key={row.mention}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mentionColor(row.mention)}`}>{row.mention}</span>
                        <span className="font-bold text-gray-700">{row.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!(stats?.byMention?.length) && <p className="text-gray-400 text-sm text-center py-4">Aucune donnée</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Alumni Add/Edit Modal */}
      {showAlumniModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#131622] z-10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editAlumnus ? "Modifier le Diplômé" : "Enregistrer un Diplômé"}
              </h3>
              <button onClick={() => setShowAlumniModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identité */}
              <div>
                <h4 className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">👤 Identité</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Nom & Prénom *</label>
                    <Input 
                      value={aForm.fullName} 
                      onChange={e => setAForm(f => ({ ...f, fullName: e.target.value }))} 
                      placeholder="Nom complet" 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Genre</label>
                    <select 
                      className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.gender} 
                      onChange={e => setAForm(f => ({ ...f, gender: e.target.value }))}
                    >
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Date de naissance</label>
                    <Input 
                      type="date" 
                      value={aForm.dateOfBirth} 
                      onChange={e => setAForm(f => ({ ...f, dateOfBirth: e.target.value }))} 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Téléphone</label>
                    <Input 
                      value={aForm.phone} 
                      onChange={e => setAForm(f => ({ ...f, phone: e.target.value }))} 
                      placeholder="+227 ..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Email</label>
                    <Input 
                      type="email" 
                      value={aForm.email} 
                      onChange={e => setAForm(f => ({ ...f, email: e.target.value }))} 
                      placeholder="email@..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Scolarité */}
              <div>
                <h4 className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">🎓 Scolarité</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Année de promotion *</label>
                    <Input 
                      type="number" 
                      value={aForm.graduationYear} 
                      onChange={e => setAForm(f => ({ ...f, graduationYear: Number(e.target.value) }))} 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Niveau obtenu *</label>
                    <select 
                      className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.levelCompleted} 
                      onChange={e => setAForm(f => ({ ...f, levelCompleted: e.target.value }))}
                    >
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Série / Filière</label>
                    <select 
                      className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.seriesOrTrack} 
                      onChange={e => setAForm(f => ({ ...f, seriesOrTrack: e.target.value }))}
                    >
                      <option value="">Aucune</option>
                      {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Note finale</label>
                    <Input 
                      value={aForm.finalGrade} 
                      onChange={e => setAForm(f => ({ ...f, finalGrade: e.target.value }))} 
                      placeholder="ex: 14.25/20" 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Mention</label>
                    <select 
                      className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.mention} 
                      onChange={e => setAForm(f => ({ ...f, mention: e.target.value }))}
                    >
                      {MENTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">N° d'inscription examen</label>
                    <Input 
                      value={aForm.examRegistrationNumber} 
                      onChange={e => setAForm(f => ({ ...f, examRegistrationNumber: e.target.value }))} 
                      placeholder="ex: NIG-2024-..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Centre d'examen</label>
                    <Input 
                      value={aForm.examCenter} 
                      onChange={e => setAForm(f => ({ ...f, examCenter: e.target.value }))} 
                      placeholder="ex: Lycée Issa Béri, Niamey" 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Situation actuelle */}
              <div>
                <h4 className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">📍 Situation actuelle</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Situation</label>
                    <select 
                      className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.currentSituation} 
                      onChange={e => setAForm(f => ({ ...f, currentSituation: e.target.value }))}
                    >
                      {SITUATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Employeur actuel</label>
                    <Input 
                      value={aForm.currentEmployer} 
                      onChange={e => setAForm(f => ({ ...f, currentEmployer: e.target.value }))} 
                      placeholder="Si en emploi..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Établissement d'enseignement supérieur</label>
                    <Input 
                      value={aForm.higherEducationInstitution} 
                      onChange={e => setAForm(f => ({ ...f, higherEducationInstitution: e.target.value }))} 
                      placeholder="Si étudiant..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Filière universitaire</label>
                    <Input 
                      value={aForm.higherEducationField} 
                      onChange={e => setAForm(f => ({ ...f, higherEducationField: e.target.value }))} 
                      placeholder="ex: Médecine, Droit..." 
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Notes</label>
                    <textarea 
                      rows={2} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/30" 
                      value={aForm.notes} 
                      onChange={e => setAForm(f => ({ ...f, notes: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#131622]">
              <Button variant="outline" onClick={() => setShowAlumniModal(false)} className="rounded-xl font-bold">Annuler</Button>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md shadow-violet-200 dark:shadow-none" onClick={handleSaveAlumnus} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                {editAlumnus ? "Modifier" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Issuance Modal */}
      {showCertModal && certTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131622] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#131622] z-10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Émettre une Attestation
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Pour: <span className="font-bold text-slate-800 dark:text-slate-200">{certTarget.full_name}</span> — Promotion {certTarget.graduation_year}</p>
              </div>
              <button onClick={() => { setShowCertModal(false); setNewCertResult(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!newCertResult ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Type de document *</label>
                  <select 
                    className="w-full h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30" 
                    value={certForm.certificateType} 
                    onChange={e => setCertForm(f => ({ ...f, certificateType: e.target.value }))}
                  >
                    {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Nom de l'établissement</label>
                  <Input 
                    value={certForm.schoolName} 
                    onChange={e => setCertForm(f => ({ ...f, schoolName: e.target.value }))} 
                    placeholder="Laisser vide pour utiliser le nom enregistré" 
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Nom du Directeur</label>
                  <Input 
                    value={certForm.directorName} 
                    onChange={e => setCertForm(f => ({ ...f, directorName: e.target.value }))} 
                    placeholder="M. / Mme Directeur" 
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Émis par</label>
                  <Input 
                    value={certForm.issuedBy} 
                    onChange={e => setCertForm(f => ({ ...f, issuedBy: e.target.value }))} 
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 block">Notes</label>
                  <Input 
                    value={certForm.notes} 
                    onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} 
                    placeholder="..." 
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p>Un code de vérification unique et un QR Code anti-fraude seront générés automatiquement.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowCertModal(false)} className="rounded-xl font-bold">Annuler</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 dark:shadow-none" onClick={handleIssueCert} disabled={loading}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Award className="w-4 h-4 mr-1" />} Émettre
                  </Button>
                </div>
              </div>
            ) : (
              /* Success state: show cert info + QR */
              <div className="p-6 text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-300 mb-1">Attestation émise avec succès !</h4>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Le document numérique a été créé et signé</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 text-left space-y-3 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Numéro du certificat</p>
                    <p className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm mt-0.5">{newCertResult.certNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">QR Code de vérification</p>
                    <div className="flex justify-center">
                      <img
                        src={getQrUrl(newCertResult.verificationCode, 180)}
                        alt="QR Code"
                        className="rounded-xl border-4 border-white dark:border-slate-800 shadow-lg"
                      />
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2 break-all text-center">{newCertResult.verificationCode}</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 text-left">
                  <p className="font-bold mb-1">Comment utiliser le QR Code ?</p>
                  <p>Imprimez ce QR Code sur l'attestation physique. Toute personne peut scanner ou saisir le code sur la page de vérification pour confirmer l'authenticité du document.</p>
                </div>

                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl h-11" onClick={() => { setShowCertModal(false); setNewCertResult(null); setActiveTab("certificates"); }}>
                  <Eye className="w-4 h-4 mr-2" /> Voir tous les certificats
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
