"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { issueLibraryBook } from "@/domains/library/actions/library.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { LibraryIssueFormData } from "../validators/library.schema";
import { Calendar, CheckCircle2, Repeat, Search, User } from "lucide-react";

interface IssueBookDialogProps {
  bookId: number;
  bookTitle: string;
  trigger?: React.ReactNode;
}

export default function IssueBookDialog({
  bookId,
  bookTitle,
  trigger,
}: IssueBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [type, setType] = useState<"student" | "employee">("student");
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (open) {
      getStudents().then((res) => {
        if (res.data) setStudents(res.data as any);
      });
      getEmployees().then((res) => {
        if (res.data) setEmployees(res.data as any);
      });
      setSelectedBorrowerId(null);
      setBorrowerSearch("");
      setError("");
    }
  }, [open]);

  const filteredStudents = useMemo(() => {
    const q = borrowerSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 50);
    return students
      .filter((s) =>
        [s.nomEtudiant, s.prenom, s.matricule, s.classe]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [students, borrowerSearch]);

  const filteredEmployees = useMemo(() => {
    const q = borrowerSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 50);
    return employees
      .filter((e) =>
        [e.nom, e.prenom, e.poste, e.matricule]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [employees, borrowerSearch]);

  const setPresetDays = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setDueDate(d.toISOString().split("T")[0]);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBorrowerId) {
      setError("Veuillez sélectionner un emprunteur dans la liste.");
      return;
    }

    setLoading(true);
    setError("");

    const data: LibraryIssueFormData = {
      bookId: bookId,
      studentId: type === "student" ? selectedBorrowerId : null,
      employeeId: type === "employee" ? selectedBorrowerId : null,
      dueDate: dueDate,
    };

    const result = await issueLibraryBook(data);

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="text-primary hover:underline font-bold text-sm">
            Prêter
          </button>
        )}
      </div>
      <DialogContent className="sm:max-w-lg rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Repeat size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Gestion des Prêts
              </p>
              <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Prêter un Livre / Ouvrage
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 px-5 py-3.5 rounded-2xl text-xs font-bold animate-shake">
              {error}
            </div>
          )}

          {/* Book Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Ouvrage sélectionné
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
              {bookTitle}
            </p>
          </div>

          <div className="space-y-4">
            {/* Borrower Type Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Catégorie d&apos;emprunteur
              </Label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setType("student");
                    setSelectedBorrowerId(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    type === "student"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  🎓 Étudiant / Élève
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType("employee");
                    setSelectedBorrowerId(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    type === "employee"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  💼 Enseignant / Personnel
                </button>
              </div>
            </div>

            {/* Search and Select Borrower */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                Rechercher {type === "student" ? "l'étudiant" : "le membre du personnel"} *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <Input
                  value={borrowerSearch}
                  onChange={(e) => setBorrowerSearch(e.target.value)}
                  placeholder="Tapez un nom, prénom ou matricule..."
                  className="pl-9 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Scrollable Selector List */}
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950 p-1">
                {type === "student" ? (
                  filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => {
                      const isSelected = selectedBorrowerId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedBorrowerId(s.id)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {s.nomEtudiant || `${s.nom || ""} ${s.prenom || ""}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {s.matricule ? `Mat: ${s.matricule}` : ""} {s.classe ? `• ${s.classe}` : ""}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-400">Aucun étudiant trouvé</p>
                  )
                ) : (
                  filteredEmployees.length > 0 ? (
                    filteredEmployees.map((e) => {
                      const isSelected = selectedBorrowerId === e.id;
                      return (
                        <div
                          key={e.id}
                          onClick={() => setSelectedBorrowerId(e.id)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {e.nom || `${e.nomPrenom || ""}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {e.poste || "Personnel"}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-400">Aucun employé trouvé</p>
                  )
                )}
              </div>
            </div>

            {/* Return Due Date & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                  Date de retour prévue *
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetDays(7)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                  >
                    +7j
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDays(14)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                  >
                    +14j
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDays(30)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                  >
                    +30j
                  </button>
                </div>
              </div>

              <Input
                name="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedBorrowerId}
              className="rounded-xl px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-500/20 dark:shadow-none"
            >
              {loading ? "Enregistrement..." : "Confirmer le Prêt"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
