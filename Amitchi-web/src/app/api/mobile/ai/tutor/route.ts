import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SUBJECT_PROMPTS: Record<string, string> = {
  "Mathématiques": "Expert en Mathématiques (Algèbre, Géométrie, Analyse, Probabilités). Donne les formules exactes, définitions rigoureuses, et résous étape par étape.",
  "Physique-Chimie": "Expert en Physique et Chimie. Explique les lois physiques, les unités SI, les réactions chimiques équilibrées et les démarches expérimentales.",
  "SVT / Biologie": "Expert en Sciences de la Vie et de la Terre (Biologie, Géologie, Génétique). Utilise un vocabulaire scientifique précis et des schémas textuels clairs.",
  "Français / Littérature": "Expert en Langue Française et Littérature. Aide pour la grammaire, la conjugaison, l'analyse de texte, la dissertation, le commentaire et le résumé.",
  "Philosophie": "Professeur de Philosophie. Aide à structurer les dissertations (Thèse, Antithèse, Synthèse), citer des philosophes majeurs et clarifier les concepts.",
  "Histoire-Géographie": "Professeur d'Histoire-Géographie. Fournis des repères chronologiques, des dates clés, des cartes conceptuelles et les enjeux contemporains.",
  "Anglais": "Expert English Teacher. Explique la grammaire, le vocabulaire et propose des exemples bilingues (anglais-français).",
  "Arabe": "أستاذ متخصص في اللغة العربية والتربية الإسلامية (قواعد، إعراب، بلاغة، ونصوص أدبية).",
};

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { question, subject = "Général", educationalLevel, studentName, history = [] } = body;

    if (!question || !question.trim()) {
      return mobileJsonError("Question requise.", 400);
    }

    const subjectExpertise = SUBJECT_PROMPTS[subject] || "Tuteur pédagogique général polyvalent.";

    const systemPrompt = `Tu es "Edut AI Tutor", le professeur particulier d'excellence et tuteur pédagogique de l'élève ${studentName || ""}.
Niveau scolaire de l'élève : ${educationalLevel || "Secondaire (Collège / Lycée)"}.
Matière concernée : ${subject}.
Spécialité : ${subjectExpertise}

Directives pédagogiques :
1. Réponds en français (ou en arabe si la question est en arabe), avec un ton encourageant, méthodique et bienveillant.
2. Structure ta réponse avec :
   - 🎯 **Notion Clé** : Définition ou principe fondamental en 1-2 phrases.
   - 📝 **Explication / Démarche étape par étape** : Découpage clair avec puces ou numéros.
   - 💡 **Exemple concret ou Formule** : Une illustration pratique immédiate.
   - ❓ **Mini-Quiz / Question de vérification** : Une courte question pour tester si l'élève a compris.
3. Sois concis, pédagogique et adapté au niveau scolaire.`;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        answer: `Bonjour ${studentName || "cher élève"} !\n\n🎯 **Notion Clé (${subject})** :\nPour réussir cette question, il faut bien identifier les données initiales et la règle du cours applicable.\n\n📝 **Méthode recommandée** :\n1. Relis attentivement l'énoncé et repère les mots-clés.\n2. Écris la formule ou le principe de base.\n3. Effectue l'application étape par étape.\n\n💡 **Conseil Edut** : La régularité de l'entraînement fait toute la différence !\n\n❓ **Question pour toi** : Peux-tu me préciser les valeurs ou la phrase exacte de ton exercice pour qu'on le résolve ensemble ?`,
        subject,
      });
    }

    // Build Gemini contents array with history
    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      {
        role: "model",
        parts: [{ text: `Compris ! Je suis Edut AI Tutor, prêt à enseigner ${subject} avec clarté, bienveillance et rigueur.` }]
      }
    ];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        if (h.role && h.text) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: String(h.text) }]
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: `Question : ${question}` }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1200,
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.warn("[AI Tutor] Gemini API error, fallback response:", errText);
      return NextResponse.json({
        success: true,
        answer: `🎯 **Explication pour votre question en ${subject}** :\n\n1. **Principe fondamental** : Revoyez la règle principale du cours.\n2. **Application pratique** : Appliquez les étapes vues en classe pour résoudre l'exercice.\n\nSouhaitez-vous qu'on décompose un calcul précis ensemble ?`,
        subject,
      });
    }

    const data = await geminiRes.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const answer = candidateText || "Désolé, je n'ai pas pu formuler une réponse complète. Peux-tu reformuler ?";

    return NextResponse.json({
      success: true,
      answer,
      subject,
    });
  } catch (error: any) {
    console.error("[AI Tutor POST] Error:", error);
    return mobileJsonError(error?.message || "Erreur lors du traitement IA", 500);
  }
}
