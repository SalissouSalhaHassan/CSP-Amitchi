"use client";

import * as React from "react";
import { useState, useTransition, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Table,
  FileSpreadsheet,
  Users,
  BookOpen,
  Briefcase,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  importStudentRow,
  importEmployeeRow,
  importSubjectRow,
  importExamResultRow,
  importClassLevelRow,
  importSectionSubjectRow,
  importClassSubjectRow
} from "@/domains/importation/actions/import.actions";
import { cn } from "@/lib/utils";

type ImportType = "student" | "employee" | "subject" | "exam_result" | "class_level" | "section_subject" | "class_subject";

interface FieldInfo {
  key: string;
  label: string;
  required: boolean;
}

const FIELDS: Record<ImportType, FieldInfo[]> = {
  student: [
    { key: "numAdmission", label: "Matricule (N° Admission) *", required: true },
    { key: "nomEtudiant", label: "Nom complet de l'élève *", required: true },
    { key: "nomArabe", label: "Nom en Arabe", required: false },
    { key: "sexe", label: "Sexe (Garçon/Fille)", required: false },
    { key: "religion", label: "Religion", required: false },
    { key: "dateNaissance", label: "Date de Naissance", required: false },
    { key: "lieuNaissance", label: "Lieu de Naissance", required: false },
    { key: "cnic", label: "NIN / CNIC", required: false },
    { key: "groupeSanguin", label: "Groupe Sanguin", required: false },
    { key: "session", label: "Année Scolaire (Session)", required: false },
    { key: "educationalLevel", label: "Niveau Éducatif (Collège/Lycée...)", required: false },
    { key: "classe", label: "Classe", required: false },
    { key: "section", label: "Section / Filière", required: false },
    { key: "categorie", label: "Catégorie", required: false },
    { key: "nomPere", label: "Nom du Père / Tuteur", required: false },
    { key: "cnicPere", label: "CNIC Père / Tuteur", required: false },
    { key: "mobile", label: "Téléphone", required: false },
    { key: "whatsapp", label: "WhatsApp", required: false },
    { key: "fraisMensuels", label: "Scolarité Mensuelle (CFA)", required: false },
    { key: "ancienSolde", label: "Ancien Solde (CFA)", required: false },
    { key: "fraisInscription", label: "Frais d'Inscription (CFA)", required: false },
    { key: "fraisCogesCard", label: "Frais COGES / Cartes ID (CFA)", required: false },
    { key: "fraisTransportInternat", label: "Transport / Internat (CFA)", required: false },
    { key: "statut", label: "Statut (Actif/Inactif)", required: false },
    { key: "behaviorScore", label: "Note de Conduite (0-20)", required: false }
  ],
  employee: [
    { key: "empId", label: "Identifiant Employé (ID) *", required: true },
    { key: "nom", label: "Nom complet *", required: true },
    { key: "dateNaissance", label: "Date de Naissance", required: false },
    { key: "lieuNaissance", label: "Lieu de Naissance", required: false },
    { key: "sexe", label: "Sexe (Homme/Femme)", required: false },
    { key: "mobile", label: "Téléphone Mobile", required: false },
    { key: "email", label: "Adresse E-mail", required: false },
    { key: "codeGrade", label: "Code Grade", required: false },
    { key: "categorie", label: "Catégorie", required: false },
    { key: "classe", label: "Classe", required: false },
    { key: "echelon", label: "Échelon", required: false },
    { key: "poste", label: "Poste / Fonction", required: false },
    { key: "fonction", label: "Fonction", required: false },
    { key: "dateNomination", label: "Date Nomination au Poste", required: false },
    { key: "lieuAffectation", label: "Lieu d'Affectation", required: false },
    { key: "commune", label: "Commune", required: false },
    { key: "departement", label: "Département", required: false },
    { key: "region", label: "Région", required: false },
    { key: "dateAffectation", label: "Date Affectation", required: false },
    { key: "salaireBase", label: "Salaire de Base (CFA)", required: false },
    { key: "dateEmbauche", label: "Date d'Embauche", required: false },
    { key: "cnic", label: "NIN / CNIC", required: false },
    { key: "adresse", label: "Adresse Résidentielle", required: false },
    { key: "banqueNom", label: "Nom de la Banque", required: false },
    { key: "banqueCompte", label: "Compte Bancaire (RIB)", required: false },
    { key: "statut", label: "Statut (Actif/Inactif)", required: false },
    { key: "educationalLevel", label: "Niveau d'Enseignement", required: false }
  ],
  subject: [
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "subjectCode", label: "Code Matière", required: false },
    { key: "category", label: "Catégorie (Littéraire/Scientifique)", required: false },
    { key: "sectionName", label: "Section / Filière (ex: Terminale D)", required: false },
    { key: "educationalLevel", label: "Niveau Éducatif (ex: Lycée, Collège)", required: false },
    { key: "coefficient", label: "Coefficient", required: false },
    { key: "credits", label: "Crédits", required: false },
    { key: "term", label: "Semestre / Période (Optionnel)", required: false }
  ],
  exam_result: [
    { key: "examName", label: "Nom de l'Examen *", required: true },
    { key: "className", label: "Nom de la Classe *", required: true },
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "numAdmission", label: "Matricule de l'Élève *", required: true },
    { key: "classWorkScore", label: "MOY. CLASSE", required: false },
    { key: "examScore", label: "NOTE COMPO", required: false },
    { key: "marksObtained", label: "Note Obtenue / Moyenne finale", required: false },
    { key: "periodName", label: "Trimestre / Semestre", required: false },
    { key: "sessionName", label: "Année scolaire / Session", required: false },
    { key: "maxMarks", label: "Note Maximale (ex: 20)", required: false },
    { key: "remarks", label: "Appréciation / Remarques", required: false },
    { key: "examDate", label: "Date de l'Examen", required: false }
  ],
  class_level: [
    { key: "className", label: "Nom de la Classe *", required: true },
    { key: "sectionName", label: "Nom de la Section *", required: true },
    { key: "educationalLevel", label: "Niveau Éducatif *", required: true },
    { key: "roomName", label: "Salle de classe / Division", required: false },
    { key: "scolariteMensuelle", label: "Scolarité Mensuelle (CFA)", required: false },
    { key: "droitsInscription", label: "Frais d'Inscription (CFA)", required: false },
    { key: "cogesCarteId", label: "Frais COGES / Cartes ID (CFA)", required: false },
    { key: "transportInternat", label: "Transport / Internat (CFA)", required: false },
    { key: "ancienSolde", label: "Ancien solde initial (CFA)", required: false },
    { key: "statutInitial", label: "Statut (Actif/Inactif)", required: false }
  ],
  section_subject: [
    { key: "sectionName", label: "Nom de la Section *", required: true },
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "coefficient", label: "Coefficient", required: false },
    { key: "term", label: "Trimestre / Période (ex: 1er Trimestre)", required: false },
    { key: "isEliminatory", label: "Éliminatoire (Oui/Non)", required: false }
  ],
  class_subject: [
    { key: "className", label: "Nom de la Classe *", required: true },
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "coefficient", label: "Coefficient", required: false },
    { key: "semester", label: "Semestre / Période", required: false },
    { key: "teacherName", label: "Nom de l'Enseignant", required: false }
  ]
};

