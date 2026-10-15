"use client";

import React, { useState, useTransition } from "react";
import { 
  Users, User, BookOpen, Plus, Search, 
  Trash2, Edit3, X, UserPlus, Info, 
  Sparkles, CheckCircle2, Bookmark 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  savePedagogicalUnit, 
  deletePedagogicalUnit, 
  addTeacherToUnit, 
  removeTeacherFromUnit 
} from "@/domains/academics/actions/pedagogical-units.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  initialUnits: any[];
  teachers: any[];
  subjects: any[];
};

export default function PedagogicalUnitsClient({ initialUnits, teachers, subjects }: Props) {
  const [units, setUnits] = useState(initialUnits);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create/Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    subjectId: "",
    educationalLevel: "",
    leadTeacherId: "",
    description: ""
  });

  // Members Dialog State
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const handleOpenDialog = (unit: any = null) => {
    if (unit) {
      setSelectedUnit(unit);
      setFormData({
        name: unit.name || "",
        subjectId: unit.subjectId ? String(unit.subjectId) : "",
        educationalLevel: unit.educationalLevel || "",
        leadTeacherId: unit.leadTeacherId ? String(unit.leadTeacherId) : "",
        description: unit.description || ""
      });
    } else {
      setSelectedUnit(null);
      setFormData({
        name: "",
        subjectId: "",
        educationalLevel: "",
        leadTeacherId: "",
        description: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Le nom de l'unité est obligatoire");
      return;
    }

    startTransition(async () => {
      const res = await savePedagogicalUnit(selectedUnit?.id || null, formData);
      if (res.success) {
        toast.success(selectedUnit ? "Unité mise à jour" : "Unité créée avec succès");
        setIsDialogOpen(false);
        window.location.reload();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    });
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette unité pédagogique ?")) return;

    startTransition(async () => {
      const res = await deletePedagogicalUnit(id);
      if (res.success) {
        toast.success("Unité pédagogique supprimée");
        window.location.reload();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  const handleOpenMembers = (unit: any) => {
    setActiveUnit(unit);
    setIsMembersOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedTeacherId) {
      toast.error("Veuillez sélectionner un enseignant");
      return;
    }

    startTransition(async () => {
      const res = await addTeacherToUnit(activeUnit.id, Number(selectedTeacherId));
      if (res.success) {
        toast.success("Enseignant ajouté à l'unité");
        setSelectedTeacherId("");
        // Reload active unit local state or refresh page
        window.location.reload();
      } else {
        toast.error("Erreur lors de l'ajout de l'enseignant");
      }
    });
  };

  const handleRemoveMember = async (teacherId: number) => {
    if (!confirm("Voulez-vous retirer cet enseignant de l'unité ?")) return;

    startTransition(async () => {
      const res = await removeTeacherFromUnit(activeUnit.id, teacherId);
      if (res.success) {
        toast.success("Enseignant retiré de l'unité");
        window.location.reload();
      } else {
        toast.error("Erreur lors du retrait de l'enseignant");
      }
    });
  };

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.subject?.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.educationalLevel || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalUnits = units.length;
  const uniqueSubjects = new Set(units.map(u => u.subjectId).filter(Boolean)).size;
  const totalMembers = new Set(units.flatMap(u => u.members?.map((m: any) => m.employeeId) || [])).size;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="size-4 animate-pulse" />
              Espace Académique & Collaboration
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">
              Unités Pédagogiques <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">(UP)</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Gérez les regroupements professionnels d'enseignants par discipline ou niveau d'enseignement pour harmoniser le curriculum et partager les meilleures pratiques.
            </p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()}
            className="self-start md:self-center h-12 px-6 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-2xl shadow-lg border-t border-indigo-400/20 font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <Plus className="size-5" />
            Nouvelle Unité (UP)
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total des Unités (UP)", value: totalUnits, icon: <Bookmark className="size-5 text-indigo-600" />, color: "bg-indigo-50" },
          { label: "Disciplines Couvertes", value: uniqueSubjects, icon: <BookOpen className="size-5 text-blue-600" />, color: "bg-blue-50" },
          { label: "Enseignants Membres", value: totalMembers, icon: <Users className="size-5 text-emerald-600" />, color: "bg-emerald-50" }
        ].map((stat, i) => (
          <div key={i} className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${stat.color}`}>{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter / Search bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une unité pédagogique par nom, matière, niveau..."
            className="h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium transition-colors"
          />
        </div>
      </div>

      {/* Units Grid */}
      {filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
          <Users className="size-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-700">Aucune unité pédagogique trouvée</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm">Créer une nouvelle unité pédagogique pour commencer à organiser les enseignants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((u) => {
            const memberCount = u.members?.length || 0;
            return (
              <div 
                key={u.id}
                className="flex flex-col justify-between bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500" />
                
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {u.name}
                    </h3>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenDialog(u)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUnit(u.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {u.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {u.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <BookOpen className="size-4 text-indigo-500" />
                      Matière : <span className="text-slate-900 font-bold">{u.subject?.subjectName || "Toutes / Non définie"}</span>
                    </div>
                    {u.educationalLevel && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Bookmark className="size-4 text-blue-500" />
                        Niveau : <span className="text-slate-900 font-bold">{u.educationalLevel}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <User className="size-4 text-amber-500" />
                      Coordonnateur : <span className="text-slate-900 font-bold">{u.leadTeacher?.nom || "Non assigné"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Users className="size-4 text-slate-400" />
                    <span>{memberCount} enseignant{memberCount > 1 ? "s" : ""}</span>
                  </div>
                  <Button 
                    onClick={() => handleOpenMembers(u)}
                    variant="outline"
                    className="h-9 px-4 rounded-xl border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold transition-all"
                  >
                    Membres
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              {selectedUnit ? "Modifier l'Unité Pédagogique" : "Nouvelle Unité Pédagogique"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Remplissez les détails ci-dessous pour organiser votre équipe enseignante.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nom de l'Unité (UP)</label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Unité de Mathématiques, UP Physique"
                className="h-11 rounded-xl border-slate-200"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discipline / Matière</label>
                <select 
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Toutes les matières</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Niveau Scolaire</label>
                <Input 
                  value={formData.educationalLevel}
                  onChange={(e) => setFormData({ ...formData, educationalLevel: e.target.value })}
                  placeholder="Ex: Lycée, Collège..."
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enseignant Coordonnateur (Lead)</label>
              <select 
                value={formData.leadTeacherId}
                onChange={(e) => setFormData({ ...formData, leadTeacherId: e.target.value })}
                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Sélectionner un coordinateur</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.nom} ({t.departement || "Professeur"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description (Objectifs, thématiques)</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez les objectifs ou rôles de cette UP..."
                className="w-full min-h-[80px] p-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="h-11 rounded-xl border-slate-200"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Membres de l'UP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Gérez les enseignants membres de l'unité : <span className="font-bold text-indigo-600">{activeUnit?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add member Form */}
            <div className="flex gap-2 items-end border-b border-slate-100 pb-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ajouter un enseignant</label>
                <select 
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {teachers
                    .filter(t => !activeUnit?.members?.some((m: any) => m.employeeId === t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.nom} ({t.departement || "Professeur"})</option>
                    ))
                  }
                </select>
              </div>
              <Button 
                onClick={handleAddMember}
                disabled={isPending}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1 font-bold"
              >
                <UserPlus className="size-4" />
                Ajouter
              </Button>
            </div>

            {/* Members List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Membres Actuels</label>
              
              {!activeUnit?.members || activeUnit.members.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Aucun enseignant membre dans cette unité.</p>
              ) : (
                activeUnit.members.map((m: any) => (
                  <div 
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-indigo-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                        {m.teacher?.nom?.substring(0, 2) || "T"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-none">{m.teacher?.nom}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">{m.teacher?.departement || "Enseignant"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMember(m.employeeId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Retirer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMembersOpen(false)}
              className="h-10 rounded-xl w-full border-slate-200 font-bold"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
