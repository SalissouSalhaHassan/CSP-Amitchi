"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Upload,
  Users,
  Trash2,
  X,
  Droplets,
  Lightbulb,
  Check,
  Info,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { createCanevasReferenceItem, updateCanevasReferenceItem, deleteCanevasReferenceItem } from "@/domains/academics/actions/academics.actions";

interface SchoolRow {
  code: string;
  name: string;
  type: string;
  cycle: string;
  region: string;
  commune: string;
  quartier: string;
  statut: string;
  eleves: number;
  filles: number;
  garcons: number;
  enseignants: number;
  salles: number;
  eau: string;
  electricite: string;
  completion: number;
  lastUpdate: string;
}

const initialSchools: SchoolRow[] = [
  {
    code: "ETB-2026-001",
    name: "Ecole Excellence",
    type: "Privé",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey IV",
    quartier: "Yantala",
    statut: "Validé inspection",
    eleves: 642,
    filles: 318,
    garcons: 324,
    enseignants: 24,
    salles: 18,
    eau: "Oui",
    electricite: "Oui",
    completion: 98,
    lastUpdate: "27/06/2026",
  },
  {
    code: "ETB-2026-018",
    name: "Ecole Primaire Bobiel",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey I",
    quartier: "Bobiel",
    statut: "Brouillon",
    eleves: 481,
    filles: 236,
    garcons: 245,
    enseignants: 16,
    salles: 12,
    eau: "Non",
    electricite: "Oui",
    completion: 76,
    lastUpdate: "26/06/2026",
  },
  {
    code: "ETB-2026-043",
    name: "Complexe Scolaire Sahel",
    type: "Privé",
    cycle: "Collège",
    region: "Niamey",
    commune: "Niamey II",
    quartier: "Plateau",
    statut: "Validé école",
    eleves: 934,
    filles: 452,
    garcons: 482,
    enseignants: 41,
    salles: 26,
    eau: "Oui",
    electricite: "Oui",
    completion: 94,
    lastUpdate: "25/06/2026",
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey III",
    quartier: "Lazaret",
    statut: "Rejeté inspection",
    eleves: 388,
    filles: 190,
    garcons: 198,
    enseignants: 13,
    salles: 9,
    eau: "Oui",
    electricite: "Non",
    completion: 61,
    lastUpdate: "24/06/2026",
  },
  {
    code: "ETB-2026-104",
    name: "Lycee Municipal Est",
    type: "Public",
    cycle: "Lycée",
    region: "Niamey",
    commune: "Niamey V",
    quartier: "Aeroport",
    statut: "Transmis ministère",
    eleves: 1218,
    filles: 593,
    garcons: 625,
    enseignants: 58,
    salles: 34,
    eau: "Oui",
    electricite: "Oui",
    completion: 91,
    lastUpdate: "22/06/2026",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Valide: "border-emerald-100 bg-emerald-50 text-emerald-700",
    "A verifier": "border-amber-100 bg-amber-50 text-amber-700",
    Incomplet: "border-rose-100 bg-rose-50 text-rose-700",
    Brouillon: "border-slate-200 bg-slate-50 text-slate-500",
    "En correction": "border-amber-100 bg-amber-50 text-amber-600",
    "Validé école": "border-blue-100 bg-blue-50 text-blue-700",
    "Rejeté inspection": "border-rose-100 bg-rose-50 text-rose-600",
    "Validé inspection": "border-cyan-100 bg-cyan-50 text-cyan-700",
    "Validé DREN": "border-violet-100 bg-violet-50 text-violet-700",
    "Transmis ministère": "border-emerald-100 bg-emerald-50 text-emerald-600",
    Archivé: "border-slate-300 bg-slate-100 text-slate-700",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status] || "bg-slate-100")}>
      {status}
    </span>
  );
}

function BooleanBadge({ value }: { value: string }) {
  const ok = value === "Oui";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-black", ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {value}
    </span>
  );
}

interface EtablissementsClientProps {
  initialCanevasReferences: {
    type: any[];
    cycle: any[];
    commune: any[];
  };
  educationalLevels: any[];
}

