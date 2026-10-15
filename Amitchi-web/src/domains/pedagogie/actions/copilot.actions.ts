"use server";

import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db } from "@/infrastructure/database";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { eq, or, isNull } from "drizzle-orm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(prompt: string, maxTokens = 1500, temperature = 0.6): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }
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
    console.error("[Gemini AI Server Action Error]:", e);
  }
  return null;
}

/**
 * 1. Generate Lesson Plan (Fiche de Cours / Plan Pédagogique)
 */
export async function generateLessonPlanAction(data: {
  subject: string;
  level: string;
  topic: string;
  durationMinutes?: number;
  objectives?: string;
}) {
  return protectedDbAction("Pedagogie", "canView", async () => {
    const duration = data.durationMinutes || 60;
    const prompt = `Agis en tant qu'inspecteur pédagogique et expert dans l'enseignement secondaire et universitaire.
Rédige une fiche pédagogique détaillée, moderne et structurée pour le cours suivant :
- Matière : ${data.subject}
- Niveau / Classe : ${data.level}
- Thème / Chapitre : ${data.topic}
- Durée : ${duration} minutes
${data.objectives ? `- Objectifs spécifiques souhaités : ${data.objectives}` : ""}

Structure ta réponse avec les sections suivantes au format Markdown clair :
1. **Objectifs Pédagogiques** (Généraux et Opérationnels)
2. **Prérequis Requis**
3. **Matériel & Supports Didactiques**
4. **Déroulement Détaillé de la Séance** (Introduction, Développement avec découpage horaire en minutes, Synthèse)
5. **Activités d'Apprentissage des Élèves**
6. **Évaluation Formative & Questions de Contrôle**
7. **Devoir / Exercices d'Application pour la maison**`;

    const aiResponse = await callGemini(prompt);
    if (aiResponse) {
      return { content: aiResponse, source: "ai" };
    }

    // Fallback template if API key is not yet set
    return {
      content: `### 📚 Fiche Pédagogique : ${data.topic}
**Matière :** ${data.subject} | **Niveau :** ${data.level} | **Durée :** ${duration} min

#### 1. Objectifs Pédagogiques
- Comprendre les principes fondamentaux de *${data.topic}*.
- Être capable d'appliquer les concepts dans des exercices types.
- Développer l'esprit d'analyse et de synthèse.

#### 2. Prérequis
- Notions abordées dans le chapitre précédent.
- Maîtrise du vocabulaire de base en ${data.subject}.

#### 3. Déroulement de la Séance (${duration} min)
- **Introduction & Rappel (10 min)** : Diagnostic des prérequis et mise en situation.
- **Phase d'Apprentissage / Cours (25 min)** : Présentation des notions clés, exemples concrets et démonstration.
- **Pratique Guidée (15 min)** : Résolution d'exercices en groupes ou individuellement.
- **Synthèse & Bilan (10 min)** : Récapitulatif des points essentiels et validation des acquis.

#### 4. Évaluation Formative
- Questionnement oral direct.
- Exercice d'application rapide au tableau.

#### 5. Travail à faire pour la prochaine séance
- Réviser les définitions clés et traiter l'exercice 1 et 2 de la fiche de TD.`,
      source: "template",
    };
  });
}

/**
 * 2. Generate Quiz & Multiple Choice Questions (Générateur de QCM & Devoirs)
 */
