import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(prompt: string, maxTokens = 1200, temperature = 0.5): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }
  } catch (e) {
    console.error("[Gemini AI Error]:", e);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      action,
      studentName,
      subjectName,
      score,
      className,
      lessonTitle,
      durationMinutes,
      difficulty,
      questionCount,
      difficultyFocus,
      objectives,
    } = body;

    const subject = subjectName || "Mathématiques";
    const level = className || "Terminale";
    const title = lessonTitle || "Chapitre Général";

    // ─────────────────────────────────────────────────────────────
    // 1. Generate Grade Appreciation
    // ─────────────────────────────────────────────────────────────
    if (action === "generateAppreciation") {
      const studentScore = Number(score || 12);
      const prompt = `Génère une appréciation scolaire concise (1 à 2 phrases max, 25 mots max), professionnelle et constructive pour le bulletin d'un élève.
Élève : ${studentName || "L'élève"}
Matière : ${subject}
Moyenne obtenue : ${studentScore}/20
Classe : ${level}
Consignes :
- Ton bienveillant, clair et pédagogique.
- Ne pas mettre de guillemets autour du texte.
- Si la note est >= 14, féliciter. Si la note est entre 10 et 13.9, encourager. Si la note est < 10, donner un conseil précis pour progresser.`;

      const aiText = await callGemini(prompt, 100, 0.6);
      let appreciation = aiText;
      if (!appreciation) {
        if (studentScore >= 16) appreciation = "Excellent trimestre ! Travail remarquable et rigoureux. Poursuivez ainsi.";
        else if (studentScore >= 14) appreciation = "Très bon travail. Résultats solides et encourageants tout au long du trimestre.";
        else if (studentScore >= 10) appreciation = "Trimestre satisfaisant. Peut encore progresser avec plus d'investissement personnel.";
        else if (studentScore >= 7) appreciation = "Résultats insuffisants. Des efforts soutenus et réguliers sont indispensables.";
        else appreciation = "Niveau très fragile. Un travail de fond et un soutien régulier sont vivement recommandés.";
      }

      return NextResponse.json({ success: true, appreciation });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Generate Quiz & Interactive Questions
    // ─────────────────────────────────────────────────────────────
    if (action === "generateQuiz" || action === "generateExercises") {
      const count = Number(questionCount || 4);
      const prompt = `Génère ${count} questions d'exercices scolaires progressives avec corrigé pour la leçon suivante :
Matière : ${subject}
Titre de la leçon : ${title}
Classe : ${level}
Difficulté : ${difficulty || "Moyenne"}

Format de réponse STRICT : Réponds UNIQUEMENT avec un tableau JSON valide au format suivant sans markdown :
[
  {
    "id": 1,
    "question": "Énoncé de la question...",
    "type": "QCM",
    "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "correctAnswer": "Choix A",
    "explanation": "Explication pédagogique...",
    "points": 5
  },
  {
    "id": 2,
    "question": "Énoncé d'un exercice d'application...",
    "type": "Ouverte",
    "correctAnswer": "Éléments de réponse attendus...",
    "points": 5
  }
]`;

      const aiText = await callGemini(prompt, 900, 0.4);
      let questions: any[] = [];
      if (aiText) {
        try {
          const cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          questions = JSON.parse(cleaned);
        } catch (_) {}
      }

      if (questions.length === 0) {
        questions = [
          {
            id: 1,
            question: `Quelle est la définition fondamentale de la notion étudiée dans "${title}" ?`,
            type: "QCM",
            options: [
              `Définition standard conforme au programme de ${subject}`,
              "Proposition erronée A",
              "Proposition erronée B",
              "Aucune de ces réponses"
            ],
            correctAnswer: `Définition standard conforme au programme de ${subject}`,
            explanation: `Cette notion constitue le prérequis clé en classe de ${level}.`,
            points: 5,
          },
          {
            id: 2,
            question: `Appliquer la formule principale du chapitre "${title}" dans un cas concret.`,
            type: "Ouverte",
            correctAnswer: "Démarche par étapes : Poser les données, appliquer la formule, vérifier l'unité.",
            points: 5,
          },
          {
            id: 3,
            question: `Résoudre le problème récapitulatif sur "${title}".`,
            type: "Ouverte",
            correctAnswer: "Résolution détaillée avec justification rigoureuse.",
            points: 10,
          },
        ];
      }

      return NextResponse.json({ success: true, questions });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Generate Full Exam Paper with Marking Scheme
    // ─────────────────────────────────────────────────────────────
    if (action === "generateExam") {
      const duration = Number(durationMinutes || 120);
      const diff = difficulty || "Moyen";

      const prompt = `Tu es un inspecteur pédagogique expérimenté en Afrique francophone (programme du Niger).
Génère une épreuve complète d'examen/devoir surveillé officiel pour :
Matière : ${subject}
Classe : ${level}
Chapitre / Thème : ${title}
Durée : ${duration} minutes
Coefficient / Total points : 20 points
Niveau de difficulté : ${diff}

Format de réponse STRICT : Réponds UNIQUEMENT avec un objet JSON valide au format suivant sans markdown :
{
  "title": "ÉPREUVE DE ${subject.toUpperCase()} - CLASSE DE ${level.toUpperCase()}",
  "instructions": "Calculatrice autorisée. La clarté et la rigueur des rédactions seront prises en compte.",
  "durationMinutes": ${duration},
  "totalPoints": 20,
  "sections": [
    {
      "sectionName": "Partie I : Évaluation des Connaissances & QCM",
      "points": 5,
      "content": "Questions de cours précises et QCM...",
      "correction": "Corrigé détaillé de la Partie I..."
    },
    {
      "sectionName": "Partie II : Exercices d'Application & Raisonnement",
      "points": 7,
      "content": "Deux exercices progressifs avec sous-questions...",
      "correction": "Corrigé détaillé étape par étape avec barème par question..."
    },
    {
      "sectionName": "Partie III : Résolution de Problème / Synthèse",
      "points": 8,
      "content": "Problème contextualisé et intégrateur...",
      "correction": "Corrigé complet et critères d'évaluation..."
    }
  ]
}`;

      const aiText = await callGemini(prompt, 1800, 0.4);
      let examData: any = null;
      if (aiText) {
        try {
          const cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          examData = JSON.parse(cleaned);
        } catch (_) {}
      }

      if (!examData) {
        examData = {
          title: `ÉPREUVE OFFICIELLE DE ${subject.toUpperCase()} - CLASSE DE ${level.toUpperCase()}`,
          instructions: "La rigueur du raisonnement et la présentation de la copie seront évaluées sur 20 points.",
          durationMinutes: duration,
          totalPoints: 20,
          sections: [
            {
              sectionName: "Partie I : Maîtrise des Savoirs (5 Points)",
              points: 5,
              content: `1. Définir précisément les termes et concepts clés de "${title}". (2 pts)\n2. Énoncer les théorèmes/propriétés fondamentaux du chapitre. (3 pts)`,
              correction: "1. Définitions exactes selon le manuel officiel.\n2. Énoncés complets avec conditions d'application.",
            },
            {
              sectionName: "Partie II : Exercices d'Application (7 Points)",
              points: 7,
              content: `Exercice 1 : Application directe des formules et calculs types. (3.5 pts)\nExercice 2 : Résolution d'une situation intermédiaire avec analyse graphique ou analytique. (3.5 pts)`,
              correction: "Exercice 1 : Calculs intermédiaires et résultat final encadré.\nExercice 2 : Démonstration rigoureuse et justification.",
            },
            {
              sectionName: "Partie III : Problème de Synthèse & Situation d'Intégration (8 Points)",
              points: 8,
              content: `Étude d'un cas concret mobilisant l'ensemble des compétences du chapitre "${title}". Questions 1 à 4 progressives.`,
              correction: "Barème détaillé : Compréhension (2 pts), Démarche scientifique (3 pts), Justesse des résultats (2 pts), Qualité de la rédaction (1 pt).",
            },
          ],
        };
      }

      return NextResponse.json({ success: true, exam: examData });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Generate Pedagogic Sheet (Fiche Pédagogique / Lesson Plan)
    // ─────────────────────────────────────────────────────────────
    if (action === "generateFichePedagogique" || action === "generateLessonPlan") {
      const prompt = `Génère une fiche pédagogique officielle complète (Fiche de préparation de leçon) conforme aux standards d'inspection en Afrique francophone (Niger) :
Matière : ${subject}
Classe : ${level}
Titre de la leçon : ${title}
Durée : ${durationMinutes || 55} minutes

Format de réponse STRICT : Réponds UNIQUEMENT avec un objet JSON valide au format suivant sans markdown :
{
  "subject": "${subject}",
  "classe": "${level}",
  "title": "${title}",
  "duration": "${durationMinutes || 55} min",
  "generalObjective": "Objectif général de la séance...",
  "specificObjectives": [
    "À la fin de la séance, l'élève sera capable de...",
    "L'élève saura identifier et appliquer..."
  ],
  "prerequisites": [
    "Notions prérequises nécessaires..."
  ],
  "teachingMaterials": [
    "Tableau, manuel scolaire, matériel didactique..."
  ],
  "phases": [
    {
      "step": "1. Phase de motivation & Rappel",
      "duration": "10 min",
      "teacherActivity": "Activités précises du professeur...",
      "studentActivity": "Activités attendues des élèves..."
    },
    {
      "step": "2. Développement & Découverte",
      "duration": "25 min",
      "teacherActivity": "Explication, guidage, structuration...",
      "studentActivity": "Recherche, prise de notes, manipulation..."
    },
    {
      "step": "3. Synthèse & Trace écrite",
      "duration": "10 min",
      "teacherActivity": "Bilan des acquis et formalisation...",
      "studentActivity": "Recopie du résumé et des règles..."
    },
    {
      "step": "4. Évaluation formative & Exercice d'application",
      "duration": "10 min",
      "teacherActivity": "Proposition d'un exercice court et contrôle...",
      "studentActivity": "Résolution individuelle sur ardoise/cahier..."
    }
  ],
  "boardSummary": "Résumé concis à inscrire au tableau pour les élèves."
}`;

      const aiText = await callGemini(prompt, 1800, 0.4);
      let ficheData: any = null;
      if (aiText) {
        try {
          const cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          ficheData = JSON.parse(cleaned);
        } catch (_) {}
      }

      if (!ficheData) {
        ficheData = {
          subject,
          classe: level,
          title,
          duration: `${durationMinutes || 55} min`,
          generalObjective: `Maîtriser les notions fondamentales et méthodes relatives à ${title}.`,
          specificObjectives: [
            `Définir et expliquer les concepts centraux de ${title}.`,
            `Appliquer les règles et formules dans des exercices types.`,
            `Résoudre un problème simple en autonomie.`,
          ],
          prerequisites: ["Connaissances du chapitre précédent", "Savoirs méthodologiques de base"],
          teachingMaterials: ["Manuel officiel", "Tableau", "Cahier d'activités"],
          phases: [
            {
              step: "1. Phase de motivation & Rappel",
              duration: "10 min",
              teacherActivity: "Pose des questions de révision sur le cours précédent pour amorcer le nouveau thème.",
              studentActivity: "Répondent aux questions et rappellent les règles déjà vues.",
            },
            {
              step: "2. Développement & Structuration",
              duration: "25 min",
              teacherActivity: "Présente la situation d'apprentissage, guide la réflexion et explicite les concepts.",
              studentActivity: "Analysent la situation, participent activement et posent des questions.",
            },
            {
              step: "3. Synthèse & Trace écrite",
              duration: "10 min",
              teacherActivity: "Dégage la règle générale et fait noter la trace écrite essentielle.",
              studentActivity: "Notent le résumé et les exemples clés dans leurs cahiers.",
            },
            {
              step: "4. Évaluation formative",
              duration: "10 min",
              teacherActivity: "Donne un exercice d'application immédiat et circule dans les rangs.",
              studentActivity: "Résolvent l'exercice individuellement.",
            },
          ],
          boardSummary: `Retenons : ${title} permet de résoudre les situations nécessitant l'application de la règle fondamentale.`,
        };
      }

      return NextResponse.json({ success: true, fiche: ficheData });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Generate Targeted Remediation Plan
    // ─────────────────────────────────────────────────────────────
    if (action === "generateRemediation") {
      const focus = difficultyFocus || title;
      const prompt = `Génère un plan de remédiation pédagogique pour un groupe d'élèves en difficulté sur :
Matière : ${subject}
Classe : ${level}
Notion difficile / Obstacle : ${focus}

Format de réponse STRICT : Réponds UNIQUEMENT avec un objet JSON valide au format suivant sans markdown :
{
  "theme": "${focus}",
  "diagnostic": "Diagnostic pédagogique de la difficulté rencontrée...",
  "strategy": "Stratégie de remédiation en 3 étapes...",
  "guidedSteps": [
    {
      "step": "Étape 1 : Déblocage de la notion",
      "explanation": "Explication simplifiée et visuelle...",
      "practice": "Mini-exercice guidé avec solution pas à pas..."
    },
    {
      "step": "Étape 2 : Consolidation",
      "explanation": "Renforcement de la méthode...",
      "practice": "Exercice d'application autonome..."
    }
  ],
  "selfEvaluation": "Critères pour que l'élève valide son autonomie."
}`;

      const aiText = await callGemini(prompt, 1200, 0.4);
      let remData: any = null;
      if (aiText) {
        try {
          const cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          remData = JSON.parse(cleaned);
        } catch (_) {}
      }

      if (!remData) {
        remData = {
          theme: focus,
          diagnostic: `Difficultés identifiées dans la compréhension et l'application directe des concepts de ${focus}.`,
          strategy: "Approche progressive : Rappel schématique -> Exercice guidé -> Exercice autonome.",
          guidedSteps: [
            {
              step: "Étape 1 : Simplification & Décomposition",
              explanation: "Décomposer le problème en sous-étapes simples avec un modèle résolu.",
              practice: "Refaire l'exemple modèle en changeant uniquement les valeurs numériques.",
            },
            {
              step: "Étape 2 : Entraînement & Autonomie",
              explanation: "Appliquer la méthodologie sans aide extérieure.",
              practice: "Résoudre 2 exercices d'application directe.",
            },
          ],
          selfEvaluation: "Je sais réussir l'exercice sans consulter le cours en moins de 10 minutes.",
        };
      }

      return NextResponse.json({ success: true, remediation: remData });
    }

    return mobileJsonError("Action non reconnue.", 400);
  } catch (error: any) {
    console.error("[Teacher Copilot API Error]:", error);
    return mobileJsonError(error?.message || "Erreur assistant enseignant", 500);
  }
}
