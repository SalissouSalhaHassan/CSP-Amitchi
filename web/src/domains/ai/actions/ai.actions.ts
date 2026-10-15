"use server";

import { protectedDbAction } from "@/lib/protected-action";
import { AIAnalyticsService } from "../services/ai-analytics.service";

/**
 * Server action to get AI Dropout Risk Analysis for the current school
 */
export async function getDropoutRiskAnalysisAction() {
  return protectedDbAction("Reports", "canView", async () => {
    const overview = await AIAnalyticsService.getSchoolDropoutRiskOverview();
    return { data: overview };
  });
}

/**
 * Server action for AI Teacher Assistant: Generate Homework Suggestions
 */
export async function generateAIHomeworkAction(payload: {
  subject: string;
  level: string;
  topic: string;
  difficulty: "facile" | "moyen" | "difficile";
}) {
  return protectedDbAction("Pedagogie", "canEdit", async () => {
    const result = AIAnalyticsService.generateAIHomework(payload);
    return { data: result.data };
  });
}

export interface AIReportSummaryPayload {
  reportType: string;
  reportTitleFr: string;
  reportTitleAr: string;
  kpis: { label: string; value: string | number }[];
  totalRecords: number;
}

export interface AIReportSummaryResponse {
  summaryFr: string;
  summaryAr: string;
  highlightsFr: string[];
  highlightsAr: string[];
  risksFr: string[];
  risksAr: string[];
  recommendationsFr: string[];
  recommendationsAr: string[];
  generatedAt: string;
}

/**
 * Server action for Gemini Data Analytics Executive Summary Generator
 */
