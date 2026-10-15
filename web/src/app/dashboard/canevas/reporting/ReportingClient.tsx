"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import UniversalReport from "@/components/reporting/universal-report";

// List of 16 required reports
const reportTypes = [
  { id: "global", label: "Rapport global des établissements", desc: "Synthèse générale de toutes les structures scolaires" },
  { id: "identification", label: "Rapport identification", desc: "Informations d'identification administrative des écoles" },
  { id: "effectifs", label: "Rapport effectifs élèves", desc: "Nombre d'élèves par niveau et par cycle" },
  { id: "filles_garcons", label: "Rapport filles/garçons", desc: "Indice de parité et répartition par genre" },
  { id: "redoublants", label: "Rapport redoublants", desc: "Statistiques de redoublement par classe et genre" },
  { id: "personnel", label: "Rapport personnel", desc: "Nombre d'enseignants, directeurs et statuts professionnels" },
  { id: "infrastructures", label: "Rapport infrastructures", desc: "État des salles de classe, bureaux et équipements" },
  { id: "mobilier", label: "Rapport mobilier", desc: "Disponibilité des tables-bancs, armoires et chaises" },
  { id: "manuels", label: "Rapport manuels", desc: "Ratio de manuels scolaires par élève et discipline" },
  { id: "guides", label: "Rapport guides", desc: "Disponibilité des guides pédagogiques pour enseignants" },
  { id: "besoins", label: "Rapport besoins", desc: "Synthèse des besoins prioritaires formulés par les écoles" },
  { id: "public_prive", label: "Rapport public/privé", desc: "Comparatif sectoriel public et privé" },
  { id: "commune", label: "Rapport par commune", desc: "Répartition géographique et synthèse par commune" },
  { id: "inspection", label: "Rapport par inspection", desc: "Synthèse par Inspection de l'Enseignement (IEFA)" },
  { id: "qualite", label: "Rapport contrôle qualité", desc: "Taux de complétude et détection des anomalies de saisie" },
  { id: "non_mappe", label: "Rapport données non mappées", desc: "Champs bruts conservés lors des imports Excel" },
];

interface ReportingClientProps {
  sessions?: any[];
  activeSessionName?: string;
  headerConfig?: any | null;
  initialCanevasReferences?: {
    type?: any[];
    cycle?: any[];
    commune?: any[];
  };
  educationalLevels?: any[];
}

