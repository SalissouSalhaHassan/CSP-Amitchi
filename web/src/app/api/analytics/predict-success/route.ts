import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { exams, examResults, schoolClasses } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, schoolId = 1, studentId } = body;

    let classInfo: any = null;
    let studentList: any[] = [];

    if (classId) {
      classInfo = await db.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, Number(classId)),
        with: { section: true },
      });

      studentList = await db.query.students.findMany({
        where: eq(students.classId, Number(classId)),
        with: {
          examResults: {
            with: { exam: true },
            limit: 10,
          },
        },
      });
    } else if (studentId) {
      const singleStudent = await db.query.students.findFirst({
        where: eq(students.id, Number(studentId)),
        with: {
          class: true,
          examResults: {
            with: { exam: true },
          },
        },
      });
      if (singleStudent) studentList = [singleStudent];
    } else {
      // Default sample from school
      studentList = await db.query.students.findMany({
        where: eq(students.schoolId, Number(schoolId)),
        with: {
          class: true,
          examResults: {
            with: { exam: true },
            limit: 5,
          },
        },
        limit: 30,
      });
    }

    // Build context summary for Gemini
    const studentsSummary = studentList.map((s) => {
      const marks = (s.examResults || []).map((r: any) => r.marksObtained ?? 0);
      const avg = marks.length > 0 ? marks.reduce((a: number, b: number) => a + b, 0) / marks.length : 10;
      return {
        id: s.id,
        name: (s as any).nomEtudiant || "Élève",
        matricule: (s as any).numAdmission || `ADM-${s.id}`,
        average: Math.round(avg * 10) / 10,
        examCount: marks.length,
      };
    });

    const apiKey = process.env.GEMINI_API_KEY;
    let predictionData: any = null;

    if (apiKey && studentsSummary.length > 0) {
      try {
        const prompt = `Tu es un analyste expert en prédiction de réussite scolaire et prévention du décrochage.
Analyse les données académiques de la classe suivante :
- Classe : ${classInfo?.className || "Classe Générale"}
- Effectif : ${studentsSummary.length} élèves
- Données des élèves : ${JSON.stringify(studentsSummary.slice(0, 20))}

Tâches :
1. Estime le taux de réussite global prévisionnel aux examens de fin d'année (%).
2. Identifie les élèves à risque élevé ou modéré de décrochage/échec scolaire.
3. Propose 3 actions correctives concrètes et ciblées pour la direction et les enseignants.

Réponds UNIQUEMENT sous forme d'un objet JSON strict avec la structure suivante :
{
  "predictedPassRate": 82.5,
  "confidenceScore": 88.0,
  "riskDistribution": {
    "lowRiskCount": 18,
    "moderateRiskCount": 4,
    "highRiskCount": 2
  },
  "atRiskStudents": [
    {
      "studentId": 1,
      "name": "Nom Prénom",
      "riskLevel": "Élevé", // "Élevé" | "Modéré" | "Faible"
      "currentAverage": 7.5,
      "riskFactors": ["Moyenne sous le seuil de passage", "Baisse sur les 3 derniers contrôles"],
      "recommendedAction": "Remédiation ciblée en mathématiques et entretien d'orientation."
    }
  ],
  "strategicRecommendations": [
    "Organiser des séances de tutorat par les pairs les mercredis après-midi.",
    "Contacter les parents des 2 élèves en risque élevé avant la fin du mois."
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          let textContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          textContent = textContent.trim();
          if (textContent.startsWith("```json")) textContent = textContent.substring(7);
          if (textContent.endsWith("```")) textContent = textContent.substring(0, textContent.length - 3);
          predictionData = JSON.parse(textContent.trim());
        }
      } catch (geminiErr) {
        console.warn("[Predict Success Gemini Error]:", geminiErr);
      }
    }

    // Heuristic fallback if AI unavailable
    if (!predictionData) {
      const highRisk = studentsSummary.filter((s) => s.average < 8.0);
      const modRisk = studentsSummary.filter((s) => s.average >= 8.0 && s.average < 10.0);
      const lowRisk = studentsSummary.filter((s) => s.average >= 10.0);

      const passRate = studentsSummary.length > 0
        ? Math.round((lowRisk.length / studentsSummary.length) * 100 * 10) / 10
        : 80.0;

      predictionData = {
        predictedPassRate: passRate,
        confidenceScore: 85.0,
        riskDistribution: {
          lowRiskCount: lowRisk.length,
          moderateRiskCount: modRisk.length,
          highRiskCount: highRisk.length,
        },
        atRiskStudents: [
          ...highRisk.map((s) => ({
            studentId: s.id,
            name: s.name,
            riskLevel: "Élevé",
            currentAverage: s.average,
            riskFactors: ["Moyenne sous le seuil d'exclusion / redoublement"],
            recommendedAction: "Entretien pédagogique immédiat et mise en place d'un plan de soutien.",
          })),
          ...modRisk.map((s) => ({
            studentId: s.id,
            name: s.name,
            riskLevel: "Modéré",
            currentAverage: s.average,
            riskFactors: ["Proche du seuil d'admissibilité"],
            recommendedAction: "Renforcement des devoirs à la maison et tutorat.",
          })),
        ],
        strategicRecommendations: [
          "Organiser des séances de révision ciblées avant les examens finaux.",
          "Notifier les parents via l'application mobile pour un suivi rigoureux des devoirs.",
        ],
      };
    }

    return NextResponse.json({
      success: true,
      data: predictionData,
      meta: {
        className: classInfo?.className || "Ensemble des classes",
        evaluatedStudentsCount: studentsSummary.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Predict Success API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de prédiction IA." },
      { status: 500 }
    );
  }
}