export async function generateQuizAction(data: {
  subject: string;
  level: string;
  topic: string;
  questionCount?: number;
  difficulty?: "facile" | "moyen" | "difficile";
}) {
  return protectedDbAction("Pedagogie", "canView", async () => {
    const count = data.questionCount || 5;
    const diff = data.difficulty || "moyen";

    const prompt = `Crée un QCM pédagogique rigoureux de ${count} questions avec 4 options (A, B, C, D) chacune sur le sujet suivant :
- Matière : ${data.subject}
- Niveau : ${data.level}
- Thème : ${data.topic}
- Difficulté : ${diff}

Pour chaque question, indique clairement la bonne réponse et une explication pédagogique détaillée de 2 phrases.
Format Markdown structuré.`;

    const aiResponse = await callGemini(prompt);
    if (aiResponse) {
      return { content: aiResponse, source: "ai" };
    }

    return {
      content: `### 🎯 QCM d'Évaluation : ${data.topic}
**Matière :** ${data.subject} | **Niveau :** ${data.level} | **Niveau de difficulté :** ${diff.toUpperCase()}

#### Question 1
Quelle est la définition principale relative à **${data.topic}** ?
- A) Option théorique initiale
- B) Définition exacte et concept clé *(Bonne réponse)*
- C) Cas particulier non généralisable
- D) Hypothèse secondaire

> **Correction :** La réponse **B** est correcte car elle englobe l'ensemble des conditions fondamentales enseignées dans le programme.

---

#### Question 2
Dans quel contexte méthodologique applique-t-on ce principe en ${data.subject} ?
- A) Uniquement en début d'année
- B) Lors de l'analyse quantitative et de la vérification *(Bonne réponse)*
- C) Sans condition préalable
- D) En cas d'erreur de calcul

> **Correction :** La réponse **B** est la méthode standard validée par le référentiel pédagogique.`,
      source: "template",
    };
  });
}

/**
 * 3. Generate Student Grade Appreciation (Générateur d'Appréciations Personnalisées)
 */
export async function generateStudentAppreciationAction(data: {
  studentName?: string;
  subject: string;
  score: number;
  maxScore?: number;
  attitude?: "tres_attentif" | "moyen" | "bavard" | "progression";
}) {
  return protectedDbAction("Pedagogie", "canView", async () => {
    const score = Number(data.score || 10);
    const max = Number(data.maxScore || 20);
    const student = data.studentName || "L'élève";

    const prompt = `Rédige 3 propositions d'appréciations scolaires constructives, encourageantes et précises (1 à 2 phrases max) pour un bulletin trimestriel :
- Élève : ${student}
- Matière : ${data.subject}
- Moyenne obtenue : ${score} / ${max}
- Comportement / Profil : ${data.attitude || "Travailleur"}

Donne 3 variantes :
1. Formelle & Analytique
2. Encourageante & Bienveillante
3. Axée sur les leviers d'amélioration`;

    const aiResponse = await callGemini(prompt);
    if (aiResponse) {
      return { content: aiResponse, source: "ai" };
    }

    let defaultAppr = "";
    if (score >= 16) {
      defaultAppr = `1. **Formelle :** Excellent trimestre. Les notions sont maîtrisées avec rigueur et autonomie.\n2. **Bienveillante :** Bravo à ${student} pour cet investissement exemplaire et constant !\n3. **Amélioration :** Félicitations pour ces résultats remarquables, poursuivez dans cette dynamique d'excellence.`;
    } else if (score >= 12) {
      defaultAppr = `1. **Formelle :** Bon ensemble dans l'ensemble. Les bases sont solides.\n2. **Bienveillante :** Trimestre satisfaisant, ${student} fait preuve de régularité et de sérieux.\n3. **Amélioration :** En approfondissant les révisions des méthodes complexes, la mention supérieure est tout à fait accessible.`;
    } else if (score >= 9) {
      defaultAppr = `1. **Formelle :** Résultats moyens. Les concepts sont partiellement compris mais manquent de précision.\n2. **Bienveillante :** ${student} montre de la bonne volonté, persévérez avec plus de rigueur.\n3. **Amélioration :** Il est nécessaire de revoir les bases et de participer davantage pour franchir le cap de la moyenne.`;
    } else {
      defaultAppr = `1. **Formelle :** Trimestre insuffisant. Des lacunes importantes persistent dans la méthode de travail.\n2. **Bienveillante :** Ne vous découragez pas, un travail régulier et méthodique permettra de redresser la barre.\n3. **Amélioration :** Un soutien personnalisé et une reprise des exercices fondamentaux sont vivement recommandés.`;
    }

    return { content: defaultAppr, source: "template" };
  });
}