const KEYWORDS: Record<string, string[]> = {
  numAdmission: ["matricule", "admission", "num", "reg", "id", "matricule_eleve", "numadmission"],
  nomEtudiant: ["nom", "name", "student", "eleve", "etudiant", "nom_complet", "nometudiant"],
  nomArabe: ["arabe", "arabic", "nom_arabe", "nomarabe"],
  sexe: ["sexe", "gender", "genre"],
  religion: ["religion", "foi"],
  dateNaissance: ["naissance", "birth", "dob", "date_naissance", "datenaissance"],
  lieuNaissance: ["lieu", "lieu_naissance", "place", "lieunaissance", "lieu name", "lieu de naissance"],
  cnic: ["cnic", "nin", "carte", "identite"],
  groupeSanguin: ["sanguin", "blood", "groupe_sanguin", "groupesanguin"],
  session: ["session", "annee", "annee_scolaire", "session_scolaire"],
  educationalLevel: ["cycle", "niveau_educatif", "educational_level", "educationallevel", "niveau"],
  classe: ["classe", "class", "niveau_classe"],
  section: ["section", "filiere", "serie"],
  categorie: ["categorie", "category"],
  nomPere: ["pere", "tuteur", "parent", "father", "nompere"],
  cnicPere: ["cnic_pere", "nin_pere", "tuteur_cnic", "cnicpere"],
  mobile: ["mobile", "tel", "phone", "contact", "telephone"],
  whatsapp: ["whatsapp", "wa"],
  fraisMensuels: ["mensuel", "frais_mensuels", "monthly", "mensualite", "fraismensuels"],
  ancienSolde: ["ancien_solde", "solde", "balance", "arriere", "anciensolde"],
  fraisInscription: ["inscription", "frais_inscription", "fraisinscription"],
  fraisCogesCard: ["coges", "frais_coges", "coges_card", "fraiscogescard"],
  fraisTransportInternat: ["transport_internat", "transport", "internat", "fraistransportinternat"],
  statut: ["statut", "status", "etat"],
  behaviorScore: ["conduite", "behavior", "behaviour", "score_conduite", "behaviorscore"],

  empId: ["emp_id", "id", "matricule", "identifiant", "empid"],
  nom: ["nom", "name", "employe", "staff", "nom_complet"],
  poste: ["poste", "job", "designation", "fonction"],
  departement: ["dept", "departement", "service", "section"],
  dateEmbauche: ["embauche", "hire", "date_embauche", "dateembauche"],
  salaireBase: ["salaire", "salary", "pay", "base", "salaire_base", "salairebase"],
  adresse: ["adresse", "address"],
  banqueNom: ["banque", "bank", "banque_nom", "banquenom"],
  banqueCompte: ["compte", "account", "banque_compte", "banquecompte"],
  codeGrade: ["code_grade", "codegrade", "code grade"],
  echelon: ["echelon", "echellon"],
  fonction: ["fonction", "function"],
  dateNomination: ["date_nomination", "datenomination", "date nomination"],
  lieuAffectation: ["lieu_affectation", "lieuaffectation", "affectation lieu", "lieu d'affectation"],
  commune: ["commune", "city"],
  region: ["region"],
  dateAffectation: ["date_affectation", "dateaffectation", "date affectation"],

  subjectName: ["matiere", "subject", "cours", "course", "nom_matiere", "subjectname"],
  subjectCode: ["code", "subject_code", "code_matiere", "subjectcode"],
  category: ["categorie", "category", "type"],
  sectionName: ["section_name", "section", "filiere", "sectionname", "nom_section", "serie"],
  coefficient: ["coefficient", "coef", "default_coef", "defaultcoef", "coef_matiere"],
  credits: ["credits", "credit", "nbr_credit"],
  term: ["term", "semestre", "periode", "trimestre"],
  examName: ["examen", "exam", "examname", "nom_examen", "titre_examen"],
  className: ["classe", "class", "classname", "nom_classe"],
  classWorkScore: ["moy. classe", "moy classe", "moyenne classe", "moyenne_classe", "moy_classe", "classwork", "class_work", "classworkscore", "class_work_score", "moyenne ds", "moyenne devoirs"],
  examScore: ["note compo", "note_compo", "composition", "compo", "exam_score", "examscore", "note composition", "note_composition"],
  marksObtained: ["note obtenue", "note finale", "moyenne finale", "moyenne", "marks", "obtained", "marksobtained", "note_obtenue", "note_sur", "resultat", "result"],
  periodName: ["trimestre", "semestre", "periode", "period", "periodname", "nom_periode"],
  sessionName: ["session", "annee", "année", "annee scolaire", "année scolaire", "annee_scolaire", "sessionname", "session_name"],
  maxMarks: ["max", "note_max", "maxmarks", "bareme", "note_maximale"],
  remarks: ["remarques", "appreciation", "remarks", "commentaire", "obs", "observation"],
  examDate: ["date", "date_examen", "examdate"],
  roomName: ["salle", "classe_salle", "room", "roomname", "division"],
  scolariteMensuelle: ["scolarite", "frais_mensuels", "mensuel", "scolaritemensuelle", "mensualite"],
  droitsInscription: ["inscription", "frais_inscription", "fraisinscription", "droits"],
  cogesCarteId: ["coges", "carte", "frais_coges", "coges_card", "fraiscogescard"],
  transportInternat: ["transport", "internat", "frais_transport", "transport_internat", "fraistransportinternat"],
  statutInitial: ["statut", "status", "etat", "statutinitial"],
  isEliminatory: ["eliminatoire", "is_eliminatory", "eliminatoire_oui_non", "iseliminatory"],
  semester: ["semestre", "trimestre", "periode", "semester"],
  teacherName: ["enseignant", "prof", "professeur", "teacher", "nom_prof", "teachername", "nom_enseignant"]
};

