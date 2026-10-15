"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { saveBatchAttendance } from "@/domains/attendance/actions/attendance.actions";
import { Check, X, Clock, Info, Save, Scan, List, Search, MessageSquare, Phone, Printer, Fingerprint } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { AttendanceScanner } from "./AttendanceScanner";
import { BiometricScanner } from "./BiometricScanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
}

interface AttendanceGridProps {
  students: Student[];
  classId: number;
  subjectId?: number;
  employeeId?: number;
  date: string;
  initialRecords?: any[];
  canEdit?: boolean;
}

function AttendanceStatusBadge({ status }: { status: "Local" | "Synced" | "Failed" }) {
  if (status === "Local") {
    return <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">Local</span>;
  }
  if (status === "Failed") {
    return <span className="ml-2 px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest rounded-full">Failed</span>;
  }
  return <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-full">Synced</span>;
}

export default function AttendanceGrid({ students, classId, subjectId, employeeId, date, initialRecords = [], canEdit = true }: AttendanceGridProps) {
  const isOnline = useOnlineStatus();
  const { mutate } = useOfflineMutation<any>();
  const [loading, setLoading] = useState(false);
  const [batchStatus, setBatchStatus] = useState<"Local" | "Synced" | "Failed">("Synced");

  useEffect(() => {
    async function loadBatchStatus() {
      try {
        const { localDb } = await import("@/infrastructure/local-db/dexie");
        const item = await localDb.outbox
          .where("idempotencyKey")
          .equals(`attendance:${classId}:${subjectId || "all"}:${date}`)
          .first();

        if (item) {
          if (item.status === "failed") {
            setBatchStatus("Failed");
          } else if (item.status === "synced") {
            setBatchStatus("Synced");
          } else {
            setBatchStatus("Local");
          }
        } else {
          setBatchStatus("Synced");
        }
      } catch (e) {
        console.warn("Failed to load attendance batch outbox status:", e);
        setBatchStatus("Synced");
      }
    }
    loadBatchStatus();
  }, [classId, subjectId, date, loading]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendSMS, setSendSMS] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [records, setRecords] = useState<Record<number, { status: string; remark: string }>>(
    students.reduce((acc, s) => {
      const existing = initialRecords.find(r => r.studentId === s.id);
      acc[s.id] = {
        status: existing?.status || "Présent",
        remark: existing?.remark || "",
      };
      return acc;
    }, {} as any)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const eventSource = new EventSource("/api/attendance/stream");
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.classId === classId && (data.subjectId === subjectId || !subjectId)) {
           toast.info("Mise à jour en temps réel reçue");
        }
      } catch (err) {
        console.error("Failed to parse event data:", err);
      }
    };

    eventSource.onmessage = handleMessage;
    
    return () => {
      eventSource.close();
    };
  }, [classId, subjectId]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numAdmission.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    const counts = { Presents: 0, Absents: 0, Lates: 0, Excused: 0 };
    Object.values(records).forEach(r => {
      if (r.status === "Présent") counts.Presents++;
      else if (r.status === "Absent") counts.Absents++;
      else if (r.status === "En Retard") counts.Lates++;
      else if (r.status === "Excusé") counts.Excused++;
    });
    return counts;
  }, [records]);

  const updateStatus = (studentId: number, status: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const updateRemark = (studentId: number, remark: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remark }
    }));
  };

  const markAllPresent = () => {
    const newRecords = { ...records };
    students.forEach(s => {
      newRecords[s.id] = { ...newRecords[s.id], status: "Présent" };
    });
    setRecords(newRecords);
    toast.success("Tous les élèves sont marqués présents");
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    // Deduplicate records list to be absolutely sure
    const dedupedRecords = Object.entries(records).map(([id, val]) => ({
      studentId: Number(id),
      status: val.status,
      remark: val.remark,
    }));

    const data = {
      classId,
      subjectId: subjectId || null,
      employeeId: employeeId || null,
      date,
      records: dedupedRecords,
      sendSMS,
      sendWhatsApp,
    };

    const result = await mutate(data as any, {
      targetTable: "attendanceBatches",
      onlineAction: saveBatchAttendance as any,
      entity: "attendance",
      entityId: `${classId}:${subjectId || "all"}:${date}`,
      idempotencyKey: `attendance:${classId}:${subjectId || "all"}:${date}`,
    });

    if (result.success) {
      // Store flat studentAttendance locally to fulfill schema and prevent duplicates
      try {
        const { localDb } = await import("@/infrastructure/local-db/dexie");
        for (const r of dedupedRecords) {
          const existing = await localDb.studentAttendance
            .filter(x => x.classId === classId && x.subjectId === (subjectId || null) && x.date === date && x.studentId === r.studentId)
            .first();

          await localDb.studentAttendance.put({
            id: existing?.id,
            classId,
            subjectId: subjectId || null,
            date,
            studentId: r.studentId,
            status: r.status,
            remark: r.remark || "",
            updatedAt: Date.now()
          });
        }
      } catch (e) {
        console.warn("Failed to update flat studentAttendance locally:", e);
      }
      toast.success(isOnline ? "Présence enregistrée avec succès !" : "Présence enregistrée localement.");
    } else {
      toast.error("Erreur: " + result.error);
    }
    setLoading(false);
  };

  // Generate offline-printable attendance list PDF
  const handlePrintList = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, m = 14;
    const isOffline = batchStatus === "Local";
    const dateStr = new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    // Header bar
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, W, 4, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 4, 80, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("LISTE DE PR\u00c9SENCE", W / 2, 18, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Date : ${dateStr}  |  Classe ID : ${classId}  |  Mati\u00e8re ID : ${subjectId || "N/A"}`, W / 2, 25, { align: "center" });

    // Offline watermark
    if (isOffline) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.roundedRect(m, 29, W - 2 * m, 6, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text("Document g\u00e9n\u00e9r\u00e9 hors ligne - en attente de synchronisation", W / 2, 33, { align: "center" });
    }

    // Table
    const tableStartY = isOffline ? 40 : 34;
    const tableBody = filteredStudents.map((s, i) => {
      const r = records[s.id];
      return [
        String(i + 1),
        s.nomEtudiant,
        s.numAdmission,
        r?.status || "Pr\u00e9sent",
        r?.remark || "",
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Nom complet", "Matricule", "Statut", "Remarque"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 28 }, 3: { cellWidth: 26 } },
      margin: { left: m, right: m },
    });

    const tableBottom = (doc as any).lastAutoTable?.finalY || 100;

    // Stats summary
    const summaryY = tableBottom + 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 58, 138);
    doc.text(`Pr\u00e9sents: ${stats.Presents}  |  Absents: ${stats.Absents}  |  Retards: ${stats.Lates}  |  Excus\u00e9s: ${stats.Excused}`, m, summaryY);

    // Real QR code
    const localId = `${classId}:${subjectId || "all"}:${date}`;
    const qrPayload = `REF: ATTENDANCE-${localId} | DATE: ${date} | STATUS: ${isOffline ? "provisoire" : "officiel"}`;
    let qrBase64 = "";
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
      qrBase64 = await new Promise<string>((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.src = qrUrl;
        img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d")?.drawImage(img, 0, 0); resolve(c.toDataURL("image/png")); };
        img.onerror = () => resolve("");
      });
    } catch {}

    if (qrBase64) {
      try { doc.addImage(qrBase64, "PNG", W - m - 22, summaryY - 2, 22, 22); } catch {}
    }
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text("V\u00e9rification QR", W - m - 11, summaryY + 25, { align: "center" });

    // Footer
    const H = 297;
    doc.setFillColor(79, 70, 229);
    doc.rect(0, H - 6, W, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.save(`Presence_Classe${classId}_${date}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#131622] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white data-[state=active]:dark:bg-[#0E1017] dark:text-slate-300 data-[state=active]:dark:text-white data-[state=active]:shadow-sm px-6 py-2 flex gap-2">
              <List size={16} /> Liste
            </TabsTrigger>
            <TabsTrigger value="scanner" className="rounded-xl data-[state=active]:bg-white data-[state=active]:dark:bg-[#0E1017] dark:text-slate-300 data-[state=active]:dark:text-white data-[state=active]:shadow-sm px-6 py-2 flex gap-2">
              <Scan size={16} /> Scanner Mode
            </TabsTrigger>
            <TabsTrigger value="biometric" className="rounded-xl data-[state=active]:bg-white data-[state=active]:dark:bg-[#0E1017] data-[state=active]:shadow-sm px-6 py-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <Fingerprint size={16} /> Pointage Biométrique
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-6 pr-6 border-r border-slate-100 dark:border-slate-800">
               <div className="flex items-center space-x-2">
                <Switch id="sms-mode" checked={sendSMS} onCheckedChange={setSendSMS} />
                <Label htmlFor="sms-mode" className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                  <MessageSquare size={14} className={sendSMS ? "text-primary" : ""} /> SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="whatsapp-mode" checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
                <Label htmlFor="whatsapp-mode" className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                  <Phone size={14} className={sendWhatsApp ? "text-emerald-500" : ""} /> WhatsApp
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 px-3 py-1">
                Présents: {stats.Presents}
              </Badge>
              <Badge variant="outline" className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 px-3 py-1">
                Absents: {stats.Absents}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 px-3 py-1">
                Retards: {stats.Lates}
              </Badge>
            </div>
          </div>
        </div>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <Input
                placeholder="Rechercher un élève..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={markAllPresent} 
                disabled={!canEdit}
                className="rounded-xl font-bold bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:hover:bg-slate-800 h-11 flex-1 md:flex-none disabled:opacity-50"
              >
                ✅ Tout Présent
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintList}
                className="rounded-xl font-bold bg-white dark:bg-slate-900 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-11 flex-1 md:flex-none flex items-center gap-2 border-indigo-200"
              >
                <Printer size={16} /> Imprimer
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !canEdit} 
                className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-lg flex-1 md:flex-none items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Chargement..." : <><Save size={18} /> Enregistrer</>}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622] rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Matricule</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Élève</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-center">Présence</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-8 py-5">
                        <span className="font-mono font-bold text-primary bg-primary/5 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1 rounded-lg">
                          {s.numAdmission || "-"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-white">{s.nomEtudiant}</p>
                          <AttendanceStatusBadge status={batchStatus} />
                          {records[s.id].remark?.includes("Empreinte") && (
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                              <Fingerprint size={11} /> Empreinte Validée
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100/50 dark:bg-slate-900/80 p-1.5 rounded-2xl w-fit mx-auto border border-slate-100 dark:border-slate-800 flex-wrap">
                          {[
                            { val: "Présent", label: "Présent", icon: Check, color: "bg-emerald-500", text: "text-emerald-500" },
                            { val: "Absent", label: "Absent", icon: X, color: "bg-rose-500", text: "text-rose-500" },
                            { val: "En Retard", label: "Retard", icon: Clock, color: "bg-amber-500", text: "text-amber-500" },
                            { val: "Excusé", label: "Excusé", icon: Info, color: "bg-blue-500", text: "text-blue-500" },
                            { val: "Empreinte", label: "Empreinte", icon: Fingerprint, color: "bg-indigo-600", text: "text-indigo-600" },
                          ].map((opt) => {
                            const isSelected = opt.val === "Empreinte"
                              ? records[s.id].remark?.includes("Empreinte")
                              : records[s.id].status === opt.val && !records[s.id].remark?.includes("Empreinte");

                            return (
                              <button
                                key={opt.val}
                                onClick={() => {
                                  if (!canEdit) return;
                                  if (opt.val === "Empreinte") {
                                    updateStatus(s.id, "Présent");
                                    updateRemark(s.id, "Vérifié par empreinte digitale");
                                    toast.success(`Empreinte validée : ${s.nomEtudiant}`, {
                                      icon: <Fingerprint className="text-emerald-500" size={18} />
                                    });
                                  } else {
                                    updateStatus(s.id, opt.val);
                                    if (records[s.id].remark?.includes("Empreinte")) {
                                      updateRemark(s.id, "");
                                    }
                                  }
                                }}
                                disabled={!canEdit}
                                title={opt.label}
                                className={`flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-extrabold transition-all ${
                                  isSelected
                                    ? `${opt.color} text-white shadow-md scale-105`
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800"
                                  } ${!canEdit && "cursor-not-allowed opacity-80"}`}
                              >
                                <opt.icon size={14} strokeWidth={2.5} />
                                <span className="ml-1 font-bold">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Input
                          placeholder="..."
                          value={records[s.id].remark}
                          disabled={!canEdit}
                          onChange={(e) => updateRemark(s.id, e.target.value)}
                          className="rounded-xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 h-10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-primary/20 disabled:bg-slate-50 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:dark:text-slate-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length === 0 && (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                Aucun élève trouvé pour cette recherche.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scanner">
          <AttendanceScanner 
            classId={classId} 
            subjectId={subjectId} 
            employeeId={employeeId} 
          />
        </TabsContent>

        <TabsContent value="biometric">
          <BiometricScanner
            students={students}
            onMarkPresent={(studentId, remark) => {
              updateStatus(studentId, "Présent");
              if (remark) updateRemark(studentId, remark);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
