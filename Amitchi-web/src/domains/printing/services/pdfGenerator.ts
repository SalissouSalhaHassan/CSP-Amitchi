import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PrintOptions, DocumentData } from '../types';
import { amiriFontBase64 } from '../utils/amiri-font';
import { hasArabicCharacters, reshapeArabicText } from '../utils/arabic-reshaper';

// Canvas pool for reuse to avoid memory leaks
const canvasPool: HTMLCanvasElement[] = [];
const MAX_POOL_SIZE = 5;

function getCanvas(): HTMLCanvasElement {
  return canvasPool.pop() || document.createElement('canvas');
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  if (canvasPool.length < MAX_POOL_SIZE) {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    canvasPool.push(canvas);
  }
}

export class PDFGenerator {
  private doc: jsPDF;
  private options: PrintOptions;

  constructor(options: PrintOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: options.orientation.toLowerCase() as 'p' | 'l',
      unit: 'mm',
      format: options.format === 'Ticket' ? [80, 297] : options.format.toLowerCase(),
    });
  }
    
  private ensureAmiriRegistered() {
    try {
      const fontList = this.doc.getFontList();
      if (!fontList["Amiri"]) {
        if (amiriFontBase64) {
          this.doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
          this.doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
        }
      }
    } catch (e) {
      console.warn("Failed to check or register Amiri font in PDFGenerator:", e);
    }
  }

  private drawTextBilingual(text: string, x: number, y: number, options?: any) {
    if (hasArabicCharacters(text)) {
      this.ensureAmiriRegistered();
      try {
        const reshaped = reshapeArabicText(text);
        const activeFont = this.doc.getFont();
        const activeStyle = activeFont.fontStyle;
        const activeName = activeFont.fontName;
        
        this.doc.setFont("Amiri", "normal");
        this.doc.text(reshaped, x, y, options);
        this.doc.setFont(activeName, activeStyle);
      } catch (e) {
        this.doc.text(text, x, y, options);
      }
    } else {
      this.doc.text(text, x, y, options);
    }
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, align: "left" | "right" | "center"): number {
    const isAr = hasArabicCharacters(text);
    const currentFont = this.doc.getFont();
    const currentName = currentFont.fontName;
    const currentStyle = currentFont.fontStyle;

    if (isAr) {
      this.ensureAmiriRegistered();
      const reshaped = reshapeArabicText(text);
      this.doc.setFont("Amiri", "normal");
      const lines = this.doc.splitTextToSize(reshaped, maxWidth);
      let tempY = y;
      for (const line of lines) {
        this.doc.text(line, x, tempY, { align });
        tempY += 4;
      }
      this.doc.setFont(currentName, currentStyle);
      return tempY - y;
    } else {
      const lines = this.doc.splitTextToSize(text, maxWidth);
      let tempY = y;
      for (const line of lines) {
        this.doc.text(line, x, tempY, { align });
        tempY += 4;
      }
      return tempY - y;
    }
  }

  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = getCanvas();
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        releaseCanvas(canvas);
        resolve(dataUrl);
      };
      img.onerror = (e) => {
        reject(e);
      };
      
      // Cleanup on error
      img.onload = img.onload || (() => {});
    });
  }

  private async loadTransparentImage(url: string, opacity: number = 0.08): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = getCanvas();
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0);
        }
        const dataUrl = canvas.toDataURL('image/png');
        releaseCanvas(canvas);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve("");
      };
      img.onload = img.onload || (() => {});
    });
  }

  public async generate(data: DocumentData): Promise<string> {
    const { type, payload } = data;

    switch (type) {
      case 'PaymentReceipt':
        await this.drawReceipt(payload);
        break;
      case 'StudentCard':
        await this.drawStudentCard(payload);
        break;
      case 'SchoolReport':
        await this.drawSchoolReport(payload);
        break;
      case 'Certificate':
        await this.drawCertificate(payload);
        break;
      case 'Timetable':
        await this.drawTimetable(payload);
        break;
      case 'Invoice':
        await this.drawInvoice(payload);
        break;
      default:
        console.warn(`No generator for document type: ${type}`);
    }

    if (this.options.showWatermark) {
      this.addWatermark();
    }

    return this.doc.output('dataurlstring');
  }

  private addWatermark() {
    const pageCount = this.doc.getNumberOfPages();
    const isProvisional = 
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (this.options as any).isOffline ||
      (this.options as any).isProvisoire;

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      if (isProvisional) {
        this.doc.setTextColor(252, 165, 165); // Soft red
        this.doc.setFontSize(40);
        this.doc.text('PROVISOIRE - HORS LIGNE', 105, 148, {
          align: 'center',
          angle: 45,
        });
      } else {
        this.doc.setTextColor(240, 240, 240);
        this.doc.setFontSize(60);
        this.doc.text('OFFICIEL', 105, 148, {
          align: 'center',
          angle: 45,
        });
      }
    }
  }

  private async drawOfficialHeader(school: any, title?: string): Promise<number> {
    let headerConfig: any = null;
    try {
      const { localDb } = await import('@/infrastructure/local-db/dexie');
      const record = await localDb.references
        .where('type')
        .equals('official_document_header')
        .first();
      if (record?.payload) {
        headerConfig = record.payload;
      }
    } catch {}

    const style = headerConfig?.style || "classic_dual_logo";
    const schoolName = headerConfig?.schoolName || school?.name || school?.branchName || "ÉCOLE EXCELLENCE";
    const address = headerConfig?.address || school?.address || "";
    const phone = headerConfig?.phone || school?.phone || school?.contactNo || "";
    const email = headerConfig?.email || school?.email || "";
    const schoolYear = headerConfig?.schoolYear || "2024 - 2025";
    const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
    const service = headerConfig?.service || "Service de la Scolarité";
    const bp = headerConfig?.bp || "";
    const motto = headerConfig?.motto || "";
    const registrationNo = headerConfig?.registrationNo || "";
    
    const leftLogo = headerConfig?.leftLogo || school?.logoPath;
    const rightLogo = headerConfig?.rightLogo || leftLogo;
    const centerLogo = headerConfig?.centerLogo || leftLogo;

    if (style === "modern_card") {
      this.doc.setFillColor(79, 70, 229);
      this.doc.roundedRect(10, 8, 190, 26, 2, 2, "F");
      
      if (leftLogo) {
        try {
          const base64 = await this.loadImage(leftLogo);
          this.doc.addImage(base64, 'PNG', 14, 11, 20, 20);
        } catch (e) {}
      }
      
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(13);
      this.drawWrappedText(schoolName, 38, 17, 150, "left");
      
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(220, 225, 255);
      this.drawWrappedText(`Année Scolaire: ${schoolYear}`, 38, 23, 150, "left");
      this.drawWrappedText(`${address} ${phone ? '| Tél: ' + phone : ''}`, 38, 28, 150, "left");
      
      this.doc.setTextColor(0, 0, 0);
      return 38;
    }
    
    if (style === "bilingual_center_logo") {
      if (centerLogo) {
        try {
          const base64 = await this.loadImage(centerLogo);
          this.doc.addImage(base64, 'PNG', 92, 8, 26, 26);
        } catch (e) {}
      }
      
      const leftLines = [
        headerConfig?.country || "RÉPUBLIQUE DU NIGER",
        ministry,
        headerConfig?.regionalDirection || "",
        headerConfig?.departmentalDirection || "",
        headerConfig?.inspection || "",
        schoolName,
        service,
        address,
        bp ? `BP : ${bp}` : "",
        phone ? `Tél: ${phone}` : "",
        email ? `Email: ${email}` : "",
      ].filter(Boolean);

      const rightLines = [
        headerConfig?.countryAr || "جمهورية النيجر",
        headerConfig?.ministryAr || "وزارة التربية الوطنية",
        headerConfig?.regionalDirectionAr || "",
        headerConfig?.departmentalDirectionAr || "",
        headerConfig?.inspectionAr || "",
        headerConfig?.schoolNameAr || schoolName,
        headerConfig?.serviceAr || "",
      ].filter(Boolean);

      const colWidth = centerLogo ? 78 : 92;
      
      let leftY = 12;
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(0, 0, 0);
      for (const line of leftLines) {
        const height = this.drawWrappedText(line, 10, leftY, colWidth, "left");
        leftY += height + 0.5;
      }
      
      let rightY = 12;
      for (const line of rightLines) {
        const height = this.drawWrappedText(line, 200, rightY, colWidth, "right");
        rightY += height + 0.5;
      }
      
      const maxY = Math.max(leftY, rightY);
      this.doc.setLineWidth(0.5);
      this.doc.line(10, maxY + 2, 200, maxY + 2);
      if (title) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(14);
        this.drawWrappedText(title.toUpperCase(), 105, maxY + 14, 180, "center");
        return maxY + 20;
      }
      return maxY + 4;
    }
    
    if (style === "university_formal") {
      if (leftLogo) {
        try {
          const base64 = await this.loadImage(leftLogo);
          this.doc.addImage(base64, 'PNG', 10, 8, 22, 22);
        } catch (e) {}
      }
      if (rightLogo) {
        try {
          const base64 = await this.loadImage(rightLogo);
          this.doc.addImage(base64, 'PNG', 178, 8, 22, 22);
        } catch (e) {}
      }
      
      const centerLines = [
        headerConfig?.country || "REPUBLIQUE DU NIGER",
        schoolName,
        service,
        [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
        email ? `Email : ${email}` : "",
        registrationNo ? `Agrément N°: ${registrationNo}` : "",
      ].filter(Boolean);

      let centerY = 12;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(10);
      const height0 = this.drawWrappedText(centerLines[0].toUpperCase(), 105, centerY, 140, "center");
      centerY += height0 + 1;
      
      this.doc.setFontSize(12);
      const height1 = this.drawWrappedText(centerLines[1], 105, centerY, 140, "center");
      centerY += height1 + 1;

      this.doc.setFontSize(8.5);
      this.doc.setFont("helvetica", "normal");
      for (let i = 2; i < centerLines.length; i++) {
        const height = this.drawWrappedText(centerLines[i], 105, centerY, 140, "center");
        centerY += height + 0.5;
      }
      
      const finalY = Math.max(centerY + 3, 32);
      this.doc.setLineWidth(0.5);
      this.doc.line(10, finalY, 200, finalY);
      if (title) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(14);
        this.drawWrappedText(title.toUpperCase(), 105, finalY + 12, 180, "center");
        return finalY + 18;
      }
      return finalY + 2;
    }
    
    if (style === "minimal_administrative") {
      if (centerLogo || leftLogo) {
        try {
          const base64 = await this.loadImage(centerLogo || leftLogo);
          this.doc.addImage(base64, 'PNG', 175, 8, 22, 22);
        } catch (e) {}
      }
      
      const leftLines = [
        schoolName,
        headerConfig?.country || "RÉPUBLIQUE DU NIGER",
        ministry,
        headerConfig?.regionalDirection || "",
        headerConfig?.inspection || "",
        [address, phone && `Tél: ${phone}`].filter(Boolean).join(" | "),
        email ? `Email: ${email}` : "",
      ].filter(Boolean);

      let leftY = 12;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(12);
      const height0 = this.drawWrappedText(leftLines[0], 10, leftY, 155, "left");
      leftY += height0 + 1;

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      for (let i = 1; i < leftLines.length; i++) {
        const height = this.drawWrappedText(leftLines[i], 10, leftY, 155, "left");
        leftY += height + 0.5;
      }
      
      const finalY = Math.max(leftY + 3, 32);
      this.doc.setLineWidth(0.3);
      this.doc.line(10, finalY, 200, finalY);
      if (title) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(14);
        this.drawWrappedText(title.toUpperCase(), 105, finalY + 12, 180, "center");
        return finalY + 18;
      }
      return finalY + 2;
    }
    
    // Classic dual logo style (default)
    if (leftLogo) {
      try {
        const base64 = await this.loadImage(leftLogo);
        this.doc.addImage(base64, 'PNG', 10, 8, 22, 22);
      } catch (e) {}
    }
    if (rightLogo && rightLogo !== leftLogo) {
      try {
        const base64 = await this.loadImage(rightLogo);
        this.doc.addImage(base64, 'PNG', 178, 8, 22, 22);
      } catch (e) {}
    }
    
    const centerLines = [
      schoolName,
      motto ? `"${motto}"` : "",
      `Année Scolaire: ${schoolYear}`,
      [phone && `Tél: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" | "),
      address ? `Adresse: ${address}` : "",
    ].filter(Boolean);

    let centerY = 12;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    const height0 = this.drawWrappedText(centerLines[0], 105, centerY, 140, "center");
    centerY += height0 + 1;

    this.doc.setFontSize(8.5);
    this.doc.setFont("helvetica", "normal");
    for (let i = 1; i < centerLines.length; i++) {
      if (i === 1 && motto) {
        this.doc.setFont("helvetica", "italic");
        const height = this.drawWrappedText(centerLines[i], 105, centerY, 140, "center");
        centerY += height + 0.5;
        this.doc.setFont("helvetica", "normal");
      } else {
        const height = this.drawWrappedText(centerLines[i], 105, centerY, 140, "center");
        centerY += height + 0.5;
      }
    }
    
    const finalY = Math.max(centerY + 3, 32);
    this.doc.setLineWidth(0.5);
    this.doc.line(10, finalY, 200, finalY);
    if (title) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(14);
      this.drawWrappedText(title.toUpperCase(), 105, finalY + 12, 180, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }

  private async drawReceipt(payload: any) {
    const { school, payment, student } = payload;
    const startY = await this.drawOfficialHeader(school, 'REÇU DE PAIEMENT');
    
    // Draw School Logo Watermark in background
    if (school.logoPath) {
      try {
        const logoWatermark = await this.loadTransparentImage(school.logoPath, 0.06);
        if (logoWatermark) {
          this.doc.addImage(logoWatermark, 'PNG', 55, 60, 100, 100);
        }
      } catch (e) {
        console.warn("Failed to load logo watermark for receipt:", e);
      }
    }

    // Draw QR Code
    try {
      const qrData = `RECU: ${payment.reference} | ELEVE: ${student.name} | CLASSE: ${student.class} | MONTANT: ${payment.amount} F CFA | DATE: ${payment.date}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      const qrBase64 = await this.loadImage(qrUrl);
      this.doc.addImage(qrBase64, 'PNG', 170, startY - 12, 22, 22);
    } catch (e) {
      console.warn("Failed to load QR code for PaymentReceipt:", e);
    }
    
    this.doc.setFontSize(11);
    this.doc.text(`Référence: ${payment.reference}`, 20, startY + 8);
    this.doc.text(`Date: ${payment.date}`, 150, startY + 8);
    
    this.doc.text(`Étudiant: ${student.name}`, 20, startY + 18);
    this.doc.text(`Classe: ${student.class}`, 20, startY + 24);
    
    // Table
    (this.doc as any).autoTable({
      startY: startY + 32,
      head: [['Description', 'Montant']],
      body: [
        [payment.description || 'Frais de scolarité', `${payment.amount} F CFA`],
        ['Réduction', `${payment.reduction || 0} F CFA`],
        ['Total Payé', `${payment.amount - (payment.reduction || 0)} F CFA`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    });
  }

  private async drawStudentCard(payload: any) {
    const { student, school, primaryColor = '#1e3a8a' } = payload;
    const W = 54;
    const H = 86;
    const x = 78; // Center on A4 for single card
    const y = 20;

    // Background & Border
    this.doc.setDrawColor(primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.rect(x, y, W, H);
    
    // Header
    this.doc.setFillColor(primaryColor);
    this.doc.rect(x, y, W, 14, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(school.name.toUpperCase(), x + W / 2, y + 8, { align: 'center', maxWidth: W - 10 });
    
    // Photo Placeholder
    const phW = 22;
    const phH = 26;
    const px = x + (W - phW) / 2;
    const py = y + 18;
    this.doc.setDrawColor(200);
    this.doc.rect(px, py, phW, phH);
    this.doc.setFontSize(6);
    this.doc.setTextColor(200);
    this.doc.text('PHOTO', px + phW / 2, py + phH / 2, { align: 'center' });
    
    // Student Info
    this.doc.setTextColor(0);
    this.doc.setFontSize(10);
    this.doc.text(student.name.toUpperCase(), x + W / 2, py + phH + 6, { align: 'center' });
    
    this.doc.setDrawColor(primaryColor);
    this.doc.line(x + 5, py + phH + 8, x + W - 5, py + phH + 8);
    
    this.doc.setFontSize(7);
    this.doc.text(`ID: ${student.id}`, x + 5, py + phH + 14);
    this.doc.text(`CLASSE: ${student.class}`, x + 5, py + phH + 19);

    // Draw QR Code
    try {
      const qrData = student.numAdmission || student.id || "";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      const qrBase64 = await this.loadImage(qrUrl);
      this.doc.addImage(qrBase64, 'PNG', x + W - 17, py + phH + 10, 12, 12);
    } catch (e) {
      console.warn("Failed to load QR code for StudentCard:", e);
    }
    
    // Footer
    this.doc.setFillColor(primaryColor);
    this.doc.rect(x, y + H - 8, W, 8, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(`ANNÉE: ${payload.year || '2024-2025'}`, x + W / 2, y + H - 3, { align: 'center' });
  }

  private async drawSchoolReport(payload: any) {
    const { student, school, results, stats } = payload;
    const startY = await this.drawOfficialHeader(school, `BULLETIN DE NOTES - ${payload.term?.toUpperCase() || 'TRIMESTRE'}`);
    
    // Student Info Box
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`NOM: ${student.name}`, 15, startY + 8);
    this.doc.text(`CLASSE: ${student.class}`, 150, startY + 8);
    
    // Results Table
    (this.doc as any).autoTable({
      startY: startY + 16,
      head: [['DISCIPLINES', 'MOY/20', 'COEF', 'MOY x COEF', 'RANG', 'APPRÉCIATION']],
      body: results.map((r: any) => [
        r.subject,
        r.moy,
        r.coef,
        (r.moy * r.coef).toFixed(2),
        r.rank,
        r.appreciation
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    
    const finalY = (this.doc as any).lastAutoTable.finalY;
    
    // Stats Summary
    this.doc.setFontSize(10);
    this.doc.rect(15, finalY + 10, 180, 20);
    this.doc.text(`MOYENNE GÉNÉRALE: ${stats.average}/20`, 20, finalY + 18);
    this.doc.text(`RANG: ${stats.rank} sur ${stats.total}`, 100, finalY + 18);
    this.doc.text(`DÉCISION: ${stats.decision}`, 20, finalY + 25);
  }

  private async drawCertificate(payload: any) {
    const { student, school, certificateText, date = new Date().toLocaleDateString() } = payload;
    const startY = await this.drawOfficialHeader(school, "ATTESTATION DE SCOLARITÉ");

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const textWidth = 170;
    const splitText = this.doc.splitTextToSize(
      certificateText || `Nous soussignés, attestons par la présente que l'élève ${student.name} est inscrit(e) au sein de notre établissement pour l'année scolaire.`,
      textWidth
    );
    
    this.doc.text(splitText, 20, startY + 20);

    // Signature Area
    const sigY = startY + 80;
    this.doc.text(`Fait le : ${date}`, 130, sigY);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text("Le Directeur", 130, sigY + 10);
    this.doc.line(130, sigY + 12, 170, sigY + 12);
  }

  private async drawTimetable(payload: any) {
    const { school, targetName, days = [], slots = [], schedule = {} } = payload;
    const startY = await this.drawOfficialHeader(school, `EMPLOI DU TEMPS - ${targetName}`);

    // Generate table format for autoTable
    const headers = ['Heures', ...days];
    const body = slots.map((slot: string) => {
      const row = [slot];
      days.forEach((day: string) => {
        const item = schedule[day]?.[slot] || '';
        row.push(item);
      });
      return row;
    });

    (this.doc as any).autoTable({
      startY: startY + 12,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8 },
    });
  }

  private async drawInvoice(payload: any) {
    const { school, invoiceNumber, clientName, items = [], total, date = new Date().toLocaleDateString() } = payload;
    const startY = await this.drawOfficialHeader(school, `FACTURE N° ${invoiceNumber}`);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Client: ${clientName}`, 20, startY + 8);
    this.doc.text(`Date d'émission: ${date}`, 140, startY + 8);

    (this.doc as any).autoTable({
      startY: startY + 16,
      head: [['Désignation', 'Quantité', 'Prix Unitaire', 'Total']],
      body: items.map((i: any) => [
        i.designation,
        i.quantity,
        `${i.unitPrice} F CFA`,
        `${i.quantity * i.unitPrice} F CFA`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    });

    const finalY = (this.doc as any).lastAutoTable.finalY;
    this.doc.setFontSize(11);
    this.doc.text(`NET À PAYER: ${total} F CFA`, 140, finalY + 15);
  }
}