"use client";

import { useState, useRef, useMemo } from "react";
import {
  Printer,
  Download,
  FileText,
  X,
  Sparkles,
  ExternalLink,
  Award,
  DollarSign,
  Briefcase,
  Building,
  CreditCard,
  QrCode,
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import {
  type DocumentHeaderConfig,
  mergeDocumentHeaderConfig,
} from "@/domains/printing/document-header";

export type HrDocType = "payslip" | "certificate" | "payroll_summary";

interface HrDocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerConfig?: Partial<DocumentHeaderConfig> | null;
  docType?: HrDocType;
  employee?: any | null;
  salaryRecord?: any | null;
  payrollSummary?: {
    monthYear?: string;
    totalEmployees?: number;
    totalPaid?: number;
    totalUnpaid?: number;
    records?: any[];
  };
}

export default function HrDocumentPrintModal({
  isOpen,
  onClose,
  headerConfig,
  docType = "payslip",
  employee,
  salaryRecord,
  payrollSummary,
}: HrDocumentPrintModalProps) {
  const [currentDocType, setCurrentDocType] = useState<HrDocType>(docType);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const cfg = useMemo(() => mergeDocumentHeaderConfig(headerConfig), [headerConfig]);

  if (!isOpen) return null;

  const fmt = (n?: number) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: currentDocType === "payroll_summary" ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;

      const schoolName = cfg.schoolName || "ÉTABLISSEMENT SCOLAIRE";
      const country = cfg.country || "RÉPUBLIQUE DU NIGER";
      const ministry = cfg.ministry || "Ministère de l'Éducation Nationale";
      const schoolYear = cfg.schoolYear || "2024 - 2025";

      let curY = 14;

      // Header Top Strip
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(country.toUpperCase(), margin, curY);

      if (cfg.schoolCode) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Code : ${cfg.schoolCode}`, pageW - margin, curY, { align: "right" });
      }

      curY += 4.5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text(ministry, margin, curY);
      doc.setFont("helvetica", "bold");
      doc.text(`Année Scolaire : ${schoolYear}`, pageW - margin, curY, { align: "right" });

      curY += 6;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(margin, curY, pageW - margin, curY);
      curY += 2;
      doc.setLineWidth(0.3);
      doc.line(margin, curY, pageW - margin, curY);

      curY += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(schoolName.toUpperCase(), pageW / 2, curY, { align: "center" });

      if (cfg.address || cfg.phone || cfg.email) {
        curY += 4.5;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const contactInfo = [cfg.address, cfg.bp ? `BP: ${cfg.bp}` : "", cfg.phone ? `Tél: ${cfg.phone}` : "", cfg.email ? `Email: ${cfg.email}` : ""].filter(Boolean).join("  •  ");
        doc.text(contactInfo, pageW / 2, curY, { align: "center" });
      }

      curY += 8;

      // ─── PAYSILP PDF ──────────────────────────────────────────
      if (currentDocType === "payslip" && (employee || salaryRecord)) {
        const emp = employee || salaryRecord?.employee || {};
        const empName = (emp.nom || "EMPLOYÉ").toUpperCase();
        const monthYear = salaryRecord?.monthYear || "Mois en cours";

        // Title box
        doc.setFillColor(240, 245, 255);
        doc.setDrawColor(99, 102, 241);
        doc.roundedRect(pageW / 2 - 50, curY, 100, 10, 2, 2, "FD");
        doc.setTextColor(67, 56, 202);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`BULLETIN DE PAIE — ${monthYear.toUpperCase()}`, pageW / 2, curY + 6.8, { align: "center" });

        curY += 15;

        // Employee Info Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentW, 26, 2, 2, "FD");

        const empRows = [
          ["Matricule / ID :", emp.empId || `EMP-${emp.id || "001"}`, "Département :", emp.departement || "Pédagogie"],
          ["Nom complet :", empName, "Poste / Fonction :", emp.poste || emp.fonction || "Enseignant"],
          ["Banque / N° Compte :", `${emp.banqueNom || "Virement"} - ${emp.banqueCompte || "—"}`, "Statut Paie :", salaryRecord?.status === "Paid" ? "PAYÉ" : "EN ATTENTE"],
        ];

        doc.setFontSize(8);
        empRows.forEach((row, i) => {
          const rowY = curY + 6 + i * 7;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text(row[0], margin + 4, rowY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[1], margin + 35, rowY);

          doc.setTextColor(100, 116, 139);
          doc.text(row[2], margin + 95, rowY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[3], margin + 130, rowY);
        });

        curY += 32;

        // Financial Breakdown Table
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, curY, contentW, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("RUBRIQUES SALARIALES", margin + 4, curY + 5);
        doc.text("GAINS (FCFA)", margin + 95, curY + 5);
        doc.text("RETENUES (FCFA)", margin + 140, curY + 5);

        curY += 7;

        const base = salaryRecord?.basicSalary || emp.salaireBase || 0;
        const calcBase = salaryRecord?.calculatedBasic || base;
        const allow = salaryRecord?.totalAllowance || 0;
        const deduct = salaryRecord?.totalDeduction || 0;
        const net = salaryRecord?.netSalary || (calcBase + allow - deduct);

        const items = [
          ["Salaire de Base Contractuel", fmt(base), "—"],
          ["Salaire de Base Calculé (Présences)", fmt(calcBase), "—"],
          ["Primes, Heures Supp. & Indemnités", fmt(allow), "—"],
          ["Retenues (Absences, Retards, Avances)", "—", fmt(deduct)],
        ];

        doc.setFontSize(8);
        items.forEach((item, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, curY, contentW, 6.5, "F");
          }
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, curY + 6.5, margin + contentW, curY + 6.5);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(item[0], margin + 4, curY + 4.5);
          doc.text(item[1], margin + 95, curY + 4.5);
          doc.text(item[2], margin + 140, curY + 4.5);

          curY += 6.5;
        });

        curY += 5;

        // Net Payable Box
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(16, 185, 129);
        doc.roundedRect(margin, curY, contentW, 14, 2, 2, "FD");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(4, 120, 87);
        doc.text("NET À PAYER :", margin + 6, curY + 9);
        doc.setFontSize(12);
        doc.text(fmt(net), pageW - margin - 6, curY + 9.5, { align: "right" });

        curY += 24;

        // Signatures
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, curY, pageW - margin, curY);
        curY += 8;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Signature du Salarié", margin + 15, curY);
        doc.text("Pour l'Établissement / La Direction", pageW - margin - 65, curY);

        curY += 18;
        doc.setDrawColor(148, 163, 184);
        doc.line(margin + 5, curY, margin + 65, curY);
        doc.line(pageW - margin - 65, curY, pageW - margin - 5, curY);
      } else if (currentDocType === "certificate" && employee) {
        // Work Certificate
        const empName = (employee.nom || "EMPLOYÉ").toUpperCase();
        const hireDate = employee.dateEmbauche || "N/A";
        const role = employee.poste || employee.fonction || "Enseignant";

        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(99, 102, 241);
        doc.roundedRect(pageW / 2 - 60, curY, 120, 11, 2, 2, "FD");
        doc.setTextColor(67, 56, 202);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("ATTESTATION DE TRAVAIL", pageW / 2, curY + 7.5, { align: "center" });

        curY += 22;

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        const body = `Je soussigné(e), Directeur / Chef d'établissement de ${schoolName}, certifie par la présente que M./Mme ${empName}, titulaire de la pièce d'identité n° ${employee.cnic || "N/A"}, est employé(e) au sein de notre institution en qualité de : ${role}.`;
        const bodyLines = doc.splitTextToSize(body, contentW);
        doc.text(bodyLines, margin, curY);
        curY += bodyLines.length * 6 + 8;

        const body2 = `L'intéressé(e) exerce ses fonctions depuis le ${hireDate} jusqu'à ce jour, et est libre de tout engagement professionnel incompatible avec ses obligations actuelles.`;
        const body2Lines = doc.splitTextToSize(body2, contentW);
        doc.text(body2Lines, margin, curY);
        curY += body2Lines.length * 6 + 10;

        const body3 = "La présente attestation lui est délivrée sur sa demande pour servir et valoir ce que de droit.";
        doc.text(body3, margin, curY);
        curY += 25;

        // Date and place
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.text(`Fait à ${cfg.commune || "Niamey"}, le ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}`, pageW - margin - 75, curY);
        curY += 15;

        doc.setFont("helvetica", "bold");
        doc.text("Le Chef d'Établissement", pageW - margin - 60, curY);
        curY += 20;
        doc.setDrawColor(148, 163, 184);
        doc.line(pageW - margin - 65, curY, pageW - margin - 5, curY);
        curY += 4;
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Cachet officiel et signature", pageW - margin - 60, curY);
      }

      // Footer
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Document RH officiel généré avec l'En-tête de ${schoolName} · Edut Pro · ${new Date().toLocaleString("fr-FR")}`,
        pageW / 2,
        pageH - 6,
        { align: "center" }
      );

      const fileName = `${currentDocType.toUpperCase()}_HR_${(employee?.nom || "Document").replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
      toast.success("Document RH téléchargé avec succès !");
    } catch (err: any) {
      console.error("PDF error:", err);
      toast.error("Erreur lors de la génération du document.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <Printer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Centre d'Édition des Documents RH
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  En-tête lié : {cfg.style}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Documents conformes avec la charte officielle configurée dans{" "}
                <Link
                  href="/dashboard/settings/headers"
                  target="_blank"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  En-têtes Officiels & Designer <ExternalLink size={11} />
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="rounded-xl font-black text-xs bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 gap-1.5"
            >
              <Download size={15} />
              {isGeneratingPdf ? "Génération..." : "Télécharger PDF"}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="rounded-xl font-black text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
            >
              <Printer size={15} />
              Imprimer (A4)
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDocType("payslip")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                currentDocType === "payslip"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <DollarSign size={15} />
              Bulletin de Paie Officiel
            </button>
            <button
              onClick={() => setCurrentDocType("certificate")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                currentDocType === "certificate"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Award size={15} />
              Attestation de Travail
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            Format A4 Haute Résolution
          </div>
        </div>

        {/* ─── A4 PREVIEW CONTAINER ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printContainerRef}
            className="w-full max-w-[794px] min-h-[1050px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-2xl border border-slate-200/80 font-sans print:shadow-none print:border-none print:p-0 print:rounded-none print:max-w-none print:w-full"
          >
            {/* Official Header */}
            <OfficialDocumentHeader
              config={cfg}
              title={
                currentDocType === "payslip"
                  ? "BULLETIN DE PAIE"
                  : "ATTESTATION DE TRAVAIL"
              }
              variant="full"
              printDate={new Date().toLocaleDateString("fr-FR")}
              operatorName="Service des Ressources Humaines"
              qrData={
                employee
                  ? `EDUT-HR-${employee.id}-${currentDocType}`
                  : `EDUT-PAYROLL-${salaryRecord?.id || "REC"}`
              }
            />

            {/* Payslip Content */}
            {currentDocType === "payslip" && (
              <div className="mt-8 space-y-6 text-slate-800">
                {/* Employee info card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Salarié</span>
                      <span className="font-black text-sm text-slate-900 uppercase">
                        {(employee?.nom || salaryRecord?.employee?.nom || "EMPLOYÉ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Période de Paie</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        {salaryRecord?.monthYear || "Mois en cours"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Poste / Fonction</span>
                      <span className="font-bold text-slate-800">
                        {employee?.poste || employee?.fonction || "Enseignant"} • {employee?.departement || "Général"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Mode de Paiement</span>
                      <span className="font-medium text-slate-800">
                        {salaryRecord?.paymentMode || employee?.banqueNom || "Virement bancaire"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Salary rubrics table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                        <th className="p-3">Désignation</th>
                        <th className="p-3 text-right">Gains (FCFA)</th>
                        <th className="p-3 text-right">Retenues (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Salaire de Base Contractuel</td>
                        <td className="p-3 text-right font-bold">
                          {fmt(salaryRecord?.basicSalary || employee?.salaireBase || 0)}
                        </td>
                        <td className="p-3 text-right text-slate-400">—</td>
                      </tr>
                      {salaryRecord?.calculatedBasic && salaryRecord.calculatedBasic !== salaryRecord.basicSalary && (
                        <tr className="bg-slate-50/50">
                          <td className="p-3 text-slate-600">Base Ajustée (selon présence)</td>
                          <td className="p-3 text-right font-semibold">{fmt(salaryRecord.calculatedBasic)}</td>
                          <td className="p-3 text-right text-slate-400">—</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Primes, Indemnités & Heures Supp.</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          +{fmt(salaryRecord?.totalAllowance || 0)}
                        </td>
                        <td className="p-3 text-right text-slate-400">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Retenues (Absences, Avances, IUTS)</td>
                        <td className="p-3 text-right text-slate-400">—</td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          -{fmt(salaryRecord?.totalDeduction || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Payable Card */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                      Net à Payer au Salarié
                    </span>
                    <span className="text-xs font-bold text-emerald-950">
                      Montant net versé
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {fmt(
                      salaryRecord?.netSalary ||
                      ((salaryRecord?.calculatedBasic || employee?.salaireBase || 0) +
                       (salaryRecord?.totalAllowance || 0) -
                       (salaryRecord?.totalDeduction || 0))
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-black">
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Signature de l'Employé</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Date & Mention "Pour acquit"
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Pour la Direction / Le Comptable</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Cachet officiel et signature
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Work Certificate Content */}
            {currentDocType === "certificate" && employee && (
              <div className="mt-10 space-y-8 text-slate-800 text-sm leading-relaxed">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
                  <p>
                    Je soussigné(e), Chef d'établissement de{" "}
                    <strong className="text-slate-950 font-black">{cfg.schoolName}</strong>, certifie par la présente
                    que :
                  </p>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                    <p>
                      <strong>Nom & Prénom :</strong>{" "}
                      <span className="uppercase font-black">{employee.nom}</span>
                    </p>
                    <p>
                      <strong>Fonction / Poste :</strong> {employee.poste || employee.fonction || "Enseignant"}
                    </p>
                    <p>
                      <strong>Département :</strong> {employee.departement || "Pédagogique"}
                    </p>
                    <p>
                      <strong>Date de prise de service :</strong>{" "}
                      {employee.dateEmbauche || "N/A"}
                    </p>
                  </div>

                  <p>
                    Est régulièrement employé(e) au sein de notre établissement et exerce ses fonctions avec
                    dévouement et professionnalisme jusqu'à ce jour.
                  </p>

                  <p>
                    La présente attestation lui est délivrée sur sa demande pour servir et valoir ce que de droit.
                  </p>
                </div>

                <div className="pt-6 flex justify-between items-end text-xs font-black">
                  <div>
                    <span className="text-slate-400 block font-normal">Réf : HR-ATT-{employee.id}-{new Date().getFullYear()}</span>
                  </div>
                  <div className="space-y-14 text-center">
                    <p className="text-slate-900 uppercase">
                      Fait à {cfg.commune || "Niamey"}, le {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
                      <br />
                      <span className="text-slate-500 font-normal">Le Chef d'Établissement</span>
                    </p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Cachet & Signature autorisée
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