export default function EtablissementsClient({
  initialCanevasReferences,
  educationalLevels,
}: EtablissementsClientProps) {
  const [schoolsList, setSchoolsList] = useState<SchoolRow[]>(initialSchools);

  // Dynamic References State
  const [communesList, setCommunesList] = useState<string[]>(() => {
    const fromRef = (initialCanevasReferences?.commune || []).map((c: any) => c.value || c);
    const defaults = ["Niamey I", "Niamey II", "Niamey III", "Niamey IV", "Niamey V"];
    return Array.from(new Set([...defaults, ...fromRef]));
  });

  // Dynamic Cycles linked to Niveaux d'Étude
  const [cyclesList] = useState<string[]>(() => {
    const fromLevels = (educationalLevels || []).map((l: any) => l.levelName || l.name || l);
    const fromRef = (initialCanevasReferences?.cycle || []).map((c: any) => c.value || c);
    const defaults = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
    return Array.from(new Set([...defaults, ...fromLevels, ...fromRef]));
  });

  const [typesList] = useState<string[]>(() => {
    const fromRef = (initialCanevasReferences?.type || []).map((t: any) => t.value || t);
    const defaults = ["Public", "Privé", "Communautaire", "Confessionnel"];
    return Array.from(new Set([...defaults, ...fromRef]));
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Type: tous");
  const [filterCycle, setFilterCycle] = useState("Cycle: tous");
  const [filterCommune, setFilterCommune] = useState("Commune");
  const [filterStatut, setFilterStatut] = useState("Statut: tous");

  // Modal / Drawer States
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolRow | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Commune Modal State
  const [isAddCommuneOpen, setIsAddCommuneOpen] = useState(false);
  const [newCommuneName, setNewCommuneName] = useState("");
  const [isAddingCommune, setIsAddingCommune] = useState(false);

  // New School Fields
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Public");
  const [newCycle, setNewCycle] = useState(cyclesList[1] || "Primaire");
  const [newRegion, setNewRegion] = useState("Niamey");
  const [newCommune, setNewCommune] = useState(communesList[0] || "Niamey I");
  const [newQuartier, setNewQuartier] = useState("");
  const [newEleves, setNewEleves] = useState(300);
  const [newFilles, setNewFilles] = useState(150);
  const [newGarcons, setNewGarcons] = useState(150);
  const [newEnseignants, setNewEnseignants] = useState(10);
  const [newSalles, setNewSalles] = useState(6);
  const [newEau, setNewEau] = useState("Oui");
  const [newElectricite, setNewElectricite] = useState("Oui");

  // Create New Commune Handler
  const handleCreateCommune = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCommuneName.trim();
    if (!cleanName) {
      toast.error("Veuillez saisir le nom de la nouvelle commune.");
      return;
    }

    if (communesList.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
      toast.error("Cette commune existe déjà dans la liste.");
      return;
    }

    setIsAddingCommune(true);
    try {
      const res = await createCanevasReferenceItem("commune", cleanName);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCommunesList(prev => [...prev, cleanName]);
        setNewCommune(cleanName);
        setNewCommuneName("");
        toast.success(`La commune "${cleanName}" a été créée et ajoutée avec succès !`);
      }
    } catch (err) {
      setCommunesList(prev => [...prev, cleanName]);
      setNewCommune(cleanName);
      setNewCommuneName("");
      toast.success(`La commune "${cleanName}" a été ajoutée à la liste localement !`);
    } finally {
      setIsAddingCommune(false);
    }
  };

  // Commune Edit / Delete Handlers
  const [editingCommuneName, setEditingCommuneName] = useState<string | null>(null);
  const [editCommuneValue, setEditCommuneValue] = useState("");

  const handleUpdateCommune = async (oldName: string, newName: string) => {
    const cleanNew = newName.trim();
    if (!cleanNew) {
      toast.error("Veuillez saisir un nom valide.");
      return;
    }
    if (cleanNew === oldName) {
      setEditingCommuneName(null);
      return;
    }

    try {
      await updateCanevasReferenceItem(oldName, "commune", cleanNew);
    } catch (e) {
      console.log("Local update fallback");
    }

    setCommunesList(prev => prev.map(c => (c === oldName ? cleanNew : c)));
    setSchoolsList(prev => prev.map(s => (s.commune === oldName ? { ...s, commune: cleanNew } : s)));
    if (newCommune === oldName) setNewCommune(cleanNew);

    setEditingCommuneName(null);
    toast.success(`La commune "${oldName}" a été modifiée en "${cleanNew}".`);
  };

  const handleDeleteCommune = async (communeName: string) => {
    if (!confirm(`Voulez-vous supprimer la commune "${communeName}" ?`)) return;

    try {
      await deleteCanevasReferenceItem(communeName, "commune");
    } catch (e) {
      console.log("Local delete fallback");
    }

    setCommunesList(prev => prev.filter(c => c !== communeName));
    if (newCommune === communeName) {
      setNewCommune(communesList.find(c => c !== communeName) || "");
    }
    toast.success(`La commune "${communeName}" a été supprimée.`);
  };

  // Filtering Logic
  const filteredSchools = schoolsList.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(search.toLowerCase()) ||
      school.code.toLowerCase().includes(search.toLowerCase()) ||
      school.commune.toLowerCase().includes(search.toLowerCase()) ||
      school.quartier.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      filterType === "Type: tous" || school.type === filterType;

    const matchesCycle =
      filterCycle === "Cycle: tous" || school.cycle === filterCycle;

    const matchesCommune =
      filterCommune === "Commune" || school.commune === filterCommune;

    const matchesStatut =
      filterStatut === "Statut: tous" || school.statut === filterStatut;

    return matchesSearch && matchesType && matchesCycle && matchesCommune && matchesStatut;
  });

  // KPI calculations based on filtered list
  const totalStudents = filteredSchools.reduce((sum, s) => sum + s.eleves, 0);
  const totalPublic = filteredSchools.filter(s => s.type === "Public").length;
  const totalPrivate = filteredSchools.filter(s => s.type === "Privé" || s.type === "Prive").length;

  // Add School submit
  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) {
      toast.error("Veuillez remplir le nom et le code de l'établissement.");
      return;
    }

    const newSchool: SchoolRow = {
      code: newCode,
      name: newName,
      type: newType,
      cycle: newCycle,
      region: newRegion,
      commune: newCommune,
      quartier: newQuartier || "Quartier non spécifié",
      statut: "A verifier",
      eleves: Number(newEleves),
      filles: Number(newFilles),
      garcons: Number(newGarcons),
      enseignants: Number(newEnseignants),
      salles: Number(newSalles),
      eau: newEau,
      electricite: newElectricite,
      completion: 50,
      lastUpdate: new Date().toLocaleDateString("fr-FR"),
    };

    setSchoolsList([...schoolsList, newSchool]);
    setIsAddOpen(false);
    resetForm();
    toast.success("Établissement ajouté avec succès !");
  };

  const resetForm = () => {
    setNewName("");
    setNewCode("");
    setNewType("Public");
    setNewCycle(cyclesList[1] || "Primaire");
    setNewRegion("Niamey");
    setNewCommune(communesList[0] || "Niamey I");
    setNewQuartier("");
    setNewEleves(300);
    setNewFilles(150);
    setNewGarcons(150);
    setNewEnseignants(10);
    setNewSalles(6);
    setNewEau("Oui");
    setNewElectricite("Oui");
  };

  // Delete school
  const handleDeleteSchool = (code: string) => {
    if (confirm(`Voulez-vous supprimer l'établissement ${code} ?`)) {
      setSchoolsList(schoolsList.filter((s) => s.code !== code));
      toast.success("Établissement supprimé.");
    }
  };

  // Edit School submit
  const handleEditSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchool) return;

    setSchoolsList(
      schoolsList.map((s) => (s.code === editSchool.code ? editSchool : s))
    );
    setEditSchool(null);
    toast.success("Détails de l'établissement mis à jour.");
  };

  const handleValidate = (code: string) => {
    setSchoolsList(schoolsList.map(s => s.code === code ? { ...s, statut: "Validé inspection", completion: 100 } : s));
    toast.success(`Établissement ${code} validé par l'inspection.`);
  };

  const handleExportExcel = () => {
    try {
      toast.success("Exportation Excel en cours...");
      const data = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code": s.code,
        "Nom": s.name,
        "Type": s.type,
        "Cycle": s.cycle,
        "Région": s.region,
        "Commune": s.commune,
        "Quartier": s.quartier,
        "Statut": s.statut,
        "Élèves": s.eleves,
        "Filles": s.filles,
        "Garçons": s.garcons,
        "Enseignants": s.enseignants,
        "Salles": s.salles,
        "Eau": s.eau,
        "Électricité": s.electricite,
        "Complétude (%)": s.completion,
        "Dernière M.J.": s.lastUpdate
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Établissements");
      XLSX.writeFile(workbook, `Liste_Etablissements_${Date.now()}.xlsx`);
      toast.success("Fichier Excel exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel.");
    }
  };

  const handleExportPDF = () => {
    try {
      toast.success("Génération du rapport PDF officiel...");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Page 1 Header
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("GESTION DES CANEVAS SCOLAIRES - RÉPUBLIQUE DU NIGER", 15, 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT SYNTHÉTIQUE DES ÉTABLISSEMENTS", 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Données d'infrastructure, effectifs et conformités des écoles", 15, 29);
      doc.text("Année scolaire : 2025 - 2026", 15, 34);

      // Metadata box
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS DOCUMENT", pageWidth - 80, 17);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'édition : ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 80, 22);
      doc.text("Édité par : Admin Super", pageWidth - 80, 27);
      doc.text("Réf Rapport : RPT-ETB-2026-0001", pageWidth - 80, 32);

      let currentY = 52;

      // Section 1: KPI
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("1. INDICATEURS CLÉS & SYNTHÈSE GLOBALE", 10, currentY);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const cardWidth = (pageWidth - 20 - 15) / 4;
      const kpis = [
        { label: "ÉTABLISSEMENTS", val: filteredSchools.length.toString(), sub: "Écoles répertoriées" },
        { label: "TOTAL ÉLÈVES", val: totalStudents.toLocaleString("fr-FR"), sub: "Filles & Garçons" },
        { label: "PUBLICS", val: totalPublic.toString(), sub: `${Math.round((totalPublic / (filteredSchools.length || 1)) * 100)}% de l'effectif` },
        { label: "PRIVÉS", val: totalPrivate.toString(), sub: `${Math.round((totalPrivate / (filteredSchools.length || 1)) * 100)}% de l'effectif` },
      ];

      kpis.forEach((k, idx) => {
        const xPos = 10 + idx * (cardWidth + 5);
        doc.setFillColor(248, 250, 252);
        doc.rect(xPos, currentY, cardWidth, 20, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(xPos, currentY, cardWidth, 20, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, xPos + 4, currentY + 5);

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(k.val, xPos + 4, currentY + 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(k.sub, xPos + 4, currentY + 17);
      });

      currentY += 26;

      // Section 2: Distribution
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("2. RÉPARTITION PAR COMMUNE & PAR CYCLE", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const columnWidth = (pageWidth - 20 - 10) / 2;

      // Commune Table
      const communeCounts: Record<string, number> = {};
      filteredSchools.forEach(s => communeCounts[s.commune] = (communeCounts[s.commune] || 0) + 1);

      autoTable(doc, {
        startY: currentY,
        head: [["Commune", "Établissements"]],
        body: Object.entries(communeCounts).map(([c, count]) => [c, count.toString()]),
        theme: "plain",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        margin: { left: 10, right: pageWidth - 10 - columnWidth },
      });

      // Cycle Table
      const cycleCounts: Record<string, number> = {};
      filteredSchools.forEach(s => cycleCounts[s.cycle] = (cycleCounts[s.cycle] || 0) + 1);

      autoTable(doc, {
        startY: currentY,
        head: [["Cycle (Niveau d'étude)", "Établissements"]],
        body: Object.entries(cycleCounts).map(([c, count]) => [c, count.toString()]),
        theme: "plain",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        margin: { left: 10 + columnWidth + 10, right: 10 },
      });

      // Page 2: Table
      doc.addPage();

      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("GESTION DES CANEVAS SCOLAIRES", 15, 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("LISTE DES ÉTABLISSEMENTS", 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Registre central des écoles, collèges et lycées", 15, 29);

      currentY = 52;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("TABLEAU DES ÉTABLISSEMENTS", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 6;

      const tableHeaders = ["N°", "Code", "Établissement", "Type", "Cycle", "Région", "Commune", "Élèves", "Statut"];
      const tableBody = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.type,
        s.cycle,
        s.region,
        s.commune,
        s.eleves.toLocaleString("fr-FR"),
        s.statut
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85]
        },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_Etablissements_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Canevas Établissements</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                Officiel
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Gestion centralisée des structures, communes, cycles et infrastructures scolaires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsAddCommuneOpen(true)}
            className="h-11 px-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/80 text-indigo-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <MapPin size={16} />
            Gérer les Communes
          </button>
          <button 
            onClick={handleExportPDF}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition shadow-xs"
          >
            <FileText size={16} className="text-rose-500" />
            PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition shadow-xs"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Excel
          </button>

          <button 
            onClick={() => setIsAddOpen(true)}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-indigo-100"
          >
            <Plus size={16} />
            Ajouter Établissement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Établissements</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{filteredSchools.length}</h3>
              <p className="text-[11px] font-bold text-indigo-600 mt-1">{communesList.length} communes enregistrées</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Effectif Total Élèves</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalStudents.toLocaleString("fr-FR")}</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Filles & Garçons confondus</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Écoles Publiques</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPublic}</h3>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">
                {Math.round((totalPublic / (filteredSchools.length || 1)) * 100)}% du total
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cycles de Formation</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{cyclesList.length}</h3>
              <p className="text-[11px] font-bold text-amber-600 mt-1">Niveaux d'étude synchronisés</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Info size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, commune ou quartier..." 
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="Type: tous">Type: Tous</option>
              {typesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={filterCycle} 
              onChange={e => setFilterCycle(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="Cycle: tous">Cycle (Niveau): Tous</option>
              {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filterCommune} 
              onChange={e => setFilterCommune(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="Commune">Commune: Toutes</option>
              {communesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filterStatut} 
              onChange={e => setFilterStatut(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="Statut: tous">Statut: Tous</option>
              <option value="Brouillon">Brouillon</option>
              <option value="A verifier">À vérifier</option>
              <option value="Validé école">Validé école</option>
              <option value="Validé inspection">Validé inspection</option>
              <option value="Rejeté inspection">Rejeté inspection</option>
              <option value="Transmis ministère">Transmis ministère</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="py-4 px-6">Code & Établissement</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Cycle</th>
                <th className="py-4 px-4">Commune & Quartier</th>
                <th className="py-4 px-4 text-center">Élèves</th>
                <th className="py-4 px-4 text-center">Profs / Salles</th>
                <th className="py-4 px-4 text-center">Eau / Électricité</th>
                <th className="py-4 px-4 text-center">Statut</th>
                <th className="py-4 px-6 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Aucun établissement trouvé selon les critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-black text-xs">
                          {school.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{school.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{school.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", school.type === "Public" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>
                        {school.type}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-800">
                      {school.cycle}
                    </td>

                    <td className="py-4 px-4">
                      <p className="text-slate-900 font-bold">{school.commune}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{school.quartier}</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <p className="font-black text-slate-900">{school.eleves}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{school.filles}F / {school.garcons}G</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <p className="font-bold text-slate-800">{school.enseignants} Profs</p>
                      <p className="text-[10px] text-slate-400 font-medium">{school.salles} Salles</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <BooleanBadge value={school.eau} />
                        <BooleanBadge value={school.electricite} />
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={school.statut} />
                    </td>

                    <td className="py-4 px-6 text-right space-x-1.5 print:hidden">
                      <button 
                        onClick={() => setSelectedSchool(school)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Voir détails"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => setEditSchool(school)}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                        title="Modifier"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSchool(school.code)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: GESTION DES COMMUNES (ADD, EDIT, DELETE) ─── */}
      {isAddCommuneOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setIsAddCommuneOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Gestion des Communes</h3>
                <p className="text-xs text-slate-400 font-semibold">Ajouter, modifier ou supprimer des communes scolaires.</p>
              </div>
            </div>

            {/* Add Commune Form */}
            <form onSubmit={handleCreateCommune} className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase block">Ajouter une nouvelle commune</label>
              <div className="flex gap-2">
                <input 
                  required 
                  value={newCommuneName} 
                  onChange={e => setNewCommuneName(e.target.value)} 
                  placeholder="Ex: Niamey VI, Dosso Commune 1, Maradi Nord..." 
                  className="flex-1 h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-xs" 
                />
                <button 
                  type="submit" 
                  disabled={isAddingCommune}
                  className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus size={15} />
                  {isAddingCommune ? "..." : "Ajouter"}
                </button>
              </div>
            </form>

            {/* Registered Communes List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Communes Enregistrées ({communesList.length})</h4>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {communesList.map((commune) => {
                  const isEditing = editingCommuneName === commune;
                  const schoolCount = schoolsList.filter(s => s.commune === commune).length;

                  return (
                    <div key={commune} className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            value={editCommuneValue}
                            onChange={e => setEditCommuneValue(e.target.value)}
                            className="flex-1 h-9 px-3 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCommune(commune, editCommuneValue)}
                            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            title="Enregistrer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommuneName(null)}
                            className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              <MapPin size={14} />
                            </div>
                            <span className="font-bold text-xs text-slate-900">{commune}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 text-[10px] font-black">
                              {schoolCount} {schoolCount > 1 ? "écoles" : "école"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommuneName(commune);
                                setEditCommuneValue(commune);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Modifier cette commune"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommune(commune)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Supprimer cette commune"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsAddCommuneOpen(false)} 
                className="h-11 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAWER / MODAL: VIEW DETAILS ─── */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setSelectedSchool(null)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl">
                {selectedSchool.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedSchool.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Code: {selectedSchool.code} · Commune: {selectedSchool.commune}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Élèves Totaux</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.eleves}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{selectedSchool.filles} Filles / {selectedSchool.garcons} Garçons</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Personnel Enseignant</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.enseignants} Profs</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.enseignants)} élèves/prof</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Salles de classe</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.salles} Salles</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.salles)} élèves/salle</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Infrastructures & Services</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedSchool.eau === "Oui" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    <Droplets size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{selectedSchool.eau === "Oui" ? "Disponible" : "Non équipé"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedSchool.electricite === "Oui" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Électricité</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{selectedSchool.electricite === "Oui" ? "Disponible" : "Non raccordé"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Localisation & Cycle</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Cycle (Niveau)</span>
                  <span className="text-slate-900">{selectedSchool.cycle}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
                  <span className="text-slate-900">{selectedSchool.region}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
                  <span className="text-slate-900">{selectedSchool.commune}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Quartier</span>
                  <span className="text-slate-900">{selectedSchool.quartier}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Complétude canevas:</span>
                <span className="text-sm font-black text-indigo-600">{selectedSchool.completion}%</span>
              </div>
              <div className="flex gap-2">
                {selectedSchool.statut !== "Validé inspection" && (
                  <button 
                    onClick={() => { handleValidate(selectedSchool.code); setSelectedSchool(null); }}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Valider le canevas
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSchool(null)}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD SCHOOL ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Ajouter un établissement</h3>
            
            <form onSubmit={handleAddSchool} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école *</label>
                  <input required value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ex: ETB-2026-999" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Ecole Commune V" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {typesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle (Niveau d'Étude)</label>
                  <select value={newCycle} onChange={e => setNewCycle(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddCommuneOpen(true)}
                      className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Nouveau
                    </button>
                  </div>
                  <select value={newCommune} onChange={e => setNewCommune(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {communesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input value={newQuartier} onChange={e => setNewQuartier(e.target.value)} placeholder="Ex: Bobiel" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input type="number" value={newEleves} onChange={e => setNewEleves(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input type="number" value={newFilles} onChange={e => setNewFilles(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input type="number" value={newGarcons} onChange={e => setNewGarcons(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input type="number" value={newEnseignants} onChange={e => setNewEnseignants(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input type="number" value={newSalles} onChange={e => setNewSalles(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select value={newEau} onChange={e => setNewEau(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select value={newElectricite} onChange={e => setNewElectricite(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddOpen(false)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Créer l'établissement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT SCHOOL ─── */}
      {editSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setEditSchool(null)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Modifier l'établissement</h3>
            
            <form onSubmit={handleEditSchoolSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école (Non modifiable)</label>
                  <input readOnly value={editSchool.code} className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl outline-none font-semibold text-slate-400 text-sm cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input required value={editSchool.name} onChange={e => setEditSchool({ ...editSchool, name: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select value={editSchool.type} onChange={e => setEditSchool({ ...editSchool, type: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {typesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle (Niveau d'Étude)</label>
                  <select value={editSchool.cycle} onChange={e => setEditSchool({ ...editSchool, cycle: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddCommuneOpen(true)}
                      className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Nouveau
                    </button>
                  </div>
                  <select value={editSchool.commune} onChange={e => setEditSchool({ ...editSchool, commune: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    {communesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input value={editSchool.quartier} onChange={e => setEditSchool({ ...editSchool, quartier: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input type="number" value={editSchool.eleves} onChange={e => setEditSchool({ ...editSchool, eleves: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input type="number" value={editSchool.filles} onChange={e => setEditSchool({ ...editSchool, filles: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input type="number" value={editSchool.garcons} onChange={e => setEditSchool({ ...editSchool, garcons: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input type="number" value={editSchool.enseignants} onChange={e => setEditSchool({ ...editSchool, enseignants: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input type="number" value={editSchool.salles} onChange={e => setEditSchool({ ...editSchool, salles: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select value={editSchool.eau} onChange={e => setEditSchool({ ...editSchool, eau: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select value={editSchool.electricite} onChange={e => setEditSchool({ ...editSchool, electricite: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditSchool(null)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Sauvegarder les modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
