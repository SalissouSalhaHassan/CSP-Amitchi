import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Standard Official Coefficients for Niger / West Africa
const BEPC_COEFFICIENTS: Record<string, number> = {
  "mathématiques": 3,
  "maths": 3,
  "français": 3,
  "redaction": 2,
  "orthographe": 1,
  "physique-chimie": 2,
  "pc": 2,
  "sciences de la vie et de la terre": 2,
  "svt": 2,
  "anglais": 2,
  "histoire-géographie": 2,
  "histoire": 1,
  "géographie": 1,
  "eps": 1,
  "ecm": 1,
};

const BAC_D_COEFFICIENTS: Record<string, number> = {
  "mathématiques": 4,
  "maths": 4,
  "physique-chimie": 4,
  "pc": 4,
  "sciences de la vie et de la terre": 4,
  "svt": 4,
  "français": 2,
  "philosophie": 2,
  "philo": 2,
  "anglais": 2,
  "histoire-géographie": 2,
  "eps": 1,
};

const BAC_A_COEFFICIENTS: Record<string, number> = {
  "français": 5,
  "littérature": 4,
  "philosophie": 4,
  "philo": 4,
  "histoire-géographie": 3,
  "anglais": 3,
  "langue vivante 2": 2,
  "mathématiques": 2,
  "svt": 1,
  "eps": 1,
};

