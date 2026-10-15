"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  CreditCard, Search, Filter, Printer, Download, Check, X, User,
  Sparkles, Layers, FileText, CheckCircle2, AlertCircle, Image as ImageIcon,
  ChevronLeft, ChevronRight, RefreshCw, Upload, Eye, EyeOff, LayoutGrid, ShieldCheck, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getBranches } from "@/domains/settings/actions/settings.actions";
import CardDesigner from "./designer/CardDesigner";
import { StudentCard } from "./StudentCard";
import { exportCardToPDF } from "./designer/cardExportEngine";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SAMPLE_STUDENTS = [
  // --- CI A ---
  { id: 325, nomEtudiant: "Maman Dan Falké", prenomEtudiant: "Aboubacar", numAdmission: "EDUT-2024-000325", classe: "CI A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2018-07-09", lieuNaissance: "Téra", nationalite: "Nigérienne", photoPath: null },
  { id: 330, nomEtudiant: "Abdoul Razak", prenomEtudiant: "Hamani", numAdmission: "EDUT-2024-000330", classe: "CI A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2018-03-12", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },
  { id: 331, nomEtudiant: "Balkissa", prenomEtudiant: "Seydou", numAdmission: "EDUT-2024-000331", classe: "CI A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2018-11-05", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },

  // --- CP A ---
  { id: 324, nomEtudiant: "Maman", prenomEtudiant: "Adah", numAdmission: "EDUT-2024-000324", classe: "CP A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2017-05-14", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },
  { id: 332, nomEtudiant: "Hadiza", prenomEtudiant: "Garba", numAdmission: "EDUT-2024-000332", classe: "CP A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2017-09-20", lieuNaissance: "Maradi", nationalite: "Nigérienne", photoPath: null },
  { id: 333, nomEtudiant: "Saley", prenomEtudiant: "Soumana", numAdmission: "EDUT-2024-000333", classe: "CP A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2017-02-18", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },

  // --- CE1 A ---
  { id: 323, nomEtudiant: "Maman", prenomEtudiant: "Biba", numAdmission: "EDUT-2024-000323", classe: "CE1 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2016-11-20", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },
  { id: 334, nomEtudiant: "Boubacar", prenomEtudiant: "Moussa", numAdmission: "EDUT-2024-000334", classe: "CE1 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2016-04-15", lieuNaissance: "Dosso", nationalite: "Nigérienne", photoPath: null },
  { id: 335, nomEtudiant: "Ramatou", prenomEtudiant: "Djibo", numAdmission: "EDUT-2024-000335", classe: "CE1 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2016-08-30", lieuNaissance: "Tillabéri", nationalite: "Nigérienne", photoPath: null },

  // --- CE2 A ---
  { id: 322, nomEtudiant: "Mamadou Ibrahim", prenomEtudiant: "Salifou", numAdmission: "EDUT-2024-000322", classe: "CE2 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2015-08-12", lieuNaissance: "Maradi", nationalite: "Nigérienne", photoPath: null },
  { id: 336, nomEtudiant: "Kadidiatou", prenomEtudiant: "Hassane", numAdmission: "EDUT-2024-000336", classe: "CE2 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2015-01-22", lieuNaissance: "Agadez", nationalite: "Nigérienne", photoPath: null },
  { id: 337, nomEtudiant: "Ali", prenomEtudiant: "Tankari", numAdmission: "EDUT-2024-000337", classe: "CE2 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2015-10-10", lieuNaissance: "Diffa", nationalite: "Nigérienne", photoPath: null },

  // --- CM1 A ---
  { id: 326, nomEtudiant: "Mahamadou Kane", prenomEtudiant: "Issaka", numAdmission: "EDUT-2024-000326", classe: "CM1 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2014-11-04", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },
  { id: 338, nomEtudiant: "Amina", prenomEtudiant: "Nouhou", numAdmission: "EDUT-2024-000338", classe: "CM1 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2014-06-17", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },
  { id: 339, nomEtudiant: "Yacouba", prenomEtudiant: "Amadou", numAdmission: "EDUT-2024-000339", classe: "CM1 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2014-03-25", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },

  // --- CM2 A ---
  { id: 327, nomEtudiant: "Aïssatou", prenomEtudiant: "Souley", numAdmission: "EDUT-2024-000327", classe: "CM2 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2013-02-18", lieuNaissance: "Agadez", nationalite: "Nigérienne", photoPath: null },
  { id: 340, nomEtudiant: "Sani", prenomEtudiant: "Yahaya", numAdmission: "EDUT-2024-000340", classe: "CM2 A", educationalLevel: "Primaire Général", sexe: "Garçon", dateNaissance: "2013-09-08", lieuNaissance: "Maradi", nationalite: "Nigérienne", photoPath: null },
  { id: 341, nomEtudiant: "Halima", prenomEtudiant: "Ousmane", numAdmission: "EDUT-2024-000341", classe: "CM2 A", educationalLevel: "Primaire Général", sexe: "Fille", dateNaissance: "2013-12-14", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },

  // --- 6ème A ---
  { id: 321, nomEtudiant: "Malam Balla", prenomEtudiant: "Sanoussi", numAdmission: "EDUT-2024-000321", classe: "6ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2012-03-18", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },
  { id: 342, nomEtudiant: "Rahinatou", prenomEtudiant: "Zakari", numAdmission: "EDUT-2024-000342", classe: "6ème A", educationalLevel: "Collège Général", sexe: "Fille", dateNaissance: "2012-07-22", lieuNaissance: "Dosso", nationalite: "Nigérienne", photoPath: null },
  { id: 343, nomEtudiant: "Hamza", prenomEtudiant: "Abdoulaye", numAdmission: "EDUT-2024-000343", classe: "6ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2012-10-30", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },

  // --- 5ème A ---
  { id: 320, nomEtudiant: "Malam Maina", prenomEtudiant: "Abass", numAdmission: "EDUT-2024-000320", classe: "5ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2011-12-05", lieuNaissance: "Diffa", nationalite: "Nigérienne", photoPath: null },
  { id: 344, nomEtudiant: "Mariama", prenomEtudiant: "Oumarou", numAdmission: "EDUT-2024-000344", classe: "5ème A", educationalLevel: "Collège Général", sexe: "Fille", dateNaissance: "2011-05-19", lieuNaissance: "Tillabéri", nationalite: "Nigérienne", photoPath: null },
  { id: 345, nomEtudiant: "Souleymane", prenomEtudiant: "Bello", numAdmission: "EDUT-2024-000345", classe: "5ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2011-08-11", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },

  // --- 4ème A ---
  { id: 319, nomEtudiant: "Malam Issoufou", prenomEtudiant: "Mme Hamiss", numAdmission: "EDUT-2024-000319", classe: "4ème A", educationalLevel: "Collège Général", sexe: "Fille", dateNaissance: "2010-09-30", lieuNaissance: "Dosso", nationalite: "Nigérienne", photoPath: null },
  { id: 346, nomEtudiant: "Ibrahim", prenomEtudiant: "Adamou", numAdmission: "EDUT-2024-000346", classe: "4ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2010-02-14", lieuNaissance: "Maradi", nationalite: "Nigérienne", photoPath: null },
  { id: 347, nomEtudiant: "Habiba", prenomEtudiant: "Salifou", numAdmission: "EDUT-2024-000347", classe: "4ème A", educationalLevel: "Collège Général", sexe: "Fille", dateNaissance: "2010-11-28", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },

  // --- 3ème A ---
  { id: 318, nomEtudiant: "Ousmane", prenomEtudiant: "Seydou", numAdmission: "EDUT-2024-000318", classe: "3ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2009-04-12", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },
  { id: 348, nomEtudiant: "Nafissatou", prenomEtudiant: "Bello", numAdmission: "EDUT-2024-000348", classe: "3ème A", educationalLevel: "Collège Général", sexe: "Fille", dateNaissance: "2009-07-07", lieuNaissance: "Agadez", nationalite: "Nigérienne", photoPath: null },
  { id: 349, nomEtudiant: "Kabirou", prenomEtudiant: "Moussa", numAdmission: "EDUT-2024-000349", classe: "3ème A", educationalLevel: "Collège Général", sexe: "Garçon", dateNaissance: "2009-12-01", lieuNaissance: "Diffa", nationalite: "Nigérienne", photoPath: null },

  // --- 2nde A ---
  { id: 317, nomEtudiant: "Hamadou", prenomEtudiant: "Garba", numAdmission: "EDUT-2024-000317", classe: "2nde A", educationalLevel: "Lycée Général", sexe: "Garçon", dateNaissance: "2008-01-25", lieuNaissance: "Tillabéri", nationalite: "Nigérienne", photoPath: null },
  { id: 350, nomEtudiant: "Zeinabou", prenomEtudiant: "Mahamane", numAdmission: "EDUT-2024-000350", classe: "2nde A", educationalLevel: "Lycée Général", sexe: "Fille", dateNaissance: "2008-08-16", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },

  // --- 1ère A ---
  { id: 316, nomEtudiant: "Zalika", prenomEtudiant: "Abdou", numAdmission: "EDUT-2024-000316", classe: "1ère A", educationalLevel: "Lycée Général", sexe: "Fille", dateNaissance: "2007-06-19", lieuNaissance: "Maradi", nationalite: "Nigérienne", photoPath: null },
  { id: 351, nomEtudiant: "Bachir", prenomEtudiant: "Harouna", numAdmission: "EDUT-2024-000351", classe: "1ère A", educationalLevel: "Lycée Général", sexe: "Garçon", dateNaissance: "2007-10-03", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },

  // --- L1 Arabic ---
  { id: 315, nomEtudiant: "Ibrahim", prenomEtudiant: "Salissou", numAdmission: "EDUT-2024-000315", classe: "L1 Arabic", educationalLevel: "Licence Général", sexe: "Garçon", dateNaissance: "2005-10-11", lieuNaissance: "Zinder", nationalite: "Nigérienne", photoPath: null },
  { id: 352, nomEtudiant: "Samira", prenomEtudiant: "Djibrilla", numAdmission: "EDUT-2024-000352", classe: "L1 Arabic", educationalLevel: "Licence Général", sexe: "Fille", dateNaissance: "2005-04-29", lieuNaissance: "Tillabéri", nationalite: "Nigérienne", photoPath: null },

  // --- L2 Arabic ---
  { id: 314, nomEtudiant: "Fatouma", prenomEtudiant: "Hassan", numAdmission: "EDUT-2024-000314", classe: "L2 Arabic", educationalLevel: "Licence Général", sexe: "Fille", dateNaissance: "2004-03-22", lieuNaissance: "Niamey", nationalite: "Nigérienne", photoPath: null },
  { id: 353, nomEtudiant: "Sidi Mohamed", prenomEtudiant: "Ali", numAdmission: "EDUT-2024-000353", classe: "L2 Arabic", educationalLevel: "Licence Général", sexe: "Garçon", dateNaissance: "2004-11-15", lieuNaissance: "Tahoua", nationalite: "Nigérienne", photoPath: null },
];

