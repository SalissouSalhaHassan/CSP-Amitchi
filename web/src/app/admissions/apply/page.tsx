"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  CheckCircle2,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  School,
  Send,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
  Building,
  GraduationCap,
  HeartPulse,
  Camera,
  Upload,
  BookOpen,
  Award,
  Globe,
  Check,
  Info,
  Clock,
  Download,
  Briefcase,
  Copy,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  submitAdmissionApplicationAction,
  getPublicSchoolInfoForAdmissionsAction,
} from "@/domains/admissions/actions/admissions.actions";
import { UNIVERSITY_FACULTIES } from "@/domains/admissions/constants/admissions.constants";

interface SubmittedAdmissionData {
  applicationNumber: string;
  studentFirstName: string;
  studentLastName: string;
  studentFullName: string;
  photoUrl?: string;
  gender: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  educationLevel: string;
  faculty?: string;
  department?: string;
  degreeProgram: string;
  degreeLevel?: string;
  studyMode?: string;
  academicYear?: string;
  bacSeries?: string;
  bacYear?: string;
  bacMention?: string;
  bacRollNumber?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  parentName: string;
  parentPhone: string;
  parentRelation?: string;
  parentEmail?: string;
  schoolName: string;
  contactPhone: string;
  createdAt: string;
}

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const schoolParam = searchParams.get("school") || searchParams.get("schoolId") || "";

  const [pathway, setPathway] = useState<"university" | "general">("university");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{
    id: number;
    name: string;
    slug?: string;
    logoPath?: string | null;
  }>({ id: 1, name: "Edut Pro • Pôle Universitaire & Scolaire", slug: "main" });

  const [facultiesList, setFacultiesList] = useState(UNIVERSITY_FACULTIES);
  const [classesList, setClassesList] = useState<string[]>([
    "Licence 1 Informatique & IA", "Licence 1 Gestion & Finance", "Licence 1 Droit Privé",
    "Licence 2 Génie Logiciel", "Licence 3 Audit & Finance", "Master 1 Data Science",
    "Terminale D", "Terminale C", "Terminale A", "1ère D", "2nde C",
    "3ème A", "4ème A", "5ème A", "6ème A"
  ]);

  const [submittedData, setSubmittedData] = useState<SubmittedAdmissionData | null>(null);

  const [selectedFacultyIndex, setSelectedFacultyIndex] = useState(0);

  const [formData, setFormData] = useState({
    educationLevel: "Université / Supérieur",
    faculty: "Faculté des Sciences & Technologies",
    department: "Informatique & Génie Logiciel",
    degreeProgram: "Licence Informatique & Génie Logiciel (L1-L3)",
    degreeLevel: "Licence 1",
    studyMode: "Présentiel / Temps plein",
    academicYear: "2026–2027",
    targetClass: "Licence 1 Informatique & Génie Logiciel",
    
    // Candidate details
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "M",
    placeOfBirth: "Niamey",
    nationality: "Nigérienne",
    candidateEmail: "",
    candidatePhone: "",
    candidateWhatsapp: "",
    address: "",
    city: "Niamey",

    // Baccalaureate & Academic Background
    bacSeries: "Série D",
    bacYear: "2026",
    bacMention: "Bien",
    bacRollNumber: "",
    previousSchool: "",
    previousGradeAvg: "",

    // Sponsor / Guardian
    parentName: "",
    parentRelation: "Père",
    parentPhone: "",
    parentWhatsapp: "",
    parentEmail: "",
    parentProfession: "",

    // Document links / uploads
    photoUrl: "",
    birthCertificateUrl: "",
    idCardPassportUrl: "",
    bacTranscriptUrl: "",
    bacCertificateUrl: "",
    higherEdTranscriptUrl: "",
    cvUrl: "",
    coverLetter: "",
    recommendationLetterUrl: "",
    medicalNotes: "",
    honorDeclaration: true,
  });

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const res = await getPublicSchoolInfoForAdmissionsAction(schoolParam);
        if (res?.school) {
          setSchoolInfo(res.school);
        }
        if (res?.faculties && res.faculties.length > 0) {
          setFacultiesList(res.faculties);
        }
        if (res?.classes && res.classes.length > 0) {
          setClassesList(res.classes);
        }
      } catch (err) {
        console.error("Failed to load school admissions metadata:", err);
      }
    }
    loadSchoolData();
  }, [schoolParam]);

  const handleFacultyChange = (idx: number) => {
    setSelectedFacultyIndex(idx);
    const fac = facultiesList[idx];
    if (fac) {
      setFormData(prev => ({
        ...prev,
        faculty: fac.name,
        department: fac.departments[0] || "",
        degreeProgram: fac.programs[0] || "",
        targetClass: fac.programs[0] || "",
      }));
    }
  };

  const handlePathwayChange = (newPathway: "university" | "general") => {
    setPathway(newPathway);
    if (newPathway === "university") {
      const fac = facultiesList[0];
      setFormData(prev => ({
        ...prev,
        educationLevel: "Université / Supérieur",
        faculty: fac?.name || "Faculté des Sciences",
        department: fac?.departments[0] || "Informatique",
        degreeProgram: fac?.programs[0] || "Licence Informatique",
        targetClass: fac?.programs[0] || "Licence 1",
        degreeLevel: "Licence 1",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        educationLevel: "Secondaire",
        faculty: "",
        department: "",
        degreeProgram: classesList[0] || "Terminale D",
        targetClass: classesList[0] || "Terminale D",
        degreeLevel: "Secondaire",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.studentFirstName.trim() ||
      !formData.studentLastName.trim() ||
      !formData.dateOfBirth.trim() ||
      !formData.parentName.trim() ||
      (!formData.parentPhone.trim() && !formData.candidatePhone.trim())
    ) {
      toast.error("Veuillez renseigner toutes les informations obligatoires (*).");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        schoolId: schoolInfo.id,
      };

      // 1. Submit via dedicated REST API endpoint with fallback to Server Action
      let res: any = null;
      try {
        const response = await fetch("/api/admissions/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        res = await response.json();
      } catch (apiErr) {
        console.warn("API route submission failed, fallback to direct server action:", apiErr);
        res = await submitAdmissionApplicationAction(payload);
      }

      if (res && res.success && res.applicationNumber) {
        setSubmittedData({
          applicationNumber: res.applicationNumber,
          studentFirstName: formData.studentFirstName.trim(),
          studentLastName: formData.studentLastName.trim(),
          studentFullName: `${formData.studentLastName.toUpperCase()} ${formData.studentFirstName}`,
          photoUrl: formData.photoUrl,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          placeOfBirth: formData.placeOfBirth || "Niamey",
          nationality: formData.nationality || "Nigérienne",
          educationLevel: formData.educationLevel || "Université / Supérieur",
          faculty: formData.faculty,
          department: formData.department,
          degreeProgram: formData.degreeProgram || formData.targetClass,
          degreeLevel: formData.degreeLevel || "Licence 1",
          studyMode: formData.studyMode || "Présentiel / Temps plein",
          academicYear: formData.academicYear || "2026–2027",
          bacSeries: formData.bacSeries,
          bacYear: formData.bacYear,
          bacMention: formData.bacMention,
          bacRollNumber: formData.bacRollNumber,
          candidatePhone: formData.candidatePhone,
          candidateEmail: formData.candidateEmail,
          parentName: formData.parentName,
          parentPhone: formData.parentPhone,
          parentRelation: formData.parentRelation,
          parentEmail: formData.parentEmail,
          schoolName: res.schoolName || schoolInfo.name,
          contactPhone: formData.candidatePhone || formData.parentPhone,
          createdAt: new Date().toISOString(),
        });
        toast.success(res.message || "Candidature enregistrée avec succès !");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(res?.error || "Erreur lors de la soumission du dossier.");
      }
    } catch (err: any) {
      console.error("Admissions form submission error:", err);
      toast.error(err?.message || "Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SUCCESS CONFIRMATION SCREEN ─────────────────────────────────────────────
  if (submittedData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-3xl w-full mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 size-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Success Top Icon */}
          <div className="text-center space-y-3">
            <div className="size-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                Dossier de Candidature Officiellement Enregistré
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
                Candidature Soumise avec Succès !
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Votre dossier a été transmis à la Commission des Admissions de <strong className="text-white">{submittedData.schoolName}</strong>.
              </p>
            </div>
          </div>

          {/* Detailed Candidate Dossier Card */}
          <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-3xl space-y-6 text-left shadow-lg">
            
            {/* Top Bar: Number + Photo + QR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-4">
                {submittedData.photoUrl ? (
                  <img
                    src={submittedData.photoUrl}
                    alt={submittedData.studentFullName}
                    className="size-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shadow-emerald-500/20 shrink-0"
                  />
                ) : (
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-slate-950 flex flex-col items-center justify-center font-black text-xl shadow-md shrink-0">
                    <UserPlus className="size-8 text-white" />
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Numéro de Dossier Officiel
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-wider">
                      {submittedData.applicationNumber}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(submittedData.applicationNumber);
                        toast.success("Numéro de dossier copié !");
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Copier le numéro"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <h3 className="text-base font-black text-white mt-1">
                    {submittedData.studentFullName}
                    <span className="text-xs text-slate-400 font-medium ml-2">
                      ({submittedData.gender === "F" ? "Féminin" : "Masculin"})
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 p-2 bg-white rounded-2xl w-fit shadow-md shrink-0">
                <QRCodeSVG
                  value={`https://edut.pro/admissions/status?app=${submittedData.applicationNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
                  size={76}
                  level="M"
                />
                <span className="text-[9px] font-mono text-slate-900 font-bold text-center w-full block">
                  Scan Suivi
                </span>
              </div>
            </div>

            {/* Academic Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Programme &amp; Spécialité</span>
                <p className="text-slate-100 font-bold text-sm flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-emerald-400 shrink-0" />
                  {submittedData.degreeProgram}
                </p>
                {submittedData.faculty && (
                  <p className="text-[11px] text-slate-400">{submittedData.faculty}</p>
                )}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cycle &amp; Mode d&apos;Études</span>
                <p className="text-slate-100 font-bold text-sm flex items-center gap-1.5">
                  <BookOpen className="size-4 text-blue-400 shrink-0" />
                  {submittedData.degreeLevel || "Licence 1"} • {submittedData.studyMode || "Présentiel"}
                </p>
                <p className="text-[11px] text-slate-400">Année Universitaire : {submittedData.academicYear}</p>
              </div>

              {submittedData.bacSeries && (
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Baccalauréat</span>
                  <p className="text-slate-100 font-bold flex items-center gap-1.5">
                    <Award className="size-4 text-amber-400 shrink-0" />
                    {submittedData.bacSeries} ({submittedData.bacYear || "2026"})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mention : <strong className="text-emerald-400">{submittedData.bacMention || "Passable"}</strong>
                    {submittedData.bacRollNumber && ` • N°: ${submittedData.bacRollNumber}`}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">État Civil &amp; Naissance</span>
                <p className="text-slate-100 font-bold flex items-center gap-1.5">
                  <Calendar className="size-4 text-purple-400 shrink-0" />
                  {submittedData.dateOfBirth ? new Date(submittedData.dateOfBirth).toLocaleDateString("fr-FR") : "—"} à {submittedData.placeOfBirth}
                </p>
                <p className="text-[11px] text-slate-400">Nationalité : {submittedData.nationality}</p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Notifié</span>
                <p className="text-slate-100 font-mono font-bold flex items-center gap-1.5">
                  <Phone className="size-4 text-teal-400 shrink-0" />
                  {submittedData.contactPhone}
                </p>
                {submittedData.candidateEmail && (
                  <p className="text-[11px] text-slate-400 truncate">{submittedData.candidateEmail}</p>
                )}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tuteur / Répondant Légal</span>
                <p className="text-slate-100 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                  {submittedData.parentName} ({submittedData.parentRelation || "Parent"})
                </p>
                <p className="text-[11px] text-slate-400 font-mono">{submittedData.parentPhone}</p>
              </div>

            </div>

            {/* Live Status Bar */}
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Statut de la candidature :</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <Clock className="size-3.5" /> En cours d&apos;examen par le Jury
              </span>
            </div>

          </div>

          {/* SMS / WhatsApp Banner */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl text-xs text-emerald-300 flex items-start gap-3 text-left">
            <Sparkles className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Un accusé de réception officiel contenant votre code de dossier <strong>{submittedData.applicationNumber}</strong> et le lien direct de suivi a été expédié par <strong>SMS &amp; WhatsApp</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/admissions/status?app=${submittedData.applicationNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Suivre l&apos;Évolution du Dossier
              <ArrowRight className="size-4" />
            </Link>

            <button
              onClick={() => window.print()}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <Printer className="size-4" />
              Imprimer / Télécharger le Récépissé Officiel (PDF)
            </button>
          </div>
        </div>

        {/* ─── PRINT-ONLY OFFICIAL A4 RECEIPT TEMPLATE ─────────────────────── */}
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:text-black print:p-8 font-sans text-xs">
          <div className="max-w-2xl mx-auto border-2 border-slate-900 p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">{submittedData.schoolName}</h1>
                <p className="text-xs font-bold text-slate-700 uppercase">Commission Générale des Admissions &amp; Inscriptions</p>
                <p className="text-[10px] text-slate-500">Année Académique : {submittedData.academicYear}</p>
              </div>
              <div className="p-2 border border-slate-900 rounded-lg">
                <QRCodeSVG
                  value={`https://edut.pro/admissions/status?app=${submittedData.applicationNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
                  size={70}
                  level="M"
                />
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 bg-slate-100 border border-slate-300 rounded-md">
              <h2 className="text-sm font-black uppercase tracking-wider">
                RÉCÉPISSÉ D&apos;ENREGISTREMENT DE CANDIDATURE
              </h2>
              <p className="text-xs font-mono font-bold mt-0.5">Dossier N° : {submittedData.applicationNumber}</p>
            </div>

            {/* Body Info */}
            <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded-md">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Nom &amp; Prénom du Candidat</span>
                <p className="text-sm font-bold">{submittedData.studentFullName}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date &amp; Lieu de Naissance</span>
                <p className="text-sm font-bold">{submittedData.dateOfBirth} à {submittedData.placeOfBirth}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Programme / Filière convoité</span>
                <p className="text-sm font-bold text-emerald-700">{submittedData.degreeProgram}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cycle &amp; Mode d&apos;Études</span>
                <p className="text-sm font-bold">{submittedData.degreeLevel} • {submittedData.studyMode}</p>
              </div>
              {submittedData.bacSeries && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Baccalauréat</span>
                  <p className="text-sm font-bold">{submittedData.bacSeries} ({submittedData.bacYear}) - Mention {submittedData.bacMention}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Parent / Tuteur</span>
                <p className="text-sm font-bold">{submittedData.parentName} ({submittedData.parentPhone})</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-[10px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
              <p className="font-bold text-slate-800">Notice Importante :</p>
              <p>• Ce récépissé atteste du dépôt officiel de votre dossier de candidature auprès de l&apos;établissement.</p>
              <p>• Les résultats d&apos;éligibilité et convocations aux entretiens vous seront notifiés par SMS et consultables via le code QR ci-dessus.</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase text-slate-600">Signature du Candidat</p>
                <div className="h-16 mt-2 border-b border-dashed border-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase text-slate-600">Cachet &amp; Visa de l&apos;Établissement</p>
                <div className="h-16 mt-2 border-b border-dashed border-slate-400" />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ── MAIN APPLICATION MULTI-STEP FORM ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              {schoolInfo.name}
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Portail Admissions
              </span>
            </h1>
            <p className="text-xs text-slate-400">Candidatures &amp; Nouvelles Inscriptions Universitaires et Scolaires</p>
          </div>
        </div>

        <Link
          href="/admissions/status"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
        >
          Déjà postulé ? Suivre mon dossier
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* ─── Main Form Container ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto w-full my-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-xl">

          {/* Pathway Selector Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => handlePathwayChange("university")}
              className={`flex-1 w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                pathway === "university"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="size-4" />
              1. Enseignement Supérieur &amp; Universités (LMD)
            </button>
            <button
              type="button"
              onClick={() => handlePathwayChange("general")}
              className={`flex-1 w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                pathway === "general"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <School className="size-4" />
              2. Enseignement Général (Lycée • Collège • Primaire)
            </button>
          </div>

          {/* Progress Step Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="text-emerald-400 font-extrabold flex items-center gap-2">
                <span className="size-6 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[11px] font-black">
                  {step}
                </span>
                {step === 1 && "Choix du Programme & Filière"}
                {step === 2 && "Identité & Contact du Candidat"}
                {step === 3 && "Parcours & Baccalauréat"}
                {step === 4 && "Pièces Justificatives Numérisées"}
                {step === 5 && "Tuteur & Engagement"}
              </span>
              <span>Étape {step} sur 5</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 1: PROGRAM & FACULTY SELECTION
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <BookOpen className="size-5 text-emerald-400" />
                    Orientation &amp; Programme d&apos;Études
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Sélectionnez la faculté, la spécialité et le cycle universitaire convoité.</p>
                </div>

                {pathway === "university" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Faculty Select */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Faculté / UFR / École *</label>
                      <select
                        value={selectedFacultyIndex}
                        onChange={(e) => handleFacultyChange(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {facultiesList.map((fac, idx) => (
                          <option key={fac.name} value={idx} className="bg-slate-900 py-1">
                            {fac.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Département *</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(facultiesList[selectedFacultyIndex]?.departments || ["Général"]).map(dep => (
                          <option key={dep} value={dep} className="bg-slate-900 py-1">
                            {dep}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Degree Program */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Filière / Programme de formation *</label>
                      <select
                        value={formData.degreeProgram}
                        onChange={(e) => setFormData({ ...formData, degreeProgram: e.target.value, targetClass: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(facultiesList[selectedFacultyIndex]?.programs || ["Licence Générale"]).map(prog => (
                          <option key={prog} value={prog} className="bg-slate-900 py-1">
                            {prog}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Degree Level (Cycle) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Cycle &amp; Niveau d&apos;admission *</label>
                      <select
                        value={formData.degreeLevel}
                        onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Licence 1 (L1)" className="bg-slate-900">Licence 1 (L1) - Post-Bac</option>
                        <option value="Licence 2 (L2)" className="bg-slate-900">Licence 2 (L2) - Passerelle</option>
                        <option value="Licence 3 (L3)" className="bg-slate-900">Licence 3 (L3) - Diplômante</option>
                        <option value="Master 1 (M1)" className="bg-slate-900">Master 1 (M1) - Post-Licence</option>
                        <option value="Master 2 (M2)" className="bg-slate-900">Master 2 (M2) - Spécialisation</option>
                        <option value="Doctorat" className="bg-slate-900">Doctorat (PhD)</option>
                        <option value="BTS / DUT" className="bg-slate-900">BTS / DUT Professionnel</option>
                      </select>
                    </div>

                    {/* Study Mode */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Régime d&apos;études *</label>
                      <select
                        value={formData.studyMode}
                        onChange={(e) => setFormData({ ...formData, studyMode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Présentiel / Temps plein" className="bg-slate-900">🏫 Présentiel / Temps plein (Journée)</option>
                        <option value="Cours du soir / Professionnels" className="bg-slate-900">🌙 Cours du soir (Professionnels)</option>
                        <option value="En ligne / Distanciel" className="bg-slate-900">💻 En ligne / Distanciel (Hybride)</option>
                        <option value="Alternance / Entreprise" className="bg-slate-900">💼 Alternance / Stage continu</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Classe d&apos;inscription demandée *</label>
                      <select
                        value={formData.targetClass}
                        onChange={(e) => setFormData({ ...formData, targetClass: e.target.value, degreeProgram: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {classesList.map(c => (
                          <option key={c} value={c} className="bg-slate-900 py-1">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 2: CANDIDATE IDENTITY & DIRECT CONTACT
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <UserPlus className="size-5 text-emerald-400" />
                    État Civil &amp; Coordonnées du Candidat
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Renseignez scrupuleusement les informations d&apos;identité conformes à l&apos;acte de naissance ou passeport.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nom de famille *</label>
                    <input
                      type="text"
                      required
                      value={formData.studentLastName}
                      onChange={(e) => setFormData({ ...formData, studentLastName: e.target.value })}
                      placeholder="Ex: OUSMANE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Prénom(s) *</label>
                    <input
                      type="text"
                      required
                      value={formData.studentFirstName}
                      onChange={(e) => setFormData({ ...formData, studentFirstName: e.target.value })}
                      placeholder="Ex: Abdourahamane"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Date de Naissance *</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Genre / Sexe *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: "M" })}
                        className={`py-3 rounded-2xl text-xs font-bold border transition ${
                          formData.gender === "M"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Masculin (M)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: "F" })}
                        className={`py-3 rounded-2xl text-xs font-bold border transition ${
                          formData.gender === "F"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Féminin (F)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Lieu de Naissance</label>
                    <input
                      type="text"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                      placeholder="Ex: Niamey"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nationalité</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Ex: Nigérienne"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Email personnel du candidat</label>
                    <input
                      type="email"
                      value={formData.candidateEmail}
                      onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                      placeholder="candidat@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Téléphone Direct / WhatsApp du candidat *</label>
                    <input
                      type="tel"
                      value={formData.candidatePhone}
                      onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                      placeholder="+227 90 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 3: ACADEMIC BACKGROUND & BACCALAUREATE
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Award className="size-5 text-emerald-400" />
                    Parcours Académique &amp; Baccalauréat
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Détaillez vos diplômes antérieurs pour l&apos;examen d&apos;éligibilité par le jury.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Série du Baccalauréat</label>
                    <select
                      value={formData.bacSeries}
                      onChange={(e) => setFormData({ ...formData, bacSeries: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Série D (Scientifique)" className="bg-slate-900">Série D (Sciences de la Vie &amp; Terre)</option>
                      <option value="Série C (Mathématiques/Physique)" className="bg-slate-900">Série C (Mathématiques &amp; Physiques)</option>
                      <option value="Série A (Littéraire)" className="bg-slate-900">Série A (Littératures &amp; Langues)</option>
                      <option value="Série E (Mathématiques/Technique)" className="bg-slate-900">Série E (Maths &amp; Technique)</option>
                      <option value="Série F (Technique/Génie)" className="bg-slate-900">Série F (Industrie &amp; Génie)</option>
                      <option value="Série G (Gestion/Tertiaire)" className="bg-slate-900">Série G (Gestion, Comptabilité &amp; Tertiaire)</option>
                      <option value="Baccalauréat International / Autre" className="bg-slate-900">Bac International / Autre équivalence</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Année d&apos;obtention du Bac</label>
                    <input
                      type="text"
                      value={formData.bacYear}
                      onChange={(e) => setFormData({ ...formData, bacYear: e.target.value })}
                      placeholder="Ex: 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Mention obtenue</label>
                    <select
                      value={formData.bacMention}
                      onChange={(e) => setFormData({ ...formData, bacMention: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Très Bien (&gt;=16/20)" className="bg-slate-900">Très Bien (&gt;= 16/20)</option>
                      <option value="Bien (14-15.99/20)" className="bg-slate-900">Bien (14 - 15.99/20)</option>
                      <option value="Assez Bien (12-13.99/20)" className="bg-slate-900">Assez Bien (12 - 13.99/20)</option>
                      <option value="Passable (10-11.99/20)" className="bg-slate-900">Passable (10 - 11.99/20)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Numéro de table / Matricule Bac</label>
                    <input
                      type="text"
                      value={formData.bacRollNumber}
                      onChange={(e) => setFormData({ ...formData, bacRollNumber: e.target.value })}
                      placeholder="Ex: 2026-BAC-18492"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300">Établissement / Lycée ou Université d&apos;origine</label>
                    <input
                      type="text"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      placeholder="Ex: Lycée d'Excellence de Niamey / Université Abdou Moumouni"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 4: UPLOADED DIGITAL DOCUMENTS & CLOUD LINKS
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Upload className="size-5 text-emerald-400" />
                      Dossier Numérique &amp; Pièces Justificatives
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Téléversez vos fichiers depuis votre téléphone / ordinateur ou collez vos liens Cloud (Google Drive, Dropbox).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>Formats acceptés : PDF, PNG, JPG, WEBP (Max 10 Mo)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. Photo d'identité */}
                  <DocumentUploadCard
                    label="1. Photo d'Identité (Format Passeport) *"
                    description="Photo récente sur fond clair (Visage dégagé)"
                    accept="image/*"
                    icon={<Camera className="size-5 text-emerald-400" />}
                    value={formData.photoUrl}
                    onChange={(val) => setFormData({ ...formData, photoUrl: val })}
                  />

                  {/* 2. Pièce d'identité / Passeport */}
                  <DocumentUploadCard
                    label="2. Pièce d'Identité / Passeport / Acte de Naissance *"
                    description="CNI, Passeport valide ou Extrait d'acte de naissance"
                    accept="image/*,application/pdf"
                    icon={<FileText className="size-5 text-blue-400" />}
                    value={formData.idCardPassportUrl || formData.birthCertificateUrl}
                    onChange={(val) => setFormData({ ...formData, idCardPassportUrl: val, birthCertificateUrl: val })}
                  />

                  {/* 3. Relevé de notes du Bac */}
                  <DocumentUploadCard
                    label="3. Relevé de Notes du Baccalauréat *"
                    description="Relevé officiel délivré par l'Office du Baccalauréat"
                    accept="image/*,application/pdf"
                    icon={<Award className="size-5 text-amber-400" />}
                    value={formData.bacTranscriptUrl}
                    onChange={(val) => setFormData({ ...formData, bacTranscriptUrl: val })}
                  />

                  {/* 4. Diplôme / Attestation du Bac */}
                  <DocumentUploadCard
                    label="4. Diplôme ou Attestation de Réussite au Bac *"
                    description="Attestation provisoire ou Diplôme définitif du Bac"
                    accept="image/*,application/pdf"
                    icon={<GraduationCap className="size-5 text-purple-400" />}
                    value={formData.bacCertificateUrl}
                    onChange={(val) => setFormData({ ...formData, bacCertificateUrl: val })}
                  />

                  {/* 5. Relevés Universitaires Antérieurs (Optionnel / Master) */}
                  <DocumentUploadCard
                    label="5. Relevés de Notes Universitaires (S1 à S6)"
                    description="Obligatoire pour les admissions en Licence 2, 3 ou Master"
                    accept="image/*,application/pdf"
                    icon={<BookOpen className="size-5 text-teal-400" />}
                    value={formData.higherEdTranscriptUrl}
                    onChange={(val) => setFormData({ ...formData, higherEdTranscriptUrl: val })}
                  />

                  {/* 6. Curriculum Vitae (CV) */}
                  <DocumentUploadCard
                    label="6. Curriculum Vitae (CV actualisé)"
                    description="Recommandé pour les filières professionnelles & Master"
                    accept="application/pdf,image/*"
                    icon={<Briefcase className="size-5 text-indigo-400" />}
                    value={formData.cvUrl}
                    onChange={(val) => setFormData({ ...formData, cvUrl: val })}
                  />

                  {/* 7. Lettre de Motivation */}
                  <div className="md:col-span-2 space-y-2 p-5 bg-slate-950/80 border border-slate-800 rounded-3xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-white flex items-center gap-2">
                        <FileText className="size-4 text-emerald-400" />
                        Lettre de motivation / Projet professionnel &amp; Ambitions
                      </label>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Texte direct</span>
                    </div>
                    <textarea
                      rows={4}
                      value={formData.coverLetter}
                      onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                      placeholder="Expliquez brièvement les motivations qui guident votre choix pour cette filière, votre parcours et vos ambitions professionnelles futures..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 5: SPONSOR / GUARDIAN & FINAL SUBMISSION
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-400" />
                    Tuteur Légal / Répondant Financier &amp; Validation
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Personne responsable en cas d&apos;urgence ou garante des frais de scolarité.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nom complet du Parent / Tuteur *</label>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Ex: Elhadj Ibrahim Ousmane"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Lien de parenté *</label>
                    <select
                      value={formData.parentRelation}
                      onChange={(e) => setFormData({ ...formData, parentRelation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Père" className="bg-slate-900">Père</option>
                      <option value="Mère" className="bg-slate-900">Mère</option>
                      <option value="Tuteur Légal" className="bg-slate-900">Tuteur Légal</option>
                      <option value="Employeur / Sponsor" className="bg-slate-900">Employeur / Entreprise Sponsor</option>
                      <option value="Candidat Autonome" className="bg-slate-900">Candidat Autonome (Auto-financé)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Téléphone du Tuteur / Contact d&apos;Urgence *</label>
                    <input
                      type="tel"
                      required
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="+227 96 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Email du Tuteur</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="parent@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Final Agreement */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.honorDeclaration}
                      onChange={(e) => setFormData({ ...formData, honorDeclaration: e.target.checked })}
                      className="size-4 rounded mt-0.5 text-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Je certifie sur l&apos;honneur l&apos;exactitude des renseignements et pièces fournis. J&apos;accepte le règlement intérieur et les conditions d&apos;admission de l&apos;établissement.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ─── Navigation Buttons ────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <ArrowLeft className="size-4" />
                  Précédent
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  Suivant
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.honorDeclaration}
                  className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Transmission du Dossier...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Soumettre Définitivement ma Candidature
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-slate-800/80">
        &copy; {new Date().getFullYear()} {schoolInfo.name} • Système d&apos;Admission Universitaire &amp; Scolaire Edut Pro.
      </footer>
    </div>
  );
}

// ─── DOCUMENT UPLOAD / CLOUD LINK CARD COMPONENT ─────────────────────────────

interface DocumentUploadCardProps {
  label: string;
  description: string;
  accept?: string;
  icon: React.ReactNode;
  value?: string;
  onChange: (val: string) => void;
}

async function compressImageFile(file: File, maxDimension = 1280, quality = 0.75): Promise<{ dataUrl: string; sizeStr: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      if (!file.type.startsWith("image/")) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
        const sizeStr = file.size > 1024 * 1024 ? `${sizeInMb} Mo` : `${Math.round(file.size / 1024)} Ko`;
        return resolve({ dataUrl: originalDataUrl, sizeStr });
      }

      const img = new Image();
      img.onerror = () => {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
        const sizeStr = file.size > 1024 * 1024 ? `${sizeInMb} Mo` : `${Math.round(file.size / 1024)} Ko`;
        resolve({ dataUrl: originalDataUrl, sizeStr });
      };
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve({ dataUrl: originalDataUrl, sizeStr: `${Math.round(file.size / 1024)} Ko` });
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
          const sizeStr = approxBytes > 1024 * 1024 
            ? `${(approxBytes / (1024 * 1024)).toFixed(1)} Mo`
            : `${Math.round(approxBytes / 1024)} Ko`;

          resolve({ dataUrl: compressedDataUrl, sizeStr });
        } catch (_) {
          resolve({ dataUrl: originalDataUrl, sizeStr: `${Math.round(file.size / 1024)} Ko` });
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function DocumentUploadCard({
  label,
  description,
  accept = "image/*,application/pdf",
  icon,
  value,
  onChange,
}: DocumentUploadCardProps) {
  const [mode, setMode] = useState<"file" | "cloud">("file");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.type === "application/pdf" && file.size > 3.5 * 1024 * 1024) {
      toast.error("Le fichier PDF dépasse 3.5 Mo. Veuillez le compresser avant de l'envoyer.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Le fichier dépasse la taille maximale autorisée de 15 Mo.");
      return;
    }

    setFileName(file.name);
    setIsReading(true);

    try {
      const { dataUrl, sizeStr } = await compressImageFile(file);
      setFileSize(sizeStr);
      onChange(dataUrl);
      setIsReading(false);
      toast.success(`Fichier "${file.name}" optimisé (${sizeStr}) et chargé avec succès !`);
    } catch (err: any) {
      setIsReading(false);
      toast.error("Erreur lors de la lecture du fichier.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const isImage = value?.startsWith("data:image/") || value?.match(/\.(jpg|jpeg|png|webp|gif)/i);
  const isPdf = value?.startsWith("data:application/pdf") || value?.match(/\.pdf/i);
  const hasValue = Boolean(value && value.trim().length > 0);

  return (
    <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-3xl space-y-4 relative overflow-hidden transition hover:border-slate-700">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-black text-white">{label}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>

        {hasValue && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="size-3" /> Prêt
          </span>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800/80">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition ${
            mode === "file"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="size-3.5" />
          Importer depuis l&apos;appareil
        </button>
        <button
          type="button"
          onClick={() => setMode("cloud")}
          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition ${
            mode === "cloud"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="size-3.5" />
          Lien Cloud (Drive / Dropbox)
        </button>
      </div>

      {/* Mode 1: File Browser / Drag & Drop */}
      {mode === "file" && (
        <div>
          {hasValue ? (
            <div className="p-3.5 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {isImage && (
                  <img
                    src={value}
                    alt="Preview"
                    className="size-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                )}
                {isPdf && (
                  <div className="size-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex flex-col items-center justify-center shrink-0 text-[9px] font-black">
                    <FileText className="size-5" />
                    PDF
                  </div>
                )}
                {!isImage && !isPdf && (
                  <div className="size-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="size-6" />
                  </div>
                )}
                <div className="truncate text-xs">
                  <p className="font-bold text-white truncate">{fileName || "Document numérisé"}</p>
                  <p className="text-[10px] text-slate-400">{fileSize || "Fichier attaché"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition">
                  Remplacer
                  <input
                    type="file"
                    accept={accept}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setFileName("");
                    setFileSize("");
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center ${
                isDragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900"
              }`}
            >
              <input
                type="file"
                accept={accept}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              {isReading ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold py-2">
                  <Loader2 className="size-4 animate-spin" />
                  Lecture du document en cours...
                </div>
              ) : (
                <>
                  <div className="size-10 bg-slate-800 text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">
                      Cliquez pour choisir un fichier
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ou glissez-déposez ici (PDF, PNG, JPG, WEBP)
                    </span>
                  </div>
                </>
              )}
            </label>
          )}
        </div>
      )}

      {/* Mode 2: Cloud Link Input */}
      {mode === "cloud" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={value || ""}
              onChange={(e) => {
                onChange(e.target.value);
                setFileName("Lien Cloud");
              }}
              placeholder="https://drive.google.com/... ou dropbox.com/..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            {hasValue && (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1 shrink-0"
              >
                Tester <ArrowRight className="size-3" />
              </a>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            💡 Astuce : Sur Google Drive, faites un clic droit sur le fichier ➔ <em>Partager</em> ➔ Définissez sur <strong>« Tous les utilisateurs disposant du lien »</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400">
          <Loader2 className="size-8 animate-spin" />
        </div>
      }
    >
      <ApplyFormContent />
    </Suspense>
  );
}

