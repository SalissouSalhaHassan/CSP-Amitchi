"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSalaryRecord, markSalaryAsPaid, deleteSalaryRecord, getEmployeeAttendanceSummary, savePayrollRules } from "@/domains/hr/actions/payroll.actions";
import { ArrowLeft, Users, TrendingUp, Clock, Plus, CheckCircle, FileText, Settings, RefreshCw, Trash2, ChevronDown, Printer, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import HrDocumentPrintModal, { HrDocType } from "@/domains/hr/components/HrDocumentPrintModal";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function fmt(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " CFA"; }

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", color)}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PayrollClient({ dashboard, initialRecords, rules, employees, headerConfig, canEdit, canDelete }: any) {
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard"|"generate"|"list">("dashboard");
  const [records, setRecords] = useState<any[]>(initialRecords);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printRecord, setPrintRecord] = useState<any>(null);
  const [printEmp, setPrintEmp] = useState<any>(null);
  const [printDocType, setPrintDocType] = useState<HrDocType>("payslip");

  // Generate tab state
  const now = new Date();
  const [selMonth, setSelMonth] = useState(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
  const [selEmpId, setSelEmpId] = useState<number | null>(null);
  const [basicSalary, setBasicSalary] = useState(0);
  const [presents, setPresents] = useState(0);
  const [absents, setAbsents] = useState(0);
  const [conges, setConges] = useState(0);
  const [totalDays, setTotalDays] = useState(30);
  const [bonus, setBonus] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Rules modal
  const [showRules, setShowRules] = useState(false);
  const [rLeave, setRLeave] = useState(rules?.leaveAllowPerMonth ?? 1);
  const [rLate, setRLate] = useState(rules?.latePenalty ?? 0.5);

  // Months list (last 12)
  const monthsList: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  }

  const perDay = totalDays > 0 ? basicSalary / totalDays : 0;
  const allowedLeaves = Math.min(conges, rLeave);
  const payable = presents + allowedLeaves;
  const calcBasic = Math.min(basicSalary, payable * perDay);
  const totalAllow = bonus + overtime;
  const totalDeduct = taxes + advance;
  const netSalary = calcBasic + totalAllow - totalDeduct;

  const onEmpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelEmpId(id);
    const emp = employees.find((x: any) => x.id === id);
    if (emp) setBasicSalary(Number(emp.salaireBase || 0));
  };

  const loadAttendance = async () => {
    if (!selEmpId) return;
    const res = await getEmployeeAttendanceSummary(selEmpId, selMonth);
    const d = (res as any).data?.data || (res as any).data || {};
    setPresents(d.presents || 0);
    setAbsents(d.absents || 0);
    setConges(d.conges || 0);
  };

  const handleSave = async (status: "Paid" | "Unpaid") => {
    if (!selEmpId) return setMsg("Veuillez sélectionner un employé.");
    setSaving(true); setMsg("");
    const res = await createSalaryRecord({
      employeeId: selEmpId, monthYear: selMonth,
      absentDays: absents, leaveTaken: conges,
      basicSalary, calculatedBasic: calcBasic,
      totalAllowance: totalAllow, totalDeduction: totalDeduct,
      netSalary, status,
    });
    setSaving(false);
    if ((res as any).success) { setMsg(`✅ Enregistré (${status})`); router.refresh(); setTab("list"); }
    else setMsg(`❌ ${(res as any).error || "Erreur"}`);
  };

  const handleMarkPaid = (id: number) => {
    startTransition(async () => {
      await markSalaryAsPaid(id);
      setRecords(r => r.map(x => x.id === id ? {...x, status:"Paid"} : x));
      if (selectedRecord?.id === id) setSelectedRecord((r: any) => ({...r, status:"Paid"}));
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cet enregistrement ?")) return;
    startTransition(async () => {
      await deleteSalaryRecord(id);
      setRecords(r => r.filter(x => x.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
    });
  };

  const handleSaveRules = async () => {
    await savePayrollRules({ leaveAllowPerMonth: rLeave, latePenalty: rLate, halfDayPenalty: 0.5 });
    setShowRules(false);
  };

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard RH" },
    { id: "generate",  label: "💰 Générer Salaire" },
    { id: "list",      label: "📜 Liste & Fiches" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-10 space-y-6 font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/dashboard/hr" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={13}/> Retour RH
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Gestion des Salaires</h1>
            <span className="text-lg font-bold text-slate-400 font-arabic">إدارة الرواتب</span>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setShowRules(true)} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
            <Settings size={15}/> Paramètres RH
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all", tab === t.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: DASHBOARD ─── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Employés Actifs" value={dashboard.activeEmployees ?? 0} sub="Personnel en service" icon={<Users size={22} className="text-indigo-600"/>} color="bg-indigo-50"/>
            <StatCard label={`Salaires Payés (${dashboard.currentMonthYear ?? ""})`} value={fmt(dashboard.paidThisMonth ?? 0)} sub="Ce mois-ci" icon={<CheckCircle size={22} className="text-emerald-600"/>} color="bg-emerald-50"/>
            <StatCard label="Salaires en Attente" value={fmt(dashboard.totalUnpaid ?? 0)} sub="Non encore payés" icon={<Clock size={22} className="text-amber-600"/>} color="bg-amber-50"/>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">Derniers Paiements</h2>
              <button onClick={() => setTab("list")} className="text-xs font-bold text-indigo-600 hover:underline">Voir tout →</button>
            </div>
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-50">
                {["Employé","Mois","Net à Payer","Statut"].map(h => <th key={h} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {(dashboard.recentRecords || []).length === 0 && (
                  <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-semibold">Aucun enregistrement</td></tr>
                )}
                {(dashboard.recentRecords || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-4 font-bold text-sm text-slate-900">{r.employeeName}</td>
                    <td className="px-8 py-4 text-sm text-slate-500">{r.monthYear}</td>
                    <td className="px-8 py-4 text-sm font-black text-slate-900">{fmt(r.netSalary)}</td>
                    <td className="px-8 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", r.status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                        {r.status === "Paid" ? "Payé" : "En attente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: GENERATE ─── */}
      {tab === "generate" && (
        <div className="space-y-6">
          {/* Selectors */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-wrap items-center gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mois</label>
              <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
                className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500">
                {monthsList.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex-1 min-w-[220px]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employé</label>
              <select onChange={onEmpChange}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500">
                <option value="">— Sélectionner —</option>
                {employees.filter((e: any) => (e.statut || "").toUpperCase() === "ACTIF").map((e: any) => (
                  <option key={e.id} value={e.id}>{e.empId} — {e.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Attendance & Base */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest">📅 Présence &amp; Base</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Jours Prévus", totalDays, setTotalDays],
                  ["Présents", presents, setPresents],
                  ["Absents", absents, setAbsents],
                  ["Congés", conges, setConges],
                ].map(([label, val, setter]: any) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                    <input type="number" min={0} value={val}
                      onChange={e => setter(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500"/>
                  </div>
                ))}
              </div>
              <button onClick={loadAttendance} disabled={!selEmpId}
                className="w-full h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <RefreshCw size={14}/> Auto-Charger Présence du Mois
              </button>
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
                {[["Salaire Base", fmt(basicSalary)],["Taux/Jour", fmt(perDay)],["Base Calculée", fmt(calcBasic)]].map(([l, v]) => (
                  <div key={l}><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{l}</p><p className="text-base font-black text-slate-800 mt-1">{v}</p></div>
                ))}
              </div>
            </div>

            {/* RIGHT: Gains & Retenues */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="text-sm font-black text-emerald-600 uppercase tracking-widest">🟢 Gains (+)</h2>
                  {[["Prime / Bonus", bonus, setBonus], ["Heures Supp.", overtime, setOvertime]].map(([l, v, s]: any) => (
                    <div key={l} className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l}</label>
                      <input type="number" min={0} value={v} onChange={e => s(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-right outline-none focus:border-emerald-400"/>
                    </div>
                  ))}
                  <div className="text-right text-xs font-bold text-emerald-600">Total: {fmt(totalAllow)}</div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-black text-rose-600 uppercase tracking-widest">🔴 Retenues (-)</h2>
                  {[["Taxes / Assur.", taxes, setTaxes], ["Avance Salaire", advance, setAdvance]].map(([l, v, s]: any) => (
                    <div key={l} className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l}</label>
                      <input type="number" min={0} value={v} onChange={e => s(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-right outline-none focus:border-rose-400"/>
                    </div>
                  ))}
                  <div className="text-right text-xs font-bold text-rose-600">Total: {fmt(totalDeduct)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Footer */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Net à Payer</p>
              <p className="text-4xl font-black text-indigo-600 mt-1">{fmt(netSalary)}</p>
            </div>
            {msg && <p className="text-sm font-bold px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">{msg}</p>}
            {canEdit && (
              <div className="flex gap-3">
                <button onClick={() => handleSave("Unpaid")} disabled={saving}
                  className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all disabled:opacity-50">
                  💾 Sauvegarder (Non Payé)
                </button>
                <button onClick={() => handleSave("Paid")} disabled={saving}
                  className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 transition-all disabled:opacity-50">
                  {saving ? "Enregistrement..." : "💵 Payer Maintenant"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: LIST ─── */}
      {tab === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records Table */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-100">
                {["Employé","Mois","Net","Statut","Actions"].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {records.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-semibold">Aucun enregistrement de salaire</td></tr>
                )}
                {records.map((r: any) => (
                  <tr key={r.id} onClick={() => setSelectedRecord(r)}
                    className={cn("cursor-pointer hover:bg-slate-50/50 transition-all", selectedRecord?.id === r.id && "bg-indigo-50/50")}>
                    <td className="px-6 py-4 font-bold text-sm">{(r as any).employee?.nom || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{r.monthYear}</td>
                    <td className="px-6 py-4 text-sm font-black">{fmt(r.netSalary)}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase border", r.status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                        {r.status === "Paid" ? "Payé" : "En attente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canEdit && r.status === "Unpaid" && (
                          <button onClick={e => { e.stopPropagation(); handleMarkPaid(r.id); }} disabled={isPending}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-100 transition-colors">
                            ✅ Payer
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                            className="w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center text-rose-400 hover:bg-rose-50 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            {!selectedRecord ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300 py-16">
                <FileText size={48}/>
                <p className="text-sm font-bold text-center">Sélectionnez un enregistrement pour voir les détails</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xl font-black text-indigo-600">{(selectedRecord as any).employee?.nom || "—"}</p>
                  <p className="text-xs text-slate-400 font-bold mt-1">ID {selectedRecord.id} · {selectedRecord.monthYear}</p>
                </div>
                <hr className="border-slate-100"/>
                {[
                  ["Salaire de Base", fmt(selectedRecord.basicSalary)],
                  ["Base Calculée", fmt(selectedRecord.calculatedBasic)],
                  ["+ Primes", fmt(selectedRecord.totalAllowance)],
                  ["- Retenues", fmt(selectedRecord.totalDeduction)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-semibold">{l}</span>
                    <span className="text-sm font-black text-slate-800">{v}</span>
                  </div>
                ))}
                <hr className="border-slate-100"/>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net à Payer</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{fmt(selectedRecord.netSalary)}</p>
                  <span className={cn("mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border", selectedRecord.status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                    {selectedRecord.status === "Paid" ? "✅ Payé" : "⏳ En Attente"}
                  </span>
                </div>
                {selectedRecord.paymentDate && (
                  <p className="text-[10px] text-center text-slate-400 font-bold">
                    Payé le {new Date(selectedRecord.paymentDate).toLocaleDateString("fr-FR")}
                  </p>
                )}

                {/* Official Payslip Print Button */}
                <button
                  onClick={() => {
                    const emp = selectedRecord.employee || employees.find((e: any) => e.id === selectedRecord.employeeId);
                    setPrintRecord(selectedRecord);
                    setPrintEmp(emp);
                    setPrintDocType("payslip");
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Printer size={16} />
                  Imprimer Bulletin Officiel
                </button>

                {canEdit && selectedRecord.status === "Unpaid" && (
                  <button onClick={() => handleMarkPaid(selectedRecord.id)} disabled={isPending}
                    className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50">
                    💵 Marquer comme Payé
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Rules Modal ─── */}
      {showRules && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRules(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-slate-900">⚙️ Paramètres RH</h2>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Congés payés / mois</label>
              <input type="number" min={0} value={rLeave} onChange={e => setRLeave(Number(e.target.value))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pénalité retard (fraction du jour)</label>
              <input type="number" min={0} step={0.1} max={1} value={rLate} onChange={e => setRLate(Number(e.target.value))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowRules(false)} className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={handleSaveRules} className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Mettre à jour</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Official HR Document Printing Modal ─── */}
      <HrDocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        headerConfig={headerConfig}
        docType={printDocType}
        salaryRecord={printRecord}
        employee={printEmp}
      />
    </div>
  );
}
