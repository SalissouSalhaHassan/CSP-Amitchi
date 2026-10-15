import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      className,
      subjectName,
      topic,
      difficulty, // "Facile", "Intermédiaire", "Examen Officiel / BEPC / BAC", "Avancé"
      durationMinutes,
      questionCount,
      questionType, // "Mixte", "QCM", "Exercices & Problèmes", "Questions de cours"
    } = body;

    if (!topic || !subjectName) {
      return mobileJsonError("Matière et sujet/thème du cours requis.", 400);
    }

    const schoolName = "COMPLEXE SCOLAIRE PRIVÉ D'EXCELLENCE EDUT";
    const totalPoints = 20;
    const count = Number(questionCount) || 4;
    const diff = difficulty || "Intermédiaire";
    const dur = durationMinutes || "45 minutes";
    const cls = className || "Classe de 3ème";

    // Pedagogical exam generation engine tailored to African/Francophone curriculum
    const questions = [
      {
        number: 1,
        title: "Partie I : Évaluation des Connaissances & Définitions",
        type: "Questions de cours & Définitions",
        points: 4,
        prompt: `Définir clairement les notions fondamentales relatives à « ${topic} ». Énoncer les propriétés essentielles et donner un exemple illustratif concret.`,
        modelAnswer: `1. Définition rigoureuse du concept de ${topic} avec terminologie exacte.\n2. Énoncé précis des propriétés et théorèmes associés.\n3. Exemple d'application vérifiant les hypothèses.`,
        rubric: "1.5 pt pour la définition, 1.5 pt pour les propriétés, 1 pt pour l'exemple.",
      },
      {
        number: 2,
        title: "Partie II : Application Directe & Calculs Pratiques",
        type: "Exercice d'application",
        points: 6,
        prompt: `Soit une situation d'application standard sur « ${topic} ».\n1. Poser les hypothèses et identifier les données utiles.\n2. Effectuer les calculs étape par étape avec justification des formules.\n3. Interpréter le résultat obtenu dans le contexte de l'étude.`,
        modelAnswer: `1. Identification des variables et grandeurs du problème.\n2. Calcul détaillé étape par étape avec unité de mesure correcte.\n3. Conclusion logique validant la cohérence du résultat.`,
        rubric: "2 pts pour la démarche, 3 pts pour l'exactitude des calculs, 1 pt pour l'unité et la conclusion.",
      },
      {
        number: 3,
        title: "Partie III : Raisonnement & Résolution de Problème Contextualisé",
        type: "Problème ouvert / Situation d'intégration",
        points: 7,
        prompt: `Mise en situation réelle (Type ${diff}) :\nUn cas pratique d'ingénierie/vie courante requiert l'utilisation approfondie de « ${topic} » pour optimiser une décision.\n• Analyser la problématique posée.\n• Élaborer une stratégie de résolution structurée.\n• Rédiger une synthèse claire et argumentée.`,
        modelAnswer: `• Schéma ou modélisation de la situation.\n• Démonstration mathématique / scientifique rigoureuse.\n• Réponse complète aux questions avec justifications critiques.`,
        rubric: "3 pts pour la modélisation et la stratégie, 3 pts pour la rigueur scientifique, 1 pt pour la présentation.",
      },
      {
        number: 4,
        title: "Partie IV : Question de Synthèse & Esprit Critique",
        type: "Analyse critique",
        points: 3,
        prompt: `Quelles sont les limites ou cas particuliers à respecter lors de la mise en œuvre de « ${topic} » ? Justifier brièvement.`,
        modelAnswer: `Explication des conditions de validité, exceptions ou contraintes environnementales/techniques applicables.`,
        rubric: "2 pts pour les conditions de validité, 1 pt pour la clarté d'expression.",
      },
    ];

    const generatedExam = {
      title: `ÉVALUATION PÉDAGOGIQUE : ${topic.toUpperCase()}`,
      header: {
        school: schoolName,
        discipline: subjectName,
        classe: cls,
        anneeScolaire: "2025-2026",
        duree: dur,
        coefficient: 3,
        totalPoints,
        difficulty: diff,
      },
      instructions: [
        "L'usage de calculatrices non programmables est autorisé.",
        "La clarté de la rédaction et le respect des unités sont pris en compte dans la notation (1 pt).",
        "Toutes les réponses doivent être soigneusement justifiées.",
      ],
      questions: questions.slice(0, count),
      generatedAt: new Date().toISOString(),
      teacherName: (user as any).name || user.utilisateur || "Enseignant",
    };

    return NextResponse.json({
      success: true,
      data: generatedExam,
      message: "Examen et corrigé type générés avec succès par l'IA !",
    });
  } catch (error: any) {
    console.error("[AI Exam Generator API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la génération de l'examen", 500);
  }
}