export default function ImportationPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("student");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fixedValues, setFixedValues] = useState<Record<string, string>>({});

  // UI states
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Mapping & Preview, 3: Executing
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, error: 0 });
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Excel template generation and download
  const handleDownloadTemplate = (type: ImportType) => {
    let cols: string[] = [];
    let sample: any[] = [];
    let filename = "";

    if (type === "student") {
      cols = [
        "numAdmission", "nomEtudiant", "nomArabe", "sexe", "religion",
        "dateNaissance", "lieuNaissance", "cnic", "session",
        "educationalLevel", "classe", "section", "nomPere", "mobile",
        "fraisMensuels", "ancienSolde", "fraisInscription"
      ];
      sample = [
        {
          numAdmission: "2026-0001",
          nomEtudiant: "Moussa Konaté",
          nomArabe: "موسى كوناتي",
          sexe: "Garçon",
          religion: "Islam",
          dateNaissance: "12/04/2012",
          lieuNaissance: "Abidjan",
          cnic: "CI00987622",
          session: "2025-2026",
          educationalLevel: "Collège",
          classe: "6ème A",
          section: "Collège Général",
          nomPere: "Drissa Konaté",
          mobile: "+2250708091011",
          fraisMensuels: 12000,
          ancienSolde: 0,
          fraisInscription: 15000
        },
        {
          numAdmission: "2026-0002",
          nomEtudiant: "Fatou Diop",
          nomArabe: "فاتو ديوب",
          sexe: "Fille",
          religion: "Islam",
          dateNaissance: "05/09/2013",
          lieuNaissance: "Bouaké",
          cnic: "CI00123456",
          session: "2025-2026",
          educationalLevel: "Collège",
          classe: "5ème B",
          section: "Collège Général",
          nomPere: "Ibrahim Diop",
          mobile: "+2250506070809",
          fraisMensuels: 12000,
          ancienSolde: 5000,
          fraisInscription: 15000
        }
      ];
      filename = "Modele_Import_Eleves.xlsx";
    } else if (type === "employee") {
      cols = [
        "empId", "nom", "dateNaissance", "lieuNaissance", "sexe", "mobile", "email",
        "codeGrade", "categorie", "classe", "echelon", "poste", "fonction", "dateNomination",
        "lieuAffectation", "commune", "departement", "region", "dateAffectation", "salaireBase"
      ];
      sample = [
        {
          empId: "EMP-2026-01",
          nom: "Adama Coulibaly",
          dateNaissance: "12/04/1985",
          lieuNaissance: "Abidjan",
          sexe: "Homme",
          mobile: "+2250700112233",
          email: "a.coulibaly@ecoleplus.edu",
          codeGrade: "G3",
          categorie: "A",
          classe: "1ère",
          echelon: "E2",
          poste: "Enseignant",
          fonction: "Directeur des Études",
          dateNomination: "01/10/2024",
          lieuAffectation: "Lycée de Cocody",
          commune: "Cocody",
          departement: "Lagunes",
          region: "Lagunes",
          dateAffectation: "01/09/2023",
          salaireBase: 300000
        },
        {
          empId: "EMP-2026-02",
          nom: "Clarisse Touré",
          dateNaissance: "20/08/1990",
          lieuNaissance: "Bouaké",
          sexe: "Femme",
          mobile: "+2250102030405",
          email: "c.toure@ecoleplus.edu",
          codeGrade: "G2",
          categorie: "B",
          classe: "2ème",
          echelon: "E1",
          poste: "Comptable",
          fonction: "Comptable Principale",
          dateNomination: "15/01/2024",
          lieuAffectation: "Lycée de Cocody",
          commune: "Cocody",
          departement: "Lagunes",
          region: "Lagunes",
          dateAffectation: "15/01/2024",
          salaireBase: 350000
        }
      ];
      filename = "Modele_Import_Personnel.xlsx";
    } else if (type === "subject") {
      cols = ["subjectName", "subjectCode", "category"];
      sample = [
        { subjectName: "Physique-Chimie", subjectCode: "PC01", category: "Scientifique" },
        { subjectName: "Histoire-Géographie", subjectCode: "HG01", category: "Littéraire" },
        { subjectName: "Anglais", subjectCode: "ANG01", category: "Langue" }
      ];
      filename = "Modele_Import_Matieres.xlsx";
    } else if (type === "exam_result") {
      cols = ["examName", "className", "subjectName", "numAdmission", "classWorkScore", "examScore", "marksObtained", "periodName", "sessionName", "maxMarks", "remarks", "examDate"];
      sample = [
        {
          examName: "Composition 1",
          className: "6ème A",
          subjectName: "Physique-Chimie",
          numAdmission: "2026-0001",
          classWorkScore: 14.5,
          examScore: 16.5,
          marksObtained: 15.5,
          periodName: "1er Trimestre",
          sessionName: "2025-2026",
          maxMarks: 20,
          remarks: "Très bon travail",
          examDate: "12/10/2025"
        },
        {
          examName: "Composition 1",
          className: "6ème A",
          subjectName: "Physique-Chimie",
          numAdmission: "2026-0002",
          classWorkScore: 8.5,
          examScore: 9.5,
          marksObtained: 9.0,
          periodName: "1er Trimestre",
          sessionName: "2025-2026",
          maxMarks: 20,
          remarks: "Insuffisant",
          examDate: "12/10/2025"
        }
      ];
      filename = "Modele_Import_Notes.xlsx";
    } else if (type === "class_level") {
      cols = ["className", "sectionName", "educationalLevel", "roomName", "scolariteMensuelle", "droitsInscription", "cogesCarteId", "transportInternat", "ancienSolde", "statutInitial"];
      sample = [
        {
          className: "6ème A",
          sectionName: "Collège Général",
          educationalLevel: "Collège",
          roomName: "Salle 1",
          scolariteMensuelle: 12000,
          droitsInscription: 15000,
          cogesCarteId: 5000,
          transportInternat: 0,
          ancienSolde: 0,
          statutInitial: "Actif"
        },
        {
          className: "Terminale D",
          sectionName: "Lycée Scientifique",
          educationalLevel: "Lycée",
          roomName: "Salle B4",
          scolariteMensuelle: 18000,
          droitsInscription: 20000,
          cogesCarteId: 5000,
          transportInternat: 10000,
          ancienSolde: 5000,
          statutInitial: "Actif"
        }
      ];
      filename = "Modele_Import_Classes.xlsx";
    } else if (type === "section_subject") {
      cols = ["sectionName", "subjectName", "coefficient", "term", "isEliminatory"];
      sample = [
        {
          sectionName: "Collège Général",
          subjectName: "Physique-Chimie",
          coefficient: 2,
          term: "Tous",
          isEliminatory: "Non"
        },
        {
          sectionName: "Lycée Scientifique",
          subjectName: "Mathématiques",
          coefficient: 5,
          term: "Tous",
          isEliminatory: "Oui"
        }
      ];
      filename = "Modele_Import_Matieres_Sections.xlsx";
    } else if (type === "class_subject") {
      cols = ["className", "subjectName", "coefficient", "semester", "teacherName"];
      sample = [
        {
          className: "6ème A",
          subjectName: "Physique-Chimie",
          coefficient: 2,
          semester: "1er Trimestre",
          teacherName: "Adama Coulibaly"
        },
        {
          className: "Terminale D",
          subjectName: "Mathématiques",
          coefficient: 5,
          semester: "1er Trimestre",
          teacherName: "Clarisse Touré"
        }
      ];
      filename = "Modele_Import_Plan_Etudes.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: cols });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, filename);
    toast.success(`Modèle Excel généré : ${filename}`);
  };

  // Read uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse headers first
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rawJson.length === 0) {
          toast.error("Le fichier Excel est vide.");
          return;
        }

        const excelHeaders = (rawJson[0] as string[]).map(h => String(h).trim()).filter(Boolean);
        setHeaders(excelHeaders);

        // Convert the rest to JSON rows
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        setParsedData(rows);

        // Apply smart fuzzy mapping
        const systemFields = FIELDS[activeTab].map(f => f.key);
        const initialMapping: Record<string, string> = {};

        for (const field of systemFields) {
          const kws = KEYWORDS[field] || [];
          let matched = "";

          // Try exact match
          for (const h of excelHeaders) {
            if (h.toLowerCase().trim() === field.toLowerCase()) {
              matched = h;
              break;
            }
          }

          // Try keyword matching
          if (!matched) {
            for (const kw of kws) {
              for (const h of excelHeaders) {
                if (h.toLowerCase().trim().includes(kw)) {
                  matched = h;
                  break;
                }
              }
              if (matched) break;
            }
          }

          initialMapping[field] = matched || "Ignorer";
        }

        setColumnMapping(initialMapping);
        setStep(2);
        toast.info(`${rows.length} lignes chargées. Veuillez vérifier la correspondance des colonnes.`);
      } catch (err: any) {
        toast.error(`Erreur de lecture du fichier Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
        // Trigger event
        const changeEvent = new Event("change", { bubbles: true });
        fileInputRef.current.dispatchEvent(changeEvent);
      }
    } else {
      toast.error("Veuillez déposer un fichier Excel valide (.xlsx)");
    }
  };

  // Launch import logic row by row
  const startImport = () => {
    // 1. Verify required column mappings
    const missingRequired: string[] = [];
    FIELDS[activeTab].forEach(field => {
      const mapping = columnMapping[field.key];
      if (field.required) {
        if (!mapping || mapping === "Ignorer") {
          missingRequired.push(field.label);
        } else if (mapping === "__fixed__" && !fixedValues[field.key]?.trim()) {
          missingRequired.push(`${field.label} (Valeur fixe requise)`);
        }
      }
    });

    if (missingRequired.length > 0) {
      toast.error(`Veuillez mapper les colonnes obligatoires : ${missingRequired.join(", ")}`);
      return;
    }

    setStep(3);
    setImportProgress({ current: 0, total: parsedData.length, success: 0, error: 0 });
    setImportLogs([]);

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];

        // Assemble mapped payload
        const payload: Record<string, any> = {};
        FIELDS[activeTab].forEach(field => {
          const excelHeader = columnMapping[field.key];
          if (excelHeader === "__fixed__") {
            payload[field.key] = fixedValues[field.key] || "";
          } else if (excelHeader && excelHeader !== "Ignorer") {
            payload[field.key] = row[excelHeader];
          }
        });

        // Add index tracker
        const rowNum = i + 2; // header is row 1

        try {
          let res: any;
          if (activeTab === "student") {
            res = await importStudentRow(payload);
          } else if (activeTab === "employee") {
            res = await importEmployeeRow(payload);
          } else if (activeTab === "subject") {
            res = await importSubjectRow(payload);
          } else if (activeTab === "class_level") {
            res = await importClassLevelRow(payload);
          } else if (activeTab === "section_subject") {
            res = await importSectionSubjectRow(payload);
          } else if (activeTab === "class_subject") {
            res = await importClassSubjectRow(payload);
          } else {
            res = await importExamResultRow(payload);
          }

          if (res?.success) {
            successCount++;
            const actionText = res.action === "update" ? "mis à jour" : "créé";
            const rowId = payload.numAdmission || payload.empId || payload.subjectName || payload.className || payload.sectionName || `Ligne ${rowNum}`;
            setImportLogs(prev => [
              `✅ Ligne ${rowNum} (${rowId}) : ${actionText} avec succès.`,
              ...prev.slice(0, 49)
            ]);
          } else {
            errorCount++;
            const errMsg = res?.error || "Erreur de validation inconnue.";
            setImportLogs(prev => [
              `❌ Ligne ${rowNum} : ${errMsg}`,
              ...prev.slice(0, 49)
            ]);
          }
        } catch (err: any) {
          errorCount++;
          // Never expose raw DB errors (which may contain SQL) in the UI.
          setImportLogs(prev => [
            `❌ Ligne ${rowNum} : Erreur lors de l'importation. Vérifiez vos données.`,
            ...prev.slice(0, 49)
          ]);
        }

        setImportProgress({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount
        });
      }

      toast.success(`Importation terminée ! Succès : ${successCount}, Échecs : ${errorCount}`);
    });
  };

  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setParsedData([]);
    setColumnMapping({});
    setFixedValues({});
    setStep(1);
    setImportLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[24px] bg-white/85 backdrop-blur-md border border-white/40 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            📥 Importation Intelligente
            <Sparkles className="size-6 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            استيراد البيانات الذكي · Importez vos élèves, employés et matières en quelques clics via Excel.
          </p>
        </div>

        {step === 2 && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Réinitialiser (إعادة تعيين)
          </button>
        )}
      </div>

      {/* MODE SELECTOR (Only active at step 1) */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            {
              id: "student" as ImportType,
              title: "Élèves (الطلاب)",
              desc: "Importation des dossiers scolaires, frais, tuteurs...",
              icon: <Users className="size-6 text-indigo-600" />,
              color: "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
            },
            {
              id: "employee" as ImportType,
              title: "Personnel HR (الموظفون)",
              desc: "Importation des enseignants, comptables, salaires...",
              icon: <Briefcase className="size-6 text-emerald-600" />,
              color: "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
            },
            {
              id: "subject" as ImportType,
              title: "Matières / Curriculum (المواد)",
              desc: "Importation des matières, codes et départements...",
              icon: <BookOpen className="size-6 text-blue-600" />,
              color: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
            },
            {
              id: "exam_result" as ImportType,
              title: "Notes & Résultats (الدرجات)",
              desc: "Importation des notes d'examen et appréciations...",
              icon: <Award className="size-6 text-amber-600" />,
              color: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
            },
            {
              id: "class_level" as ImportType,
              title: "Classes & Niveaux (الفصول)",
              desc: "Importation des classes, sections et niveaux éducatifs...",
              icon: <Layers className="size-6 text-cyan-600" />,
              color: "border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10"
            },
            {
              id: "section_subject" as ImportType,
              title: "Matières ↔ Sections (الشعب)",
              desc: "Importation des coefficients de matières par sections...",
              icon: <LinkIcon className="size-6 text-teal-600" />,
              color: "border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10"
            },
            {
              id: "class_subject" as ImportType,
              title: "Plan d'Études (مخطط الدراسة)",
              desc: "Liaisons des matières aux classes et assignation des profs...",
              icon: <BookOpen className="size-6 text-rose-600" />,
              color: "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10"
            }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setStep(1); }}
              className={`flex flex-col items-start p-5 rounded-[20px] border-2 transition-all text-left gap-3 ${tab.color} ${activeTab === tab.id ? "ring-2 ring-offset-2 ring-indigo-400 scale-[1.02]" : ""}`}
            >
              <div className="p-2 rounded-xl bg-white/60 shadow-sm">{tab.icon}</div>
              <div>
                <p className="font-black text-slate-800 text-sm">{tab.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Download template buttons */}
      {step === 1 && (
        <div className="p-4 rounded-[20px] bg-amber-50/80 border border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Download className="size-4 shrink-0" />
            <span className="text-sm font-bold">Télécharger un modèle Excel :</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["student", "employee", "subject", "exam_result", "class_level", "section_subject", "class_subject"] as ImportType[]).map(type => (
              <button
                key={type}
                onClick={() => handleDownloadTemplate(type)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-lg transition-all"
              >
                {type === "student" ? "Élèves" : 
                 type === "employee" ? "Personnel" : 
                 type === "subject" ? "Matières" : 
                 type === "exam_result" ? "Notes" :
                 type === "class_level" ? "Classes & Niveaux" :
                 type === "section_subject" ? "Matières ↔ Sections" :
                 "Plan d'Études"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: FILE UPLOAD */}
      {step === 1 && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-[24px] p-12 text-center transition-all cursor-pointer bg-white/60 backdrop-blur-sm group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-[20px] bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-100">
              <FileSpreadsheet className="size-10 text-indigo-500" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg">Glissez votre fichier Excel ici</p>
              <p className="text-sm text-slate-400 mt-1">ou cliquez pour parcourir · Formats : .xlsx uniquement</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-700">{file.name}</span>
                <span className="text-xs text-emerald-500">({parsedData.length} lignes)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1 → 2: Next Button */}
      {step === 1 && file && parsedData.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all"
          >
            Mapper les colonnes <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-6 rounded-[24px] bg-white/85 border border-white/40 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <Table className="size-5 text-indigo-500" /> Correspondance des Colonnes
            </h2>
            <p className="text-xs text-slate-500 mb-6">Reliez chaque champ du système à la colonne correspondante dans votre fichier Excel.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {FIELDS[activeTab].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={columnMapping[field.key] || ""}
                    onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
                  >
                    <option value="">-- Ignorer --</option>
                    <option value="Ignorer">Ignorer</option>
                    <option value="__fixed__">✍️ Valeur fixe pour toute la colonne...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {columnMapping[field.key] === "__fixed__" && (
                    <input
                      type="text"
                      placeholder={`Saisir la valeur fixe pour ${field.label.replace(" *", "")}`}
                      value={fixedValues[field.key] || ""}
                      onChange={e => setFixedValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full h-10 px-3 mt-1.5 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all"
            >
              ← Retour
            </button>
            <button
              onClick={startImport}
              disabled={isPending}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Lancer l&apos;Importation
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {/* Progress Card */}
            <div className="p-6 rounded-[24px] bg-white/85 border border-white/40 shadow-sm space-y-4">
              <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Progression</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{importProgress.current} / {importProgress.total} lignes</span>
                  <span>{importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-2xl font-black text-emerald-600">{importProgress.success}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Succès</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                  <p className="text-2xl font-black text-rose-600">{importProgress.error}</p>
                  <p className="text-[10px] font-bold text-rose-500 uppercase">Échecs</p>
                </div>
              </div>
            </div>

            {!isPending && (
              <button
                onClick={handleReset}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="size-4" />
                Retourner &amp; Importer à nouveau
              </button>
            )}
          </div>

          {/* Activity Logs Console */}
          <div className="lg:col-span-2 rounded-[24px] bg-slate-950 text-slate-100 p-6 shadow-xl relative overflow-hidden font-mono text-xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full" />
                <span className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="font-bold text-slate-400 ml-2">logs_importation.sh</span>
              </div>
              {isPending && (
                <span className="inline-flex items-center gap-1.5 text-indigo-400 animate-pulse font-bold">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  Traitement...
                </span>
              )}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-2 select-text custom-scrollbar pr-2">
              {importLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
              {importLogs.length === 0 && (
                <div className="text-slate-500 italic text-center py-24">
                  En attente du lancement de l&apos;importation...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
