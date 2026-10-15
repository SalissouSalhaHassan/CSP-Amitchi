import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      type,
      recipientPhone,
      recipientName,
      studentName,
      className,
      date,
      subjectName,
      amount,
      receiptNumber,
      message,
      language = "FR",
      averageScore,
      rank,
      busStop,
      etaMinutes,
      busNumber,
      driverPhone,
    } = body;

    if (!recipientPhone || !recipientPhone.trim()) {
      return mobileJsonError("Numéro de téléphone WhatsApp requis.", 400);
    }

    // Clean phone number (format for Niger/West Africa or international)
    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length === 8) {
      cleanPhone = `227${cleanPhone}`; // Niger prefix fallback
    }

    let generatedText = "";

    switch (type) {
      case "absence":
        if (language === "AR") {
          generatedText = `*مجمع إيدوت المدرسي* 🏫\n\nالسلام عليكم ولي أمر الطالب (*${recipientName || "ولي الأمر"}*),\nنحيطكم علماً بأن الطالب *${studentName || "الموقر"}* (الفصل: ${className || "N/A"}) قد سُجّل *غائباً* بتاريخ *${date || new Date().toLocaleDateString("fr-FR")}* في مادة *${subjectName || "الحصة المحددة"}*.\n\n_لتبرير الغياب، يرجى استخدام تطبيق الجوال أو التواصل مع إدارة شؤون الطلاب._`;
        } else if (language === "HA") {
          generatedText = `*SANARWA DAGA MAKARANTAR EDUT* 🏫\n\nBarka, ya mai girma (*${recipientName || "Waliyyi"}*),\nMuna sanar da ku cewa dalibi *${studentName || ""}* (${className || ""}) bai halarci ajin *${subjectName || "darasi"}* ba a yau *${date || new Date().toLocaleDateString("fr-FR")}*.\n\n_Don neman karin bayani ko bada uzuri, a duba manhajar Edut ko a tuntubi makaranta._`;
        } else {
          generatedText = `*ÉTABLISSEMENT SCOLAIRE EDUT* 🏫\n\nCher parent (*${recipientName || "Parent d'élève"}*),\nNous vous informons que votre enfant *${studentName || "l'élève"}* (Classe: ${className || "N/A"}) a été marqué(e) *ABSENT(E)* le *${date || new Date().toLocaleDateString("fr-FR")}* lors du cours de *${subjectName || "la séance"}*.\n\n_Pour toute justification, veuillez vous connecter sur l'application mobile Edut ou contacter la vie scolaire._`;
        }
        break;

      case "receipt":
        generatedText = `*CONFIRMATION DE PAIEMENT EDUT* 💳\n\nBonjour *${recipientName || "Parent"}*,\nNous accusons réception du règlement de scolarité d'un montant de *${amount || "0"} FCFA* pour l'élève *${studentName || ""}*.\nReçu N° : *${receiptNumber || "REC-" + Date.now()}*\nDate : ${date || new Date().toLocaleDateString("fr-FR")}\n\n_Le reçu officiel certifié PDF est téléchargeable sur votre application Edut._`;
        break;

      case "bulletin":
      case "grade_alert":
        if (language === "AR") {
          generatedText = `*نتائج وكشف الدرجات - مجمع إيدوت المدرسي* 📊\n\nالسلام عليكم ولي أمر الطالب (*${recipientName || "ولي الأمر"}*),\nيسرنا إعلامكم بأن كشف درجات الطالب *${studentName || ""}* (الفصل: ${className || ""}) أصبح متاحاً الآن.\n- المعدل الفصلي: *${averageScore ? averageScore + "/20" : "متوفر"}*\n${rank ? "- الترتيب: *" + rank + "*\n" : ""}${body.pdfUrl ? "📄 تحميل الكشف الرسمي: " + body.pdfUrl + "\n" : ""}\nيمكنكم الاطلاع والتحميل المباشر للتقرير الأكاديمي عبر تطبيق Edut Mobile.\n\n_نهنئكم ونتمنى لأبنائنا دوام التوفيق والنجاح._`;
        } else {
          generatedText = `*BULLETIN DE NOTES DISPONIBLE* 📊\n\nBonjour *${recipientName || "Parent"}*,\nLe bulletin scolaire de *${studentName || "votre enfant"}* (${className || ""}) est désormais disponible.\n${averageScore ? "Moyenne Générale : *" + averageScore + "/20*\n" : ""}${rank ? "Rang : *" + rank + "*\n" : ""}${body.pdfUrl ? "📄 Télécharger le bulletin officiel :\n" + body.pdfUrl + "\n" : ""}\n_Connectez-vous sur votre application Edut pour consulter l'analyse détaillée._`;
        }
        break;

      case "bus_arrival":
      case "bus_boarding":
        if (type === "bus_boarding") {
          generatedText = `*TRANSPORT SCOLAIRE EDUT - EMBARQUEMENT* 🚌\n\nBonjour *${recipientName || "Parent"}*,\nVotre enfant *${studentName || ""}* vient de monter à bord du bus scolaire *${busNumber || "Edut Express"}* à *${busStop || "l'arrêt prévu"}*.\n\n_Le trajet en direct est visible sur votre carte GPS dans l'application Edut._`;
        } else {
          generatedText = `*ALERTE BUS SCOLAIRE - ARRIVÉE IMMINENTE* 🚏\n\nBonjour *${recipientName || "Parent"}*,\nLe bus scolaire *${busNumber || "Edut"}* approche de votre arrêt *${busStop || "Plateau"}*.\nTemps estimé : *${etaMinutes || "5"} minutes*.\n\n_Merci de vous préparer pour accueillir l'élève. Contact chauffeur : ${driverPhone || "+22796123456"}._`;
        }
        break;

      case "gate_entry":
      case "gate_exit":
        const isEntry = type === "gate_entry";
        const timeStr = body.time || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        if (language === "AR") {
          generatedText = `*تنبيه أمني - مجمع إيدوت المدرسي* 🛡️\n\nالسلام عليكم ولي أمر الطالب (*${recipientName || "ولي الأمر"}*),\nنحيطكم علماً بأن الطالب *${studentName || ""}* (${className || ""}) قد سُجّل *${isEntry ? "دخوله إلى المدرسة" : "خروجه من المدرسة"}* في تمام الساعة *${timeStr}* عبر البوابة الرئيسية.\n\n_يمكنكم متابعة سجلات الحضور والأمان عبر تطبيق Edut Mobile._`;
        } else if (language === "HA") {
          generatedText = `*TSARON MAKARANTA - EDUT SECURITY* 🛡️\n\nBarka, ya mai girma (*${recipientName || "Waliyyi"}*),\nMuna sanar da ku cewa dalibi *${studentName || ""}* (${className || ""}) ya *${isEntry ? "shiga makaranta" : "fita daga makaranta"}* da misalin karfe *${timeStr}* ta babban kofa.\n\n_Ana iya duba rahoton tsaro a manhajar Edut Mobile._`;
        } else {
          generatedText = `*SÉCURITÉ CAMPUS - CONTRÔLE D'ACCÈS* 🛡️\n\nBonjour *${recipientName || "Parent"}*,\nNous vous informons que votre enfant *${studentName || "l'élève"}* (${className || ""}) a franchi le portail de l'établissement (*${isEntry ? "Entrée" : "Sortie"}*) à *${timeStr}*.\n\n_Retrouvez l'historique complet des passages sur votre application Edut Mobile._`;
        }
        break;

      case "fee_reminder":
        if (language === "HA") {
          generatedText = `*SANARWA DAGA MAKARANTAR EDUT* 🏫\n\nBarka, ya mai girma (*${recipientName || "Waliyyi"}*),\nMuna tunatar da ku cewa akwai sauran kudin makaranta na *${amount || "0"} FCFA* na dalibi *${studentName || ""}* (${className || ""}).\nKwanan wata na karshe: *${date || "Karshen wannan wata"}*.\n\nKuna iya biya cikin sauki ta *Airtel Money (*155#)* ko *Al-Izza (*800#)* ta manhajar Edut Mobile.\nMungode da hadin kai!`;
        } else if (language === "AR") {
          generatedText = `*إشعار تذكيري من مجمع إيدوت المدرسي* 🏫\n\nالسلام عليكم ولي أمر الطالب الكريم (*${recipientName || "ولي الأمر"}*),\nنود تذكيركم بموعد سداد القسط المدرسي المتبقي وقدره *${amount || "0"} FCFA* للطالب *${studentName || ""}* (${className || ""}).\nتاريخ الاستحقاق: *${date || "نهاية الشهر الحالي"}*.\n\nيمكنكم السداد المباشر عبر *Airtel Money* (*155#) أو *Al-Izza* (*800#) أو من خلال تطبيق الجوال.\nنشكركم على حسن تعاونكم وثقتكم بنا.`;
        } else {
          generatedText = `*RAPPEL ÉCHÉANCE SCOLARITÉ EDUT* 💳\n\nBonjour cher parent (*${recipientName || "Parent d'élève"}*),\nSauf erreur de notre part, le solde de scolarité pour *${studentName || "votre enfant"}* (${className || ""}) présente un montant restant de *${amount || "0"} FCFA*.\nDate limite de règlement : *${date || "Fin de mois"}*.\n\n💡 *Règlement direct et instantané* :\n- Via *Airtel Money Niger* (*155#)\n- Via *Moov Money Flooz* (*156#)\n- Via *Al-Izza Transfert* (*800#)\n- Ou directement depuis votre application mobile Edut.\n\n_Nous vous remercions pour votre confiance et accompagnement._`;
        }
        break;

      case "administrative_notice":
      case "custom":
      default:
        generatedText = `*COMMUNIQUÉ DE L'ADMINISTRATION EDUT* 📢\n\n${message || "Information importante de la direction de l'établissement."}\n\n_Retrouvez tous les détails officiels sur votre espace mobile Edut._`;
        break;
    }

    const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(generatedText)}`;

    return NextResponse.json({
      success: true,
      data: {
        phone: cleanPhone,
        message: generatedText,
        whatsappLink: waLink,
        status: "generated",
      },
    });
  } catch (error: any) {
    console.error("[WhatsApp API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de génération WhatsApp", 500);
  }
}