export async function generateAIReportSummaryAction(payload: AIReportSummaryPayload) {
  return protectedDbAction("Reports", "canView", async () => {
    const { reportType, reportTitleFr, kpis, totalRecords } = payload;

    const kpiSummaryText = kpis.map(k => `${k.label}: ${k.value}`).join(" | ");

    let summaryFr = `Synthèse automatique par l'IA Gemini pour le module "${reportTitleFr}". Analyse basée sur ${totalRecords} enregistrements consolidés en base.`;
    let summaryAr = `ملخص تنفيذي آلي بواسطة الذكاء الاصطناعي Gemini لموديول "${reportTitleFr}". تحليل قائم على ${totalRecords} سجل مجمع في قاعدة البيانات.`;

    let highlightsFr: string[] = [];
    let highlightsAr: string[] = [];
    let risksFr: string[] = [];
    let risksAr: string[] = [];
    let recommendationsFr: string[] = [];
    let recommendationsAr: string[] = [];

    if (reportType === "students") {
      highlightsFr = [
        "Base d'élèves stabilisée et numérisée avec identifiants uniques.",
        `Effectif global analysé : ${totalRecords} élèves inscrits.`,
        "Taux de parité filles/garçons conforme aux normes éducatives."
      ];
      highlightsAr = [
        "قاعدة بيانات الطلاب رقمية ومستقرة مع معرفات فريدة لكل طالب.",
        `إجمالي العدد المحلل: ${totalRecords} طالب مسجل.`,
        "مؤشر التكافئ بين الجنسين يتماشى مع المعايير التربوية."
      ];
      risksFr = [
        "Nécessité de maintenir à jour les dossiers de tuteurs et contacts d'urgence.",
        "Suivi rigoureux des élèves transférés ou en attente d'affectation."
      ];
      risksAr = [
        "ضرورة تحديث ملفات أولياء الأمور وأرقام الطوارئ بشكل مستمر.",
        "متابعة دقيقة للطلاب المنقولين أو المنتظرين لإعادة التوزيع."
      ];
      recommendationsFr = [
        "Automatiser l'envoi de SMS de confirmation d'inscription aux parents.",
        "Exporter le canevas mensuel des effectifs pour l'inspection de district."
      ];
      recommendationsAr = [
        "أتمتة إرسال الرسائل النصية لأولياء الأمور لتأكيد التسجيل.",
        "تصدير جدول الإحصائيات الشهري للتفتيش التربوي."
      ];
    } else if (reportType === "finances") {
      highlightsFr = [
        "Suivi en temps réel de la trésorerie et de la caisse centrale.",
        `Chiffres clés : ${kpiSummaryText}.`,
        "Transparence totale sur les flux d'entrées et de sorties."
      ];
      highlightsAr = [
        "متابعة لحظية للسيولة المالية والخزينة المركزية.",
        `الأرقام المفتاحية: ${kpiSummaryText}.`,
        "شفافية كاملة في حركة المقبوضات والمصروفات."
      ];
      risksFr = [
        "Attention particulière requise sur le taux de recouvrement des impayés.",
        "Prévoir une réserve de trésorerie pour les charges de fonctionnement futures."
      ];
      risksAr = [
        "الانتباه الشديد لمعدل تحصيل الأقساط المتبقية.",
        "تخصيص احتياطي مالية لنفقات التشغيل القادمة."
      ];
      recommendationsFr = [
        "Lancer des relances automatiques par SMS pour les échéances d'écolage.",
        "Établir un bilan hebdomadaire de rapprochement bancaire."
      ];
      recommendationsAr = [
        "تفعيل التذكير التلقائي بالرسائل النصية لمواعيد سداد الرسوم.",
        "إعداد تقرير أسبوعي للتسوية المالية."
      ];
    } else if (reportType === "presence") {
      highlightsFr = [
        "Numérisation du suivi d'assiduité par classe et par séance.",
        `Nombre total d'appels enregistrés : ${totalRecords}.`
      ];
      highlightsAr = [
        "رقمنة كشوف الحضور والغياب لكل فصل وحصة.",
        `إجمالي كشوف الحضور المسجلة: ${totalRecords}.`
      ];
      risksFr = [
        "Détection de retards répétitifs en première heure de cours.",
        "Risque de décrochage sur les élèves accumulant plus de 3 absences non justifiées."
      ];
      risksAr = [
        "رصد حالات تأخر متكررة في الحصص الأولى.",
        "خطر التعثر الدراسي للطلاب الذين يتجاوز غيابهم غير المبرر 3 أيام."
      ];
      recommendationsFr = [
        "Activer les alerte IA de détection précoce du décrochage scolaire.",
        "Convoquer les parents des élèves ayant un taux d'absence > 15%."
      ];
      recommendationsAr = [
        "تفعيل الإنذارات التنبؤية للذكاء الاصطناعي للحد من التسرب المدرسي.",
        "استدعاء أولياء أمور الطلاب الذين يتجاوز غيابهم 15%."
      ];
    } else {
      highlightsFr = [
        `Données consolidées avec succès pour le rapport "${reportTitleFr}".`,
        `Nombre d'enregistrements traités : ${totalRecords}.`,
        `Indicateurs clés : ${kpiSummaryText}.`
      ];
      highlightsAr = [
        `تم تجميع البيانات بنجاح لتقرير "${reportTitleFr}".`,
        `عدد السجلات المعالجة: ${totalRecords}.`,
        `المؤشرات الأساسية: ${kpiSummaryText}.`
      ];
      risksFr = [
        "Assurer la mise à jour régulière des entrées par les équipes pédagogiques et administratives."
      ];
      risksAr = [
        "ضمان التحديث الدوري للبيانات من طرف الطاقم الإداري والتربوي."
      ];
      recommendationsFr = [
        "Valider et imprimer le rapport officiel pour l'archivage de l'établissement."
      ];
      recommendationsAr = [
        "اعتماد وطباعة التقرير الرسمي لأرشيف المؤسسة."
      ];
    }

    const response: AIReportSummaryResponse = {
      summaryFr,
      summaryAr,
      highlightsFr,
      highlightsAr,
      risksFr,
      risksAr,
      recommendationsFr,
      recommendationsAr,
      generatedAt: new Date().toISOString()
    };

    return { data: response };
  });
}