export default function ReportingClient({
  sessions = [],
  activeSessionName,
  headerConfig,
  initialCanevasReferences,
  educationalLevels = []
}: ReportingClientProps) {
  const [selectedReport, setSelectedReport] = useState("global");
  
  // Dynamic References
  const communesList = Array.from(new Set([
    "Niamey I", "Niamey II", "Niamey III", "Niamey IV", "Niamey V",
    ...(initialCanevasReferences?.commune || []).map((c: any) => c.value || c)
  ]));

  const cyclesList = Array.from(new Set([
    "Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur",
    ...(educationalLevels || []).map((l: any) => l.levelName || l.name || l),
    ...(initialCanevasReferences?.cycle || []).map((c: any) => c.value || c)
  ]));
  
  // Filters state
  const defaultSession = activeSessionName || "2024-2025";
  const [year, setYear] = useState(defaultSession);
  const [region, setRegion] = useState("Niamey");
  const [commune, setCommune] = useState("Toutes");
  const [inspection, setInspection] = useState("Toutes");
  const [establishment, setEstablishment] = useState("");

  const activeReport = reportTypes.find((r) => r.id === selectedReport) || reportTypes[0];

  // Helper to generate dynamic mock data for each report type
  const getReportData = (id: string) => {
    switch (id) {
      case "identification":
        return {
          title: "RAPPORT D'IDENTIFICATION",
          subtitle: "Données administratives et géographiques des structures",
          description: "Ce rapport répertorie les coordonnées géographiques, codes officiels, contacts et types d'accès de tous les établissements.",
          kpis: [
            { label: "Total Écoles", value: "5", subtext: "100% gérées", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Mise à jour", value: "100%", subtext: "Aucun retard", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Statut Légal", "Région", "Commune", "Quartier", "Contact"],
            rows: [
              ["ETB-001", "Ecole Excellence", "Privé Agréé", "Niamey", "Commune IV", "Yantala", "+227 96 00 11 22"],
              ["ETB-018", "Ecole Primaire Bobiel", "Public Officiel", "Niamey", "Commune I", "Bobiel", "+227 90 33 44 55"],
              ["ETB-043", "Complexe Scolaire Sahel", "Privé Agréé", "Niamey", "Commune II", "Plateau", "+227 89 22 33 44"],
              ["ETB-067", "Ecole Publique Lazaret", "Public Officiel", "Niamey", "Commune III", "Lazaret", "+227 94 44 55 66"],
              ["ETB-104", "Lycee Municipal Est", "Public Officiel", "Niamey", "Commune V", "Aeroport", "+227 91 55 66 77"],
            ],
            summary: [
              { label: "Écoles Publiques", value: "3", color: "text-indigo-600" },
              { label: "Écoles Privées", value: "2", color: "text-violet-600" }
            ]
          }
        };

      case "effectifs":
        return {
          title: "RAPPORT DES EFFECTIFS ÉLÈVES",
          subtitle: "Répartition des inscriptions scolaires par cycle",
          description: "Indicateurs détaillés sur le nombre d'élèves par cycle et par classe dans l'ensemble des établissements d'inspection.",
          kpis: [
            { label: "Total Élèves", value: "3 663", subtext: "Inscrits validés", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Filles Inscrites", value: "1 789", subtext: "48.8% de l'effectif", icon: <Users />, color: "text-pink-600", bgColor: "bg-pink-50" },
            { label: "Garçons Inscrits", value: "1 874", subtext: "51.2% de l'effectif", icon: <Users />, color: "text-blue-600", bgColor: "bg-blue-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Cycle", "Garçons", "Filles", "Total Éléves"],
            rows: [
              ["ETB-001", "Ecole Excellence", "Primaire", "324", "318", "642"],
              ["ETB-018", "Ecole Primaire Bobiel", "Primaire", "245", "236", "481"],
              ["ETB-043", "Complexe Scolaire Sahel", "Collège", "482", "452", "934"],
              ["ETB-067", "Ecole Publique Lazaret", "Primaire", "198", "190", "388"],
              ["ETB-104", "Lycee Municipal Est", "Lycée", "625", "593", "1 218"],
            ],
            summary: [
              { label: "Cumul Garçons", value: "1 874", color: "text-blue-600" },
              { label: "Cumul Filles", value: "1 789", color: "text-pink-600" },
              { label: "Cumul Général", value: "3 663", color: "text-indigo-600" }
            ]
          }
        };

      case "filles_garcons":
        return {
          title: "RAPPORT FILLES / GARÇONS",
          subtitle: "Indice de parité de genre par établissement",
          description: "Analyse comparative du taux de scolarisation des filles par rapport aux garçons pour identifier les écarts régionaux.",
          kpis: [
            { label: "Indice Parité", value: "0.95", subtext: "Objectif national 1.00", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Taux Scolarité Filles", value: "48.8%", subtext: "+1.2% vs l'an dernier", icon: <Users />, color: "text-pink-600", bgColor: "bg-pink-50" },
          ],
          table: {
            headers: ["Établissement", "Effectif Filles", "Taux Filles (%)", "Effectif Garçons", "Taux Garçons (%)", "Indice Parité"],
            rows: [
              ["Ecole Excellence", "318", "49.5%", "324", "50.5%", "0.98"],
              ["Ecole Primaire Bobiel", "236", "49.0%", "245", "51.0%", "0.96"],
              ["Complexe Scolaire Sahel", "452", "48.4%", "482", "51.6%", "0.94"],
              ["Ecole Publique Lazaret", "190", "49.0%", "198", "51.0%", "0.96"],
              ["Lycee Municipal Est", "593", "48.7%", "625", "51.3%", "0.95"],
            ],
            summary: [
              { label: "Moyenne Indice Parité", value: "0.95", color: "text-emerald-600" }
            ]
          }
        };

      case "personnel":
        return {
          title: "RAPPORT DU PERSONNEL ENSEIGNANT",
          subtitle: "Répartition et encadrement pédagogique",
          description: "Synthèse des ressources humaines enseignantes, taux de qualification et ratios élèves par enseignant.",
          kpis: [
            { label: "Total Staff", value: "151", subtext: "Enseignants actifs", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Ratio Élèves/Prof", value: "24", subtext: "Moyenne nationale : 35", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Établissement", "Directeur", "Profs Titulaires", "Profs Contractuels", "Total Personnel", "Ratio Élèves/Prof"],
            rows: [
              ["Ecole Excellence", "M. Kazi", "18", "6", "24", "27"],
              ["Ecole Primaire Bobiel", "Mme Sani", "10", "6", "16", "30"],
              ["Complexe Scolaire Sahel", "M. Issa", "28", "13", "41", "23"],
              ["Ecole Publique Lazaret", "Mme Ouma", "8", "5", "13", "30"],
              ["Lycee Municipal Est", "M. Bako", "42", "16", "58", "21"],
            ],
            summary: [
              { label: "Titulaires", value: "106", color: "text-indigo-600" },
              { label: "Contractuels", value: "46", color: "text-violet-600" }
            ]
          }
        };

      case "infrastructures":
        return {
          title: "RAPPORT DES INFRASTRUCTURES",
          subtitle: "État des locaux et équipements scolaires",
          description: "Diagnostic de la structure matérielle des écoles : salles de classe disponibles, alimentation eau/électricité.",
          kpis: [
            { label: "Total Salles", value: "94", subtext: "Salles de classe", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Accès Eau", value: "80%", subtext: "4/5 Établissements", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
            { label: "Accès Électricité", value: "80%", subtext: "4/5 Établissements", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Établissement", "Salles de classe", "État général", "Point d'eau", "Électricité", "Latrines"],
            rows: [
              ["Ecole Excellence", "18", "Excellent", "Oui", "Oui", "Disponible (12)"],
              ["Ecole Primaire Bobiel", "12", "Bon", "Non", "Oui", "Disponible (6)"],
              ["Complexe Scolaire Sahel", "26", "Très Bon", "Oui", "Oui", "Disponible (18)"],
              ["Ecole Publique Lazaret", "9", "À rénover", "Oui", "Non", "Inexistant"],
              ["Lycee Municipal Est", "34", "Excellent", "Oui", "Oui", "Disponible (24)"],
            ],
            summary: [
              { label: "Total Salles", value: "94", color: "text-indigo-600" }
            ]
          }
        };

      // Default fallback (Rapport Global)
      default:
        return {
          title: "RAPPORT GLOBAL DES ÉTABLISSEMENTS",
          subtitle: "Synthèse générale des canevas scolaires",
          description: "Ce rapport récapitule l'ensemble des données clés des écoles pour l'inspection académique active.",
          kpis: [
            { label: "Établissements", value: "5", subtext: "Registre actif", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Publics", value: "3", subtext: "Secteur d'État", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
            { label: "Privés", value: "2", subtext: "Secteur Libre", icon: <Building2 />, color: "text-violet-600", bgColor: "bg-violet-50" },
            { label: "Total Élèves", value: "3 663", subtext: "Effectif global", icon: <Users />, color: "text-blue-600", bgColor: "bg-blue-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Type", "Cycle", "Région", "Commune", "Élèves", "Statut"],
            rows: [
              ["ETB-2026-001", "Ecole Excellence", "Prive", "Primaire", "Niamey", "Niamey IV", "642", "Valide"],
              ["ETB-2026-018", "Ecole Primaire Bobiel", "Public", "Primaire", "Niamey", "Niamey I", "481", "A verifier"],
              ["ETB-2026-043", "Complexe Scolaire Sahel", "Prive", "College", "Niamey", "Niamey II", "934", "Valide"],
              ["ETB-2026-067", "Ecole Publique Lazaret", "Public", "Primaire", "Niamey", "Niamey III", "388", "Incomplet"],
              ["ETB-2026-104", "Lycee Municipal Est", "Public", "Lycee", "Niamey", "Niamey V", "1218", "Valide"],
            ],
            summary: [
              { label: "Nombre d'établissements", value: "5", color: "text-slate-500" },
              { label: "Effectif cumulé", value: "3 663", color: "text-indigo-600" }
            ]
          }
        };
    }
  };

  const reportData = getReportData(selectedReport);

  const handleSendEmailDone = (email: string) => {
    toast.success(`Rapport envoyé par email à : ${email}`);
    return true;
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0">
      
      {/* ─── WEB HEADER (Hidden on print) ─── */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Centre de Reporting</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Générez et exportez des rapports administratifs d'impression A4</p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── FILTERS PANEL (Hidden on print) ─── */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={17} className="text-indigo-600" />
          <h2 className="text-sm font-black text-slate-990">Filtres Généraux</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Année Scolaire</span>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              {sessions.map((s: any) => (
                <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
              ))}
              {sessions.length === 0 && (
                <>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Niamey">Niamey</option>
              <option value="Maradi">Maradi</option>
              <option value="Zinder">Zinder</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
            <select value={commune} onChange={(e) => setCommune(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Toutes</option>
              {communesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Inspection</span>
            <select value={inspection} onChange={(e) => setInspection(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Toutes</option>
              <option value="IEFA I">IEFA I</option>
              <option value="IEFA II">IEFA II</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Établissement</span>
            <input value={establishment} onChange={(e) => setEstablishment(e.target.value)} placeholder="Ex: Excellence" className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white" />
          </div>
        </div>
      </section>

      {/* ─── MAIN LAYOUT ─── */}
      <section className="grid gap-5 xl:grid-cols-[280px_1fr]">
        
        {/* Left pane: Report selector (Hidden on print) */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden max-h-[780px] overflow-y-auto custom-scrollbar">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 px-2">Types de Rapports</h2>
          <div className="space-y-1.5">
            {reportTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition text-xs font-bold leading-normal cursor-pointer",
                  selectedReport === r.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <p className="font-black truncate">{r.label}</p>
                <p className={cn("text-[10px] mt-0.5 font-medium truncate", selectedReport === r.id ? "text-indigo-100" : "text-slate-400")}>
                  {r.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right pane: UniversalReport component */}
        <div className="w-full">
          <UniversalReport
            metadata={{
              title: reportData.title,
              subtitle: reportData.subtitle,
              moduleName: "GESTION DES CANEVAS SCOLAIRES",
              reportId: `RPT-${selectedReport.toUpperCase()}-2026-0001`,
              academicYear: year,
              editorName: "Admin Super",
              description: reportData.description,
              isLandscape: true,
              documentHeaderConfig: headerConfig,
            }}
            kpis={reportData.kpis}
            table={reportData.table}
            onSendEmail={handleSendEmailDone}
          />
        </div>
        
      </section>

    </div>
  );
}