function isValidPhoto(path?: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const p = path.trim().toLowerCase();
  if (p.length === 0 || p.includes("placeholder")) return false;
  return true;
}

function normalizeSearchText(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function expandSearchText(str?: string | null): string {
  if (!str) return "";
  let norm = normalizeSearchText(str);

  // Class aliases expansion (e.g. Tle -> Terminale, 6e -> 6ème)
  let expansions = [norm];
  if (norm.includes("tle") || norm.includes("terminal")) {
    expansions.push("tle", "terminale", "terminal", "bac");
  }
  if (norm.includes("1ere") || norm.includes("1er") || norm.includes("premiere")) {
    expansions.push("1ere", "1er", "premiere");
  }
  if (norm.includes("2nde") || norm.includes("seconde")) {
    expansions.push("2nde", "2nd", "seconde");
  }
  if (norm.includes("3eme") || norm.includes("3e") || norm.includes("troisieme")) {
    expansions.push("3eme", "3e", "troisieme");
  }
  if (norm.includes("4eme") || norm.includes("4e") || norm.includes("quatrieme")) {
    expansions.push("4eme", "4e", "quatrieme");
  }
  if (norm.includes("5eme") || norm.includes("5e") || norm.includes("cinquieme")) {
    expansions.push("5eme", "5e", "cinquieme");
  }
  if (norm.includes("6eme") || norm.includes("6e") || norm.includes("sixieme")) {
    expansions.push("6eme", "6e", "sixieme");
  }

  return expansions.join(" ");
}

export default function CardStudioContainer() {
  const [activeTab, setActiveTab] = useState<"design" | "données" | "impression">("design");
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Search State
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "selected" | "no-photo">("all");
  const [cardSide, setCardSide] = useState<"recto" | "verso">("recto");
  const [printing, setPrinting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getStudents(), getBranches()])
      .then(([studRes, branchRes]: [any, any]) => {
        let studData: any[] = [];
        if (Array.isArray(studRes)) {
          studData = studRes;
        } else if (Array.isArray(studRes?.data)) {
          studData = studRes.data;
        } else if (Array.isArray(studRes?.data?.data)) {
          studData = studRes.data.data;
        }

        if (!Array.isArray(studData) || studData.length === 0) {
          studData = SAMPLE_STUDENTS;
        }

        const branchData = branchRes?.data?.data || branchRes?.data || [];

        setStudents(studData);
        if (studData.length > 0) {
          setPreviewStudentId(studData[0].id);
        }
        if (Array.isArray(branchData)) {
          setBranches(branchData);
        }
      })
      .catch((err) => {
        console.error("Error loading studio data:", err);
        setStudents(SAMPLE_STUDENTS);
        setPreviewStudentId(SAMPLE_STUDENTS[0].id);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePhotoUpload = (studentId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, photoPath: dataUrl } : s))
      );
      toast.success("Photo de l'élève ajoutée avec succès !");
    };
    reader.readAsDataURL(file);
  };

  const triggerUploadFor = (studentId: number) => {
    setUploadingStudentId(studentId);
    fileInputRef.current?.click();
  };

  // Filtered Students List for Left Sidebar (Searches: Name, Matricule/ID Reference, Class/Section)
  const filteredStudents = useMemo(() => {
    const q = normalizeSearchText(searchQuery);

    return students.filter((s) => {
      let match = true;
      if (q) {
        const rawTokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

        const nom = normalizeSearchText(s.nomEtudiant);
        const prenom = normalizeSearchText(s.prenomEtudiant);
        const fullName = `${nom} ${prenom}`;
        const reverseName = `${prenom} ${nom}`;
        const matricule = normalizeSearchText(`${s.numAdmission || ""} ${s.id || ""} ${s.studentId || ""}`);
        const classe = expandSearchText(`${s.classe || ""} ${s.section || ""} ${s.educationalLevel || ""} ${s.filiere || ""}`);

        // Synthetic keywords for generic class / matricule / name matching (e.g. typing "cl", "classe", "mat", "id")
        const keywords = "classe class cl matricule mat id eleve etudiant student";

        const haystack = `${fullName} ${reverseName} ${matricule} ${classe} ${keywords}`;

        match = rawTokens.every((tok) => {
          const normTok = normalizeSearchText(tok);
          const expandedTok = expandSearchText(normTok);
          const subwords = expandedTok.split(/\s+/).filter(Boolean);

          return (
            haystack.includes(normTok) ||
            subwords.some((sub) => haystack.includes(sub))
          );
        });
      }

      if (filterType === "selected") return match && selectedStudentIds.includes(s.id);
      if (filterType === "no-photo") return match && !isValidPhoto(s.photoPath);
      return match;
    });
  }, [students, searchQuery, filterType, selectedStudentIds]);

  // Active Preview Student
  const activeStudent = useMemo(() => {
    if (previewStudentId) {
      return students.find((s) => s.id === previewStudentId) || students[0] || null;
    }
    return students[0] || null;
  }, [students, previewStudentId]);

  const activeBranch = useMemo(() => {
    return branches[0] || null;
  }, [branches]);

  // Checkboxes Selection Logic
  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Selected Students List
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // Handle High-DPI Batch Print Execution
  const handleBatchPrint = async () => {
    const listToPrint = selectedStudents.length > 0 ? selectedStudents : (activeStudent ? [activeStudent] : []);
    if (listToPrint.length === 0) {
      toast.error("Veuillez sélectionner au moins un élève pour l'impression.");
      return;
    }

    setPrinting(true);
    const toastId = toast.loading(`Préparation de ${listToPrint.length} carte(s) pour l'impression...`);

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const cardsPerPage = 9; // 3 cols x 3 rows grid
      const cardW = 85.6;
      const cardH = 54.0;
      const startX = 20.1;
      const startY = 24.0;

      // Temporary capture
      if (printRef.current) {
        const cardNodes = printRef.current.querySelectorAll<HTMLElement>(".batch-print-card");
        for (let i = 0; i < cardNodes.length; i++) {
          const cardNode = cardNodes[i];
          const canvas = await html2canvas(cardNode, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const pageIndex = Math.floor(i / cardsPerPage);
          const cardOnPage = i % cardsPerPage;
          const col = cardOnPage % 3;
          const row = Math.floor(cardOnPage / 3);

          const posX = startX + col * cardW;
          const posY = startY + row * cardH;

          if (cardOnPage === 0 && pageIndex > 0) {
            pdf.addPage("a4", "landscape");
          }

          pdf.addImage(imgData, "PNG", posX, posY, cardW, cardH);
          pdf.setDrawColor(220, 225, 230);
          pdf.setLineWidth(0.15);
          pdf.rect(posX, posY, cardW, cardH);
        }
      }

      pdf.save(`Cartes_ID_Batch_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Document PDF généré avec succès ! (${listToPrint.length} carte(s))`, { id: toastId });
    } catch (err: any) {
      console.error("Print Error:", err);
      toast.error("Erreur lors de la génération PDF", { id: toastId });
    } finally {
      setPrinting(false);
    }
  };

  const countWithPhoto = useMemo(() => students.filter((s) => isValidPhoto(s.photoPath)).length, [students]);
  const countNoPhoto = useMemo(() => students.filter((s) => !isValidPhoto(s.photoPath)).length, [students]);

  return (
    <div className="h-screen bg-slate-100 dark:bg-[#0b0d14] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Hidden File Input for Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => uploadingStudentId && handlePhotoUpload(uploadingStudentId, e)}
        className="hidden"
      />

      {/* Top Header Bar with Main Tabs */}
      <header className="h-16 bg-white dark:bg-[#131622] border-b border-slate-200/80 dark:border-slate-800 px-8 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-none">Studio Cartes ID</h1>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Pro
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-0.5">
              Conception, gestion des données et impression HD 300 DPI
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs: Design | Données | Impression */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("design")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "design"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            }`}
          >
            <Sparkles size={14} /> Design
          </button>
          <button
            onClick={() => setActiveTab("données")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "données"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            }`}
          >
            <FileText size={14} /> Données ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("impression")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "impression"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            }`}
          >
            <Printer size={14} /> Impression ({selectedStudentIds.length || 1})
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBatchPrint}
            disabled={printing}
            className="h-10 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2"
          >
            {printing ? <RefreshCw size={15} className="animate-spin" /> : <Printer size={15} />}
            {printing ? "Génération PDF..." : `Imprimer les cartes (${selectedStudentIds.length || 1})`}
          </Button>
        </div>
      </header>

      {/* Main Container Layout: Left Student Selection Panel + Tab View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: SÉLECTION DES ÉLÈVES */}
        <aside className="w-80 bg-white dark:bg-[#131622] border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full z-20 shadow-sm">
          {/* Sidebar Header & Counter */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              Sélection des élèves
            </h3>
            <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800">
              {selectedStudentIds.length} sél.
            </span>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131622]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <Input
                type="text"
                placeholder="Nom, matricule, classe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50/60 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 mt-2.5">
              <button
                onClick={() => setFilterType("all")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tous ({students.length})
              </button>
              <button
                onClick={() => setFilterType("selected")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "selected" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Sél. ({selectedStudentIds.length})
              </button>
              <button
                onClick={() => setFilterType("no-photo")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "no-photo" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Sans photo
              </button>
            </div>
          </div>

          {/* Select All Checkbox Bar */}
          <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Tout sélectionner</span>
            </label>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {filteredStudents.length} élèves
            </span>
          </div>

          {/* Student Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">
                Chargement de la liste des élèves...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                Aucun élève trouvé.
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                const isPreviewing = previewStudentId === st.id;
                const hasPhoto = isValidPhoto(st.photoPath);

                let photoUrl = hasPhoto ? st.photoPath : null;
                if (photoUrl && (photoUrl.startsWith("C:") || photoUrl.startsWith("file:"))) {
                  photoUrl = `/api/files?path=${encodeURIComponent(photoUrl)}`;
                }

                return (
                  <div
                    key={st.id}
                    onClick={() => setPreviewStudentId(st.id)}
                    className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer group ${
                      isPreviewing
                        ? "bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 shadow-sm"
                        : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleStudentSelection(st.id);
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                      />

                      {/* Student Avatar */}
                      <div className="relative w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {hasPhoto && photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={st.nomEtudiant}
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-xs uppercase">
                            {st.nomEtudiant?.[0] || "E"}
                          </div>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black truncate leading-snug ${isPreviewing ? "text-indigo-950 dark:text-indigo-200" : "text-slate-900 dark:text-slate-100"}`}>
                          {st.nomEtudiant} {st.prenomEtudiant}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                          {st.classe || "Classe N/A"} • <span className="font-mono">{st.numAdmission || "N/A"}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {hasPhoto ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Prêt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Photo manquante
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Content Panel (Design | Données | Impression) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-[#0b0d14]">
          {activeTab === "design" ? (
            <CardDesigner
              externalStudents={students}
              externalPreviewStudentId={previewStudentId}
              onExternalPreviewStudentChange={setPreviewStudentId}
              externalActiveBranch={activeBranch}
            />
          ) : activeTab === "données" ? (
            /* Tab 2: Students Data Table & Photo Management */
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#131622] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Données des élèves pour les cartes d'identité</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Gérez les photos, matricules et vérifiez l'état de préparation des cartes scolaires.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-100 dark:border-emerald-800">
                    {countWithPhoto} avec photo
                  </span>
                  <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-100 dark:border-amber-800">
                    {countNoPhoto} photos manquantes
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Élève</th>
                      <th className="py-3.5 px-4">Matricule</th>
                      <th className="py-3.5 px-4">Classe</th>
                      <th className="py-3.5 px-4">Genre</th>
                      <th className="py-3.5 px-4">Statut Photo</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                    {filteredStudents.map((st) => {
                      const hasPhoto = isValidPhoto(st.photoPath);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              {hasPhoto && st.photoPath ? (
                                <img
                                  src={st.photoPath.startsWith("http") ? st.photoPath : `/api/files?path=${encodeURIComponent(st.photoPath)}`}
                                  alt={st.nomEtudiant}
                                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-xs uppercase">
                                  {st.nomEtudiant?.[0] || "E"}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{st.nomEtudiant} {st.prenomEtudiant}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">{st.numAdmission || "N/A"}</td>
                          <td className="py-3 px-4">{st.classe || "Non assignée"}</td>
                          <td className="py-3 px-4">{st.sexe || "N/A"}</td>
                          <td className="py-3 px-4">
                            {hasPhoto ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full font-bold text-[10px] border border-emerald-100 dark:border-emerald-800">
                                <CheckCircle2 size={12} /> Prêt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full font-bold text-[10px] border border-amber-100 dark:border-amber-800">
                                <AlertCircle size={12} /> Photo manquante
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerUploadFor(st.id)}
                                className="rounded-xl font-bold text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800"
                              >
                                <Upload size={12} className="mr-1" /> Photo
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPreviewStudentId(st.id);
                                  setActiveTab("design");
                                }}
                                className="rounded-xl font-bold text-[11px] border-slate-200 dark:border-slate-700"
                              >
                                <Eye size={13} className="mr-1" /> Aperçu Carte
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tab 3: HD 300 DPI Batch Print Preview Hub */
            <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={printRef}>
              <div className="bg-white dark:bg-[#131622] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Aperçu avant impression HD (300 DPI)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Grille d'impression CR80 Standard (85.6 × 54 mm) format A4 Paysage.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleBatchPrint}
                    disabled={printing}
                    className="h-10 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2"
                  >
                    <Printer size={16} /> Imprimer {selectedStudents.length || 1} carte(s)
                  </Button>
                </div>
              </div>

              {/* High Resolution Print Grid Container */}
              <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 flex flex-col items-center">
                <div className="grid grid-cols-3 gap-6 max-w-5xl">
                  {(selectedStudents.length > 0 ? selectedStudents : (activeStudent ? [activeStudent] : [])).map((st) => (
                    <div key={st.id} className="batch-print-card shadow-md rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform">
                      <StudentCard
                        student={st}
                        schoolName={activeBranch?.nomBranch || "ÉCOLE GESTION PRO"}
                        academicYear="2025-2026"
                        side={cardSide}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
