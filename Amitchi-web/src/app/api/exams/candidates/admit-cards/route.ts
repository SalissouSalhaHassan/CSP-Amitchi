import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

export const dynamic = "force-dynamic";

async function generateQrDataUrl(data: string): Promise<string> {
  try {
    const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`);
    const buffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  } catch (_) {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=";
  }
}

function ensureAmiriRegistered(doc: jsPDF) {
  try {
    const fontList = doc.getFontList();
    if (!fontList["Amiri"]) {
      if (amiriFontBase64) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      }
    }
  } catch (e) {
    console.warn("Failed to check or register Amiri font:", e);
  }
}

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    try {
      const reshaped = reshapeArabicText(text);
      const activeFont = doc.getFont();
      const activeStyle = activeFont.fontStyle;
      const activeName = activeFont.fontName;
      
      doc.setFont("Amiri", "normal");
      doc.text(reshaped, x, y, options);
      doc.setFont(activeName, activeStyle);
    } catch (e: any) {
      console.warn("Error rendering Arabic text with Amiri font:", e);
      doc.text(text, x, y, options);
    }
  } else {
    doc.text(text, x, y, options);
  }
}

function drawCell(doc: jsPDF, text: string, x: number, y: number, w: number, h: number, align: "left" | "center" | "right" = "left", border = true) {
  if (border) {
    doc.rect(x, y, w, h);
  }
  let textX = x + 2;
  if (align === "center") {
    const textWidth = doc.getTextWidth(text);
    textX = x + (w - textWidth) / 2;
  } else if (align === "right") {
    const textWidth = doc.getTextWidth(text);
    textX = x + w - textWidth - 2;
  }
  const textY = y + h - 2; // baseline positioning for jsPDF text
  drawTextBilingual(doc, text, textX, textY);
}

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, class_id, school_name } = await request.json();

    if (!campaign_id || !class_id) {
      return NextResponse.json({ error: "campaign_id et class_id requis." }, { status: 400 });
    }

    const campaignId = parseInt(campaign_id);
    const classId = parseInt(class_id);
    const finalSchoolName = school_name || "ÉCOLE PRIVÉE";

    // 1. Fetch authorized candidates
    const candRes = await db.execute(sql`
      SELECT 
        ec.id,
        ec.student_id,
        ec.roll_number,
        s.nom_etudiant,
        c.class_name
      FROM exam_candidates ec
      JOIN students s ON ec.student_id = s.id
      JOIN school_classes c ON ec.class_id = c.id
      WHERE ec.campaign_id = ${campaignId} 
        AND ec.class_id = ${classId}
        AND (ec.is_financially_cleared = true OR ec.is_manually_authorized = true)
      ORDER BY s.nom_etudiant ASC
    `);
    const candidates = (Array.isArray(candRes) ? candRes : (candRes as any).rows || []) as any[];
    if (candidates.length === 0) {
      return NextResponse.json({ 
        error: "Aucun candidat autorisé (Tous bloqués ou liste vide)." 
      }, { status: 400 });
    }

    // 2. Fetch timetables
    const ttRes = await db.execute(sql`
      SELECT 
        t.id,
        t.exam_date,
        t.start_time,
        t.end_time,
        s.subject_name
      FROM exam_timetables t
      JOIN school_subjects s ON t.subject_id = s.id
      WHERE t.campaign_id = ${campaignId} 
        AND t.class_id = ${classId}
      ORDER BY t.exam_date ASC, t.start_time ASC
    `);
    const timetables = (Array.isArray(ttRes) ? ttRes : (ttRes as any).rows || []) as any[];

    // 3. Fetch campaign name
    const campRes = await db.execute(sql`
      SELECT name FROM exam_campaigns WHERE id = ${campaignId} LIMIT 1
    `);
    const campRows = (Array.isArray(campRes) ? campRes : (campRes as any).rows || []) as any[];
    const campaignName = campRows[0]?.name || "Session";

    // 4. Generate PDF
    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4"
    });
    ensureAmiriRegistered(doc);

    const cardsPerPage = 2;
    const cardHeight = 135;

    for (let idx = 0; idx < candidates.length; idx++) {
      const cand = candidates[idx];

      if (idx > 0 && idx % cardsPerPage === 0) {
        doc.addPage();
      }

      const yStart = 10 + (idx % cardsPerPage) * 145;

      // Card border
      doc.setDrawColor(0);
      doc.rect(10, yStart, 190, cardHeight);

      // Header School Name
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      const schoolTitle = finalSchoolName;
      const schoolWidth = doc.getTextWidth(schoolTitle);
      drawTextBilingual(doc, schoolTitle, 10 + (190 - schoolWidth) / 2, yStart + 8);

      // Subheader
      doc.setFontSize(11);
      doc.text("CONVOCATION AUX EXAMENS / ADMIT CARD", 10 + (190 - doc.getTextWidth("CONVOCATION AUX EXAMENS / ADMIT CARD")) / 2, yStart + 15);
      doc.line(15, yStart + 18, 195, yStart + 18);

      // Student info
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      
      drawTextBilingual(doc, `Nom de l'élève : ${cand.nom_etudiant}`, 15, yStart + 24);
      drawTextBilingual(doc, `Classe : ${cand.class_name}`, 15, yStart + 31);
      drawTextBilingual(doc, `Numéro de Table : ${cand.roll_number}`, 15, yStart + 38);
      drawTextBilingual(doc, `Session : ${campaignName}`, 15, yStart + 45);

      // QR Code generation
      const qrData = `CAMP:${campaignId}|CAND:${cand.id}|STU:${cand.student_id}`;
      const qrDataUrl = await generateQrDataUrl(qrData);
      doc.addImage(qrDataUrl, "PNG", 160, yStart + 20, 30, 30);

      // Exam table header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      drawCell(doc, "Matière", 15, yStart + 56, 50, 6, "center");
      drawCell(doc, "Date", 65, yStart + 56, 40, 6, "center");
      drawCell(doc, "Horaire", 105, yStart + 56, 40, 6, "center");
      drawCell(doc, "Signature Surv.", 145, yStart + 56, 40, 6, "center");

      // Exam table rows
      doc.setFont("Helvetica", "normal");
      let rowY = yStart + 62;
      for (const tt of timetables) {
        const formatDate = (dateVal: any) => {
          if (!dateVal) return "";
          const d = new Date(dateVal);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const dateStr = formatDate(tt.exam_date);
        const timeStr = `${tt.start_time} - ${tt.end_time}`;
        
        drawCell(doc, tt.subject_name.substring(0, 25), 15, rowY, 50, 6, "left");
        drawCell(doc, dateStr, 65, rowY, 40, 6, "center");
        drawCell(doc, timeStr, 105, rowY, 40, 6, "center");
        drawCell(doc, "", 145, rowY, 40, 6, "center");
        
        rowY += 6;
      }

      // Footnote
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.text(
        "N.B : La présentation de cette carte et la vérification du QR Code sont obligatoires pour l'accès à la salle d'examen.",
        15,
        yStart + cardHeight - 5
      );
    }

    const pdfBuffer = doc.output("arraybuffer");
    const base64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      status: "success",
      pdf_base64: base64
    });
  } catch (error: any) {
    console.error("Error generating admit cards PDF:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