function getExamType(className: string): { examName: string; type: "BEPC" | "BAC" } {
  const norm = className.toLowerCase();
  if (norm.includes("3") || norm.includes("troisieme") || norm.includes("3eme") || norm.includes("3ème")) {
    return { examName: "Brevet d'Études du Premier Cycle (BEPC)", type: "BEPC" };
  }
  return { examName: "Baccalauréat National (BAC)", type: "BAC" };
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, className: reqClassName, subjectGrades } = body;

    let targetClassName = reqClassName;
    let studentName = "Élève Candidat";
    let matricule = "CAND-2026-001";

    if (studentId) {
      const studentRows = await readDb
        .select()
        .from(students)
        .where(eq(students.id, Number(studentId)))
        .limit(1);

      if (studentRows.length > 0) {
        const s = studentRows[0];
        studentName = s.nomEtudiant || "Élève Candidat";
        targetClassName = s.classe || targetClassName || "3ème A";
        matricule = s.numAdmission || matricule;
      }
    } else {
      const firstStudent = await readDb.query.students.findFirst({
        where: user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
      });
      if (firstStudent) {
        studentName = firstStudent.nomEtudiant || studentName;
        targetClassName = targetClassName || firstStudent.classe || "3ème A";
        matricule = firstStudent.numAdmission || matricule;
      } else {
        targetClassName = targetClassName || "3ème A";
      }
    }

    const examInfo = getExamType(targetClassName);

    // If custom subjectGrades provided (e.g. simulation), use them, otherwise use realistic defaults
    const rawSubjects: Array<{ subject: string; grade: number; coef: number }> =
      subjectGrades && Array.isArray(subjectGrades) && subjectGrades.length > 0
        ? subjectGrades
        : examInfo.type === "BEPC"
        ? [
            { subject: "Mathématiques", grade: 11.5, coef: 3 },
            { subject: "Français (Rédaction & Texte)", grade: 13.0, coef: 3 },
            { subject: "Physique-Chimie", grade: 9.0, coef: 2 },
            { subject: "SVT", grade: 12.5, coef: 2 },
            { subject: "Anglais", grade: 14.0, coef: 2 },
            { subject: "Histoire-Géographie", grade: 10.5, coef: 2 },
            { subject: "EPS", grade: 15.0, coef: 1 },
          ]
        : [
            { subject: "Mathématiques", grade: 10.5, coef: 4 },
            { subject: "Physique-Chimie", grade: 8.5, coef: 4 },
            { subject: "Sciences de la Vie et de la Terre (SVT)", grade: 11.0, coef: 4 },
            { subject: "Philosophie", grade: 12.0, coef: 2 },
            { subject: "Français", grade: 11.5, coef: 2 },
            { subject: "Anglais", grade: 13.5, coef: 2 },
            { subject: "Histoire-Géographie", grade: 10.0, coef: 2 },
            { subject: "EPS", grade: 16.0, coef: 1 },
          ];

    // Compute weighted average
    let totalPoints = 0;
    let totalCoefs = 0;
    const criticalSubjects: Array<{
      subject: string;
      grade: number;
      coef: number;
      impact: string;
      recommendation: string;
    }> = [];

    const analyzedSubjects = rawSubjects.map((s) => {
      const coef = s.coef || 2;
      const points = s.grade * coef;
      totalPoints += points;
      totalCoefs += coef;

      const isCritical = s.grade < 10.0;
      if (isCritical) {
        criticalSubjects.push({
          subject: s.subject,
          grade: s.grade,
          coef,
          impact: coef >= 3 ? "Impact Élevé sur le diplôme" : "Impact Modéré",
          recommendation: `Séances ciblées sur les annales officielles et exercices types d'examen.`,
        });
      }

      return {
        subject: s.subject,
        grade: Number(s.grade.toFixed(2)),
        coef,
        points: Number(points.toFixed(2)),
        status: s.grade >= 12 ? "Fort" : s.grade >= 10 ? "Moyen" : "Critique",
      };
    });

    const average = totalCoefs > 0 ? totalPoints / totalCoefs : 10.0;
    const roundedAvg = Number(average.toFixed(2));

    // Calculate Success Probability and Mention
    let successRate = 50;
    let mention = "Passable";
    let alertLevel = "Normal";

    if (roundedAvg >= 16.0) {
      successRate = 98;
      mention = "Très Bien";
      alertLevel = "Excellent";
    } else if (roundedAvg >= 14.0) {
      successRate = 92;
      mention = "Bien";
      alertLevel = "Très Bon";
    } else if (roundedAvg >= 12.0) {
      successRate = 84;
      mention = "Assez Bien";
      alertLevel = "Bon";
    } else if (roundedAvg >= 10.0) {
      successRate = 68;
      mention = "Passable";
      alertLevel = "Vigilance";
    } else if (roundedAvg >= 8.5) {
      successRate = 42;
      mention = "Second Groupe (Rattrapage)";
      alertLevel = "Alerte";
    } else {
      successRate = 18;
      mention = "Risque d'Échec";
      alertLevel = "Critique";
    }

    // AI Action Plan Summary
    const aiActionPlan = [
      {
        step: 1,
        title: "Consolidation des matières à fort coefficient",
        description: `Priorité absolue sur ${criticalSubjects.length > 0 ? criticalSubjects.map(c => c.subject).join(", ") : "les matières scientifiques et littéraires majeures"}.`,
      },
      {
        step: 2,
        title: "Entraînement chronométré aux épreuves types",
        description: "Traiter au minimum 2 sujets d'annales nationales par semaine dans les conditions réelles d'examen.",
      },
      {
        step: 3,
        title: "Optimisation des points bonus",
        description: "Maintenir l'excellence en EPS et Anglais pour sécuriser les points décisifs pour la mention.",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: studentId || 1,
          name: studentName,
          className: targetClassName,
          matricule,
          examName: examInfo.examName,
          examType: examInfo.type,
        },
        prediction: {
          simulatedAverage: roundedAvg,
          successProbabilityPercent: successRate,
          likelyMention: mention,
          alertLevel,
          totalCoefficients: totalCoefs,
          totalPointsWeighted: Number(totalPoints.toFixed(2)),
        },
        criticalSubjects,
        subjects: analyzedSubjects,
        actionPlan: aiActionPlan,
      },
    });
  } catch (error: any) {
    console.error("[AI Exam Predictor Error]:", error);
    return mobileJsonError(error?.message || "Erreur de prédiction IA", 500);
  }
}
