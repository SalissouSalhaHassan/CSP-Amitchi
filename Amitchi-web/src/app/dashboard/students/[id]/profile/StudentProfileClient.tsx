"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  GraduationCap, Award, ShieldAlert, FileText, User, Calendar, BookOpen, 
  Plus, Trash2, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, Lock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveBehaviorReward, deleteBehaviorReward, saveCounselorNote, deleteCounselorNote } from "@/domains/students/actions/discipline.actions";

interface StudentProfileClientProps {
  currentUser: any;
  student: any;
  grades: any[];
  remediations: any[];
  assignments: any[];
  rewards: any[];
  incidents: any[];
  counselorNotes: any[];
}

export default function StudentProfileClient({
  currentUser,
  student,
  grades,
  remediations,
  assignments,
  rewards,
  incidents,
  counselorNotes
}: StudentProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"academic" | "behavior" | "counselor">("academic");
  const [isPending, startTransition] = useTransition();

  // Behavior form states
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardType, setRewardType] = useState("Encouragement");
  const [pointsEffect, setPointsEffect] = useState("10");
  const [rewardReason, setRewardReason] = useState("");

  // Counselor form states
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteType, setNoteType] = useState("Comportemental");
  const [confidentialContent, setConfidentialContent] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [isSecret, setIsSecret] = useState(true);

  // Check roles for counselor access
  const roleName = currentUser?.role?.roleName?.toLowerCase() || "";
  const isCounselorOrAdmin = currentUser?.admin || 
    ["super_admin", "general_director", "level_director", "counselor", "conseiller", "admin"].includes(roleName);

  // Compute behavior level
  const behaviorScore = student.behaviorScore ?? 100;
  let behaviorLevel = "Excellent";
  let behaviorColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
  
  if (behaviorScore >= 90) {
    behaviorLevel = "Excellent (Modèle)";
    behaviorColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
  } else if (behaviorScore >= 70) {
    behaviorLevel = "Bonne conduite";
    behaviorColor = "bg-blue-50 text-blue-600 border-blue-100";
  } else if (behaviorScore >= 50) {
    behaviorLevel = "Attention requise";
    behaviorColor = "bg-amber-50 text-amber-600 border-amber-100";
  } else {
    behaviorLevel = "Mesures disciplinaires nécessaires";
    behaviorColor = "bg-rose-50 text-rose-600 border-rose-100";
  }

  // Handle behavior reward submission
  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardReason.trim()) {
      toast.error("Veuillez renseigner un motif.");
      return;
    }

    startTransition(async () => {
      const res = await saveBehaviorReward({
        studentId: student.id,
        rewardType,
        pointsEffect: parseFloat(pointsEffect) || 0,
        reason: rewardReason,
      });

      if (res.success) {
        toast.success("Récompense/Sanction enregistrée avec succès !");
        setShowRewardForm(false);
        setRewardReason("");
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur de sauvegarde.");
      }
    });
  };

  const handleDeleteReward = (id: number) => {
    if (!confirm("Voulez-vous supprimer cette récompense/sanction ? Le score de l'élève sera réajusté.")) return;
    
    startTransition(async () => {
      const res = await deleteBehaviorReward(id, student.id);
      if (res.success) {
        toast.success("Supprimé avec succès.");
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur.");
      }
    });
  };

  // Handle counselor note submission
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confidentialContent.trim()) {
      toast.error("Le compte-rendu est vide.");
      return;
    }

    startTransition(async () => {
      const res = await saveCounselorNote({
        studentId: student.id,
        noteType,
        confidentialContent,
        recommendations,
        isSecret,
      });

      if (res.success) {
        toast.success("Note confidentielle enregistrée !");
        setShowNoteForm(false);
        setConfidentialContent("");
        setRecommendations("");
        window.location.reload();
      } else {
        toast.error(res.error || "Accès refusé.");
      }
    });
  };

  const handleDeleteNote = (id: number) => {
    if (!confirm("Supprimer cette note confidentielle définitivement ?")) return;

    startTransition(async () => {
      const res = await deleteCounselorNote(id, student.id);
      if (res.success) {
        toast.success("Note supprimée.");
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 pb-16">
      
      {/* Header Back Button */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard/students" 
          className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux élèves
        </Link>
      </div>

      {/* Card Info Student */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/5 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
            <User size={40} className="stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{student.nomEtudiant}</h1>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                Matricule: {student.numAdmission}
              </span>
            </div>
            <p className="text-slate-500 font-bold text-sm mt-1">
              Classe : <span className="text-slate-800 font-black">{student.classe || "Non spécifié"}</span> • Niveau : <span className="text-slate-800 font-black">{student.educationalLevel || "Non spécifié"}</span>
            </p>
          </div>
        </div>

        {/* Global Conduct Status */}
        <div className="flex flex-col items-start md:items-end gap-1.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Conduite</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900">{behaviorScore} pts</span>
            <span className={`px-2.5 py-0.5 border text-[9px] font-black uppercase tracking-widest rounded-full ${behaviorColor}`}>
              {behaviorLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button 
          onClick={() => setActiveTab("academic")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "academic" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <GraduationCap size={16} />
          Dossier Académique
        </button>
        <button 
          onClick={() => setActiveTab("behavior")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "behavior" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <Award size={16} />
          Profil Comportemental
        </button>
        
        {isCounselorOrAdmin && (
          <button 
            onClick={() => setActiveTab("counselor")}
            className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "counselor" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-slate-400 hover:text-slate-800"
            }`}
          >
            <Lock size={14} className={activeTab === "counselor" ? "text-indigo-600" : "text-slate-400"} />
            Notes Confidentielles
          </button>
        )}
      </div>

      {/* Content Tabs */}
      <div className="grid grid-cols-1 gap-6">

        {/* TAB 1: ACADEMIC */}
        {activeTab === "academic" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Grades & Marks List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="text-slate-500" size={18} />
                    Notes et Évaluations Récentes
                  </h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {grades.length > 0 ? (
                    grades.map((g) => {
                      const percentage = (g.marksObtained / g.maxMarks) * 100;
                      const isLowGrade = percentage < 50;

                      return (
                        <div key={g.id} className="py-4 flex justify-between items-center gap-4">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{g.examName}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                              {g.subjectName} • {g.examDate ? new Date(g.examDate).toLocaleDateString() : ""}
                            </p>
                            {g.remarks && (
                              <p className="text-xs text-slate-500 italic mt-1">"{g.remarks}"</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {isLowGrade && (
                              <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Alerte soutien
                              </span>
                            )}
                            <span className={`text-base font-black px-4 py-2 rounded-2xl ${
                              isLowGrade ? "bg-rose-50/50 text-rose-600" : "bg-emerald-50/50 text-emerald-600"
                            }`}>
                              {g.marksObtained}/{g.maxMarks}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-sm font-medium">
                      Aucune note disponible pour cet élève.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remediation & LMS Tasks Side Column */}
            <div className="space-y-6">
              
              {/* Active Remediations */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 relative overflow-hidden">
                <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="text-indigo-600" size={18} />
                  Plans de Remédiation
                </h3>
                
                <div className="space-y-4">
                  {remediations.length > 0 ? (
                    remediations.map((r) => (
                      <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 relative">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-slate-800">{r.subjectName}</span>
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                            r.status === "Actif" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-200 text-slate-600"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Alerte : {r.alertLevel}</p>
                        <p className="text-xs text-slate-600 mt-2 font-medium">{r.difficulties}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <span>Objectif : {r.targetGrade}/20</span>
                          <span>{r.sessionsCompleted}/{r.sessionsPlanned} séances</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      Aucun plan de remédiation actif.
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Assignments LMS */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="text-emerald-600" size={18} />
                  Devoirs LMS de Renforcement
                </h3>

                <div className="space-y-3">
                  {assignments.length > 0 ? (
                    assignments.map((a) => (
                      <div key={a.id} className="p-3.5 bg-emerald-50/20 border border-emerald-100 rounded-2xl">
                        <p className="text-xs font-black text-slate-800">{a.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{a.subjectName}</p>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{a.description}</p>
                        <div className="mt-2.5 flex justify-between items-center text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          <span>Max Score : {a.maxScore}</span>
                          <span>Délai : {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      Aucun devoir de renforcement assigné.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BEHAVIOR PROFILE */}
        {activeTab === "behavior" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Rewards and Distinctions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Award className="text-amber-500" size={20} />
                    Récompenses, Encouragements & Distinctions
                  </h3>
                  
                  {isCounselorOrAdmin && (
                    <Button 
                      onClick={() => setShowRewardForm(!showRewardForm)}
                      className="rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 h-9"
                    >
                      <Plus size={14} />
                      Octroyer
                    </Button>
                  )}
                </div>

                {/* Form behavior reward */}
                {showRewardForm && (
                  <form onSubmit={handleAddReward} className="bg-slate-50 p-5 rounded-2xl border border-slate-150 mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type d'Action</label>
                        <select 
                          value={rewardType}
                          onChange={(e) => setRewardType(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white font-semibold focus-visible:ring-indigo-500"
                        >
                          <option value="Félicitations">Félicitations (+15 pts)</option>
                          <option value="Tableau d'Honneur">Tableau d'Honneur (+10 pts)</option>
                          <option value="Encouragement">Encouragement (+5 pts)</option>
                          <option value="Avertissement">Avertissement (-10 pts)</option>
                          <option value="Blâme">Blâme (-20 pts)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact sur le Score (points)</label>
                        <Input 
                          type="number"
                          value={pointsEffect}
                          onChange={(e) => setPointsEffect(e.target.value)}
                          placeholder="Ex: 10 ou -15"
                          className="rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif de l'attribution</label>
                      <textarea
                        value={rewardReason}
                        onChange={(e) => setRewardReason(e.target.value)}
                        placeholder="Ex: Participation exemplaire aux activités citoyennes..."
                        className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowRewardForm(false)}
                        className="rounded-xl text-xs font-bold h-9"
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isPending}
                        className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                      >
                        Attribuer
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {rewards.length > 0 ? (
                    rewards.map((rw) => {
                      const isNegative = rw.pointsEffect < 0;

                      return (
                        <div key={rw.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{rw.rewardType}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isNegative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {rw.pointsEffect > 0 ? `+${rw.pointsEffect}` : rw.pointsEffect} pts
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 font-medium">{rw.reason}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                              Accordé par {rw.grantedBy} • {rw.createdAt ? new Date(rw.createdAt).toLocaleDateString() : ""}
                            </p>
                          </div>

                          {isCounselorOrAdmin && (
                            <button 
                              onClick={() => handleDeleteReward(rw.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-sm font-medium">
                      Aucune distinction ou sanction attribuée pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Discipline Incidents List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="text-rose-500" size={18} />
                Incidents Disciplinaires Signalés
              </h3>

              <div className="space-y-4">
                {incidents.length > 0 ? (
                  incidents.map((inc) => (
                    <div key={inc.id} className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl relative">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-slate-800">{inc.incidentType}</span>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                          inc.severity === "Critique" 
                            ? "bg-rose-500 text-white" 
                            : inc.severity === "Majeur" 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-slate-200 text-slate-600"
                        }`}>
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 font-medium">{inc.description}</p>
                      {inc.proposedAction && (
                        <p className="text-[10px] font-bold text-indigo-650 mt-2 bg-indigo-50/50 p-2 rounded-xl">
                          Action proposée : {inc.proposedAction}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t border-rose-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Par : {inc.createdBy}</span>
                        <span>{inc.date ? new Date(inc.date).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    Aucun incident disciplinaire signalé.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIDENTIAL COUNSELOR NOTES */}
        {activeTab === "counselor" && isCounselorOrAdmin && (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Lock className="text-slate-800" size={18} />
                    Espace Confidentiel du Conseiller / Direction
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    🔒 Seul le personnel autorisé peut lire et rédiger ces observations
                  </p>
                </div>

                <Button 
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 h-9"
                >
                  <Plus size={14} />
                  Nouvelle Note
                </Button>
              </div>

              {/* Form counselor note */}
              {showNoteForm && (
                <form onSubmit={handleAddNote} className="bg-slate-50 p-6 rounded-2xl border border-slate-150 mb-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type de Séance/Note</label>
                      <select 
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white font-semibold focus-visible:ring-indigo-500"
                      >
                        <option value="Psychologique">Séance Psychologique</option>
                        <option value="Social">Suivi Social / Familial</option>
                        <option value="Comportemental">Observation Comportementale</option>
                        <option value="Académique">Accompagnement Académique</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2.5 pt-4">
                      <input 
                        type="checkbox"
                        id="isSecretCheckbox"
                        checked={isSecret}
                        onChange={(e) => setIsSecret(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="isSecretCheckbox" className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none">
                        Note Ultra-Secrète (Direction uniquement)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compte-rendu confidentiel *</label>
                    <textarea
                      value={confidentialContent}
                      onChange={(e) => setConfidentialContent(e.target.value)}
                      placeholder="Détails de l'entretien (problèmes familiaux, détresse psychologique, observation comportementale...)"
                      className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommandations & Actions suggérées</label>
                    <textarea
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="Conseils donnés à l'élève ou actions à entreprendre..."
                      className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowNoteForm(false)}
                      className="rounded-xl text-xs font-bold h-9"
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                    >
                      Enregistrer
                    </Button>
                  </div>
                </form>
              )}

              {/* Counselor notes list */}
              <div className="space-y-6">
                {counselorNotes.length > 0 ? (
                  counselorNotes.map((note) => (
                    <div key={note.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200 relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs uppercase tracking-wider bg-slate-200/50 px-2.5 py-1 rounded-xl">
                            {note.noteType}
                          </span>
                          {note.isSecret && (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                              <Lock size={8} />
                              Confidentiel
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                        {note.confidentialContent}
                      </p>

                      {note.recommendations && (
                        <div className="mt-4 pt-3 border-t border-slate-200/50">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Recommandations :</p>
                          <p className="text-xs text-slate-600 font-medium mt-1 italic">
                            "{note.recommendations}"
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Écrit par un conseiller qualifié</span>
                        <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">
                    Aucune note confidentielle consignée pour cet élève.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
