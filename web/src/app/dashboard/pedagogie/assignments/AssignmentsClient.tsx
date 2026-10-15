"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Check,
  X,
  BookOpen,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Crown
} from "lucide-react";
import Link from "next/link";
import {
  assignTeacherToClassSubject,
  removeTeacherAssignment,
  updateTeacherAssignment
} from "@/domains/academics/actions/teacher-assignments.actions";

interface Props {
  classes: any[];
  subjects: any[];
  teachers: any[];
  sessions: any[];
  initialAssignments: any;
}

export default function AssignmentsClient({
  classes,
  subjects,
  teachers,
  sessions,
  initialAssignments,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<any[]>(initialAssignments?.data || initialAssignments || []);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    classId: "",
    subjectId: "",
    sessionId: "",
    coefficient: "1",
    weeklyHours: "2.5",
    isPrincipalTeacher: false,
    active: true,
  });

  const filteredAssignments = assignments.filter((a) => {
    const teacherName = `${a.employee?.nom || ""} ${a.employee?.prenom || ""}`.toLowerCase();
    const className = (a.class?.className || "").toLowerCase();
    const subjectName = (a.subject?.subjectName || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return teacherName.includes(query) || className.includes(query) || subjectName.includes(query);
  });

  const handleOpenNew = () => {
    setFormData({
      employeeId: teachers[0]?.id?.toString() || "",
      classId: classes[0]?.id?.toString() || "",
      subjectId: subjects[0]?.id?.toString() || "",
      sessionId: sessions[0]?.id?.toString() || "",
      coefficient: "1",
      weeklyHours: "2.5",
      isPrincipalTeacher: false,
      active: true,
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (assignment: any) => {
    setFormData({
      employeeId: assignment.employeeId?.toString() || "",
      classId: assignment.classId?.toString() || "",
      subjectId: assignment.subjectId?.toString() || "",
      sessionId: assignment.sessionId?.toString() || "",
      coefficient: assignment.coefficient?.toString() || "1",
      weeklyHours: assignment.weeklyHours?.toString() || "0",
      isPrincipalTeacher: assignment.isPrincipalTeacher || false,
      active: assignment.active ?? true,
    });
    setEditingId(assignment.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.classId || !formData.subjectId || !formData.sessionId) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          // Update
          const res = await updateTeacherAssignment(editingId, {
            employeeId: Number(formData.employeeId),
            isPrincipalTeacher: formData.isPrincipalTeacher,
            coefficient: Number(formData.coefficient),
            weeklyHours: Number(formData.weeklyHours),
            active: formData.active,
          });

          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success("Affectation mise à jour avec succès !");
            setShowModal(false);
            router.refresh();
            // Refresh local state helper
            setAssignments(prev =>
              prev.map(a =>
                a.id === editingId
                  ? {
                      ...a,
                      employeeId: Number(formData.employeeId),
                      employee: teachers.find(t => t.id === Number(formData.employeeId)),
                      isPrincipalTeacher: formData.isPrincipalTeacher,
                      coefficient: Number(formData.coefficient),
                      weeklyHours: Number(formData.weeklyHours),
                      active: formData.active,
                    }
                  : a
              )
            );
          }
        } else {
          // Create
          const res = await assignTeacherToClassSubject({
            employeeId: Number(formData.employeeId),
            classId: Number(formData.classId),
            subjectId: Number(formData.subjectId),
            sessionId: Number(formData.sessionId),
            isPrincipalTeacher: formData.isPrincipalTeacher,
            coefficient: Number(formData.coefficient),
            weeklyHours: Number(formData.weeklyHours),
          });

          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success("Enseignant affecté avec succès !");
            setShowModal(false);
            router.refresh();
            
            // Re-fetch helper to update table dynamically
            const fresh = {
              id: Math.random(), // Temporary UI ID until refresh
              employeeId: Number(formData.employeeId),
              classId: Number(formData.classId),
              subjectId: Number(formData.subjectId),
              sessionId: Number(formData.sessionId),
              employee: teachers.find(t => t.id === Number(formData.employeeId)),
              class: classes.find(c => c.id === Number(formData.classId)),
              subject: subjects.find(s => s.id === Number(formData.subjectId)),
              session: sessions.find(se => se.id === Number(formData.sessionId)),
              isPrincipalTeacher: formData.isPrincipalTeacher,
              coefficient: Number(formData.coefficient),
              weeklyHours: Number(formData.weeklyHours),
              active: true,
              createdAt: new Date().toISOString()
            };
            setAssignments(prev => [fresh, ...prev]);
          }
        }
      } catch (err: any) {
        toast.error("Erreur serveur", { description: err.message });
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette affectation ?")) return;

    startTransition(async () => {
      try {
        const res = await removeTeacherAssignment(id);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Affectation supprimée avec succès !");
          setAssignments(prev => prev.filter(a => a.id !== id));
          router.refresh();
        }
      } catch (err: any) {
        toast.error("Erreur de suppression", { description: err.message });
      }
    });
  };

  const handleToggleActive = async (assignment: any) => {
    startTransition(async () => {
      try {
        const nextActive = !assignment.active;
        const res = await updateTeacherAssignment(assignment.id, { active: nextActive });
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(nextActive ? "Affectation activée" : "Affectation désactivée");
          setAssignments(prev =>
            prev.map(a => (a.id === assignment.id ? { ...a, active: nextActive } : a))
          );
          router.refresh();
        }
      } catch (err: any) {
        toast.error("Erreur de modification", { description: err.message });
      }
    });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/pedagogie" className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors mt-1 print:hidden">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Affectation des Enseignants
              </h1>
              <Sparkles size={20} className="text-indigo-500 animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium ml-1">
              Associez les professeurs aux classes, matières et définissez les coefficients officiels.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenNew}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center gap-2 shadow-lg shadow-indigo-150"
          disabled={isPending}
        >
          <Plus size={18} />
          Nouvelle Affectation
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <Input
            placeholder="Rechercher par enseignant, classe ou matière..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-11 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50/50"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <th className="py-4 px-6">Enseignant</th>
                <th className="py-4 px-6">Classe</th>
                <th className="py-4 px-6">Matière</th>
                <th className="py-4 px-6">Session Académique</th>
                <th className="py-4 px-6 text-center">Coef</th>
                <th className="py-4 px-6 text-center">Heures Hebdo</th>
                <th className="py-4 px-6 text-center">Prof. Principal</th>
                <th className="py-4 px-6 text-center">Statut</th>
                <th className="py-4 px-6 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                        {a.employee?.nom ? a.employee.nom.substring(0, 2).toUpperCase() : "PF"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{a.employee?.nom} {a.employee?.prenom}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{a.employee?.matricule || "Pas de matricule"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border">
                      {a.class?.className || "Classe non spécifiée"}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-slate-400" />
                      <span>{a.subject?.subjectName || "Matière non spécifiée"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{a.session?.sessionName || "Session Courante"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-indigo-600">
                    {a.coefficient || 1}
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-slate-600">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{a.weeklyHours || 0} h</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {a.isPrincipalTeacher ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg text-xs font-black">
                        <Crown size={12} />
                        Oui
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Non</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleToggleActive(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        a.active
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                      }`}
                      disabled={isPending}
                    >
                      {a.active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right space-x-1 print:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(a)}
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      disabled={isPending}
                    >
                      <Plus className="rotate-45" size={14} /> {/* Placeholder Edit or custom icon */}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(a.id)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      disabled={isPending}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Aucune affectation trouvée pour cette sélection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border p-6 space-y-4 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-black text-slate-950">
                {editingId ? "Modifier l'affectation" : "Nouvelle affectation pédagogique"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Enseignant *</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl font-medium focus:border-indigo-500 bg-white"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.nom} {t.prenom} ({t.matricule || "No matricule"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Classe / Niveau *</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl font-medium focus:border-indigo-500 bg-white"
                    disabled={Boolean(editingId)} // Prevent shifting class once assigned
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Matière *</label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl font-medium focus:border-indigo-500 bg-white"
                    disabled={Boolean(editingId)} // Prevent shifting subject once assigned
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Session Académique *</label>
                  <select
                    value={formData.sessionId}
                    onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl font-medium focus:border-indigo-500 bg-white"
                    disabled={Boolean(editingId)} // Prevent shifting session once assigned
                  >
                    {sessions.map(se => (
                      <option key={se.id} value={se.id}>{se.sessionName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Coefficient *</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.coefficient}
                    onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                    className="h-11 border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block">Heures hebdomadaires *</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                    className="h-11 border-slate-200 rounded-xl"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border">
                  <input
                    type="checkbox"
                    id="isPrincipalTeacher"
                    checked={formData.isPrincipalTeacher}
                    onChange={(e) => setFormData({ ...formData, isPrincipalTeacher: e.target.checked })}
                    className="h-5 w-5 border-slate-300 text-indigo-600 focus:ring-indigo-500 rounded-md"
                  />
                  <div>
                    <label htmlFor="isPrincipalTeacher" className="text-sm font-bold text-slate-800 block cursor-pointer">Professeur Principal</label>
                    <span className="text-[11px] text-slate-400 font-medium block">Cochez si cet enseignant est le titulaire/responsable principal de cette classe.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)} className="h-11 rounded-xl">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md"
                  disabled={isPending}
                >
                  {isPending ? "Traitement..." : editingId ? "Enregistrer" : "Créer l'affectation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
