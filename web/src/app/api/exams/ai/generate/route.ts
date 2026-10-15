import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fallbackDb: Record<string, Record<string, Array<{question: string, options: string[], correct_answer: string, type: "QCM" | "Directe"}>>> = {
  math: {
    "Algèbre": [
      { question: "Résolvez l'équation : 4x - 12 = 0.", options: ["x = 3", "x = -3", "x = 4", "x = 12"], correct_answer: "x = 3", type: "QCM" },
      { question: "Quelle est la factorisation de x² - 16 ?", options: ["(x-4)(x+4)", "(x-4)²", "(x+4)²", "(x-16)(x+1)"], correct_answer: "(x-4)(x+4)", type: "QCM" },
      { question: "Quel est le discriminant de l'équation x² - 5x + 6 = 0 ?", options: ["Delta = 1", "Delta = 25", "Delta = -1", "Delta = 4"], correct_answer: "Delta = 1", type: "QCM" },
      { question: "Trouvez le produit des racines de l'équation x² - 7x + 10 = 0.", options: ["10", "7", "-10", "-7"], correct_answer: "10", type: "QCM" }
    ],
    "Géométrie": [
      { question: "Quel est le théorème qui relie les longueurs des côtés d'un triangle rectangle ?", options: ["Théorème de Pythagore", "Théorème de Thalès", "Loi des cosinus", "Théorème d'Al-Kashi"], correct_answer: "Théorème de Pythagore", type: "QCM" },
      { question: "Calculez le volume d'un cube de 3 cm de côté.", options: ["27 cm³", "9 cm³", "54 cm³", "18 cm³"], correct_answer: "27 cm³", type: "QCM" },
      { question: "Combien de degrés compte la somme des angles d'un triangle ?", options: ["180°", "360°", "90°", "270°"], correct_answer: "180°", type: "QCM" }
    ],
    "Probabilités": [
      { question: "On lance un dé équilibré à 6 faces. Quelle est la probabilité d'obtenir un nombre pair ?", options: ["1/2", "1/3", "2/3", "1/6"], correct_answer: "1/2", type: "QCM" },
      { question: "Quelle est la probabilité d'obtenir un double 6 en jetant deux dés équilibrés ?", options: ["1/36", "1/12", "1/6", "1/18"], correct_answer: "1/36", type: "QCM" }
    ]
  },
  physique: {
    "Mécanique": [
      { question: "Quelle est la formule de la vitesse moyenne ?", options: ["v = d / t", "v = d * t", "v = t / d", "v = d + t"], correct_answer: "v = d / t", type: "QCM" },
      { question: "Quelle force attire les objets vers le centre de la Terre ?", options: ["La force gravitationnelle", "La force magnétique", "La force nucléaire", "La force centrifuge"], correct_answer: "La force gravitationnelle", type: "QCM" }
    ],
    "Optique": [
      { question: "Quel phénomène explique qu'un bâton semble brisé lorsqu'on le plonge partiellement dans l'eau ?", options: ["La réfraction", "La réflexion", "La diffraction", "L'absorption"], correct_answer: "La réfraction", type: "QCM" }
    ],
    "Thermodynamique": [
      { question: "À quelle température l'eau pure bout-elle sous pression normale ?", options: ["100 °C", "0 °C", "50 °C", "200 °C"], correct_answer: "100 °C", type: "QCM" }
    ]
  },
  informatique: {
    "Algorithmes": [
      { question: "Quelle structure permet de répéter des instructions tant qu'une condition est vraie ?", options: ["La boucle While", "La condition If", "La structure Switch", "Le Try-Except"], correct_answer: "La boucle While", type: "QCM" },
      { question: "Quel algorithme est couramment utilisé pour trier un tableau en comparant les éléments adjacents ?", options: ["Le tri à bulles", "Le tri rapide", "Le tri fusion", "Le tri par sélection"], correct_answer: "Le tri à bulles", type: "QCM" }
    ],
    "Bases de données": [
      { question: "Quelle instruction SQL permet d'ajouter une nouvelle ligne dans une table ?", options: ["INSERT INTO", "UPDATE", "CREATE ROW", "ADD VALUES"], correct_answer: "INSERT INTO", type: "QCM" },
      { question: "Que signifie l'acronyme SGBD ?", options: ["Système de Gestion de Base de Données", "Système de Guidage de Bus Digital", "Serveur Général de Backup de Données", "Sécurité Globale et Backup de Données"], correct_answer: "Système de Gestion de Base de Données", type: "QCM" }
    ]
  },
  histoire: {
    "Seconde Guerre Mondiale": [
      { question: "En quelle année s'est terminée la Seconde Guerre mondiale ?", options: ["1945", "1939", "1918", "1950"], correct_answer: "1945", type: "QCM" },
      { question: "Quel traité a mis fin à la Première Guerre mondiale et posé les germes de la Seconde ?", options: ["Le traité de Versailles", "Le traité de Paris", "Le traité de Rome", "Le traité de Vienne"], correct_answer: "Le traité de Versailles", type: "QCM" }
    ],
    "Révolution Française": [
      { question: "Quelle est la date précise de la prise de la Bastille ?", options: ["14 juillet 1789", "4 août 1789", "21 septembre 1792", "18 brumaire 1799"], correct_answer: "14 juillet 1789", type: "QCM" }
    ]
  }
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(request: NextRequest) {
  try {
    const { subject_name, topic, difficulty, q_type, count = 3 } = await request.json();

    if (!subject_name || !topic) {
      return NextResponse.json({ error: "Sujet et matière requis." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const typeDesc = q_type.includes("QCM") 
          ? "Question à choix multiples (QCM) avec 4 options (un seul choix correct)" 
          : "Question directe nécessitant une explication ou réponse ouverte";
        
        const prompt = `Tu es un enseignant hautement qualifié. Génère ${count} questions de type '${typeDesc}' sur le sujet/chapitre '${topic}' pour la matière '${subject_name}' avec un niveau de difficulté '${difficulty}'.
Fournis ta réponse UNIQUEMENT sous la forme d'un tableau JSON valide, sans balises markdown ni texte explicatif autour.
Chaque question doit respecter scrupuleusement la structure suivante :
[
  {
    "question": "Le texte de la question...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "L'option correcte exacte parmi la liste des options (ou la réponse type si c'est une question directe)",
    "type": "QCM" ou "Directe"
  }
]
Important: Si c'est une question directe (sans choix multiples), le champ 'options' doit être une liste vide []. La langue de génération doit être le Français.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          let textContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          textContent = textContent.trim();
          if (textContent.startsWith("```json")) {
            textContent = textContent.substring(7);
          }
          if (textContent.endsWith("```")) {
            textContent = textContent.substring(0, textContent.length - 3);
          }
          textContent = textContent.trim();

          const data = JSON.parse(textContent);
          if (Array.isArray(data) && data.length > 0) {
            return NextResponse.json({ status: "success", questions: data });
          }
        }
      } catch (geminiError) {
        console.warn("[Gemini API Error] Falling back to offline questions database:", geminiError);
      }
    }

    // === OFFLINE FALLBACK DATABASE LOGIC ===
    const subLower = subject_name.toLowerCase();
    let catKey = "general";
    if (subLower.includes("math")) {
      catKey = "math";
    } else if (subLower.includes("phys") || subLower.includes("chim")) {
      catKey = "physique";
    } else if (subLower.includes("info") || subLower.includes("prog") || subLower.includes("python")) {
      catKey = "informatique";
    } else if (subLower.includes("hist") || subLower.includes("géo")) {
      catKey = "histoire";
    }

    let questionsPool: Array<{question: string, options: string[], correct_answer: string, type: "QCM" | "Directe"}> = [];
    
    if (catKey !== "general" && fallbackDb[catKey]) {
      const topicPool: typeof questionsPool = [];
      for (const [tKey, tQuestions] of Object.entries(fallbackDb[catKey])) {
        if (tKey.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(tKey.toLowerCase())) {
          topicPool.push(...tQuestions);
        }
      }
      if (topicPool.length > 0) {
        questionsPool = topicPool;
      } else {
        for (const tQuestions of Object.values(fallbackDb[catKey])) {
          questionsPool.push(...tQuestions);
        }
      }
    } else {
      for (const cat of Object.values(fallbackDb)) {
        for (const tQuestions of Object.values(cat)) {
          questionsPool.push(...tQuestions);
        }
      }
    }

    if (questionsPool.length === 0) {
      questionsPool = [{ question: `Question sur {topic}`, options: ["A", "B", "C", "D"], correct_answer: "A", type: "QCM" }];
    }

    const generatedQuestions = [];
    const shuffledPool = shuffleArray(questionsPool);

    for (let i = 0; i < count; i++) {
      const baseQ = shuffledPool[i % shuffledPool.length];
      
      if (q_type.includes("QCM")) {
        let qText = baseQ.question;
        let options = [];
        let correct = "";
        
        if (generatedQuestions.length >= shuffledPool.length) {
          qText = `Dans le contexte de '${topic}' (${subject_name}), quel énoncé est tout à fait exact ? (Difficulté: ${difficulty})`;
          options = [
            `L'énoncé de référence A concernant ${topic}`,
            `L'explication fondamentale correcte sur ${topic}`,
            `Une interprétation erronée courante de ${topic}`,
            `Une approche obsolète de ${topic}`
          ];
          options = shuffleArray(options);
          correct = options[0];
        } else {
          options = shuffleArray([...baseQ.options]);
          correct = baseQ.correct_answer;
        }

        generatedQuestions.push({
          question: qText,
          options,
          correct_answer: correct,
          type: "QCM"
        });
      } else {
        let qText = "";
        let ans = "";
        
        if (generatedQuestions.length >= shuffledPool.length) {
          qText = `Présentez en détail les enjeux majeurs et les concepts clés liés à '${topic}' dans le cadre du cours de ${subject_name}.`;
          ans = `L'élève doit identifier les aspects théoriques de ${topic}, les limites de ce modèle et son application pratique.`;
        } else {
          qText = `Analysez et expliquez : ${baseQ.question} (Option directe sur le thème '${topic}')`;
          ans = `La réponse attendue doit expliquer précisément : ${baseQ.correct_answer}`;
        }

        generatedQuestions.push({
          question: qText,
          options: [],
          correct_answer: ans,
          type: "Directe"
        });
      }
    }

    return NextResponse.json({ status: "success", questions: generatedQuestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
