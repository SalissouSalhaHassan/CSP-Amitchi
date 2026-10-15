import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { MessagingService } from "@/shared/services/messaging.service";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      type,
      studentId,
      phone,
      studentName,
      amountPaid,
      receiptNumber,
      remainingBalance,
      status, // "Absent" | "En Retard"
      periodName,
      generalAverage,
      rank,
      customMessage,
    } = body;

    let targetPhone = phone;
    let targetName = studentName;

    // Resolve student info if ID is provided
    if (studentId && (!targetPhone || !targetName)) {
      const std = await readDb.query.students.findFirst({
        where: eq(students.id, Number(studentId)),
        columns: { nomEtudiant: true, whatsapp: true, mobile: true, phoneFixe: true },
      });
      if (std) {
        targetName = targetName || std.nomEtudiant;
        targetPhone = targetPhone || std.whatsapp || std.mobile || std.phoneFixe || "";
      }
    }

    if (!targetPhone) {
      return mobileJsonError("Numéro de téléphone / WhatsApp introuvable.", 400);
    }

    let success = false;
    let formattedText = "";
    const schoolName = "Edut Pro";

    switch (type) {
      case "payment_receipt": {
        const amountFmt = Math.round(Number(amountPaid) || 0).toLocaleString("fr-FR");
        const balFmt = Math.round(Number(remainingBalance) || 0).toLocaleString("fr-FR");
        const recNo = receiptNumber ? ` (Reçu N° ${receiptNumber})` : "";
        formattedText = `✅ *Confirmation de Paiement - ${schoolName}*\n\nCher Parent, nous confirmons la réception d'un paiement de *${amountFmt} CFA* pour l'élève *${targetName}*${recNo}.\n\nSolde restant : *${balFmt} CFA*.\n\nMerci pour votre confiance.`;
        
        success = await MessagingService.sendPaymentReceiptWhatsApp({
          to: targetPhone,
          studentName: targetName || "Élève",
          amountPaid: Number(amountPaid) || 0,
          receiptNumber,
          remainingBalance: Number(remainingBalance) || 0,
          schoolName,
          whatsapp: targetPhone,
        });
        break;
      }

      case "attendance_alert": {
        const attStatus = status === "En Retard" ? "En Retard" : "Absent";
        const today = new Date().toLocaleDateString("fr-FR");
        formattedText = `⚠️ *Alerte Présence - ${schoolName}*\n\nCher Parent, nous vous informons que *${targetName}* a été marqué(e) *${attStatus.toUpperCase()}* le ${today}.\n\nMerci de contacter l'établissement pour justifier cette absence.`;

        await MessagingService.sendAttendanceAlert({
          to: targetPhone,
          studentName: targetName || "Élève",
          status: attStatus,
          date: today,
          whatsapp: targetPhone,
          sendWhatsApp: true,
          sendSMS: false,
        });
        success = true;
        break;
      }

      case "bulletin_ready": {
        const pName = periodName || "Trimestre en cours";
        const avgText = generalAverage !== undefined ? `\nMoyenne générale : *${Number(generalAverage).toFixed(2)}/20*` : "";
        const rankText = rank ? ` (Rang : *${rank}*)` : "";
        formattedText = `🎓 *Publication du Bulletin - ${schoolName}*\n\nCher Parent, le bulletin de notes de *${targetName}* pour la période *${pName}* est disponible.${avgText}${rankText}\n\nConsultez-le dès maintenant sur l'application Edut Pro.`;

        success = await MessagingService.sendBulletinPublishedWhatsApp({
          to: targetPhone,
          studentName: targetName || "Élève",
          periodName: pName,
          generalAverage: generalAverage !== undefined ? Number(generalAverage) : undefined,
          rank,
          schoolName,
          whatsapp: targetPhone,
        });
        break;
      }

      default: {
        formattedText = customMessage || `Bonjour, message de l'école ${schoolName} concernant l'élève ${targetName}.`;
        success = await MessagingService.sendViaWhatsAppAPI(targetPhone, formattedText);
        break;
      }
    }

    const directShareUrl = MessagingService.generateWhatsAppShareUrl(targetPhone, formattedText);

    return NextResponse.json({
      success: true,
      apiSent: success,
      directShareUrl,
      formattedMessage: formattedText,
      targetPhone,
    });
  } catch (error: any) {
    console.error("[WhatsApp Route Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors du traitement WhatsApp", 500);
  }
}
