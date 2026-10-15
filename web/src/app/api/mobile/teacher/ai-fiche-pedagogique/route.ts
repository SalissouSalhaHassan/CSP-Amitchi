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
      chapter,
      lessonTitle,
      durationMinutes,
      educationalLevel,
    } = body;

    if (!lessonTitle || !subjectName) {
      return mobileJsonError("Titre de la leçon et matière requis.", 400);
    }

    const dur = durationMinutes || "55 min";
    const chap = chapter || "Unité d'apprentissage principale";
    const cls = className || "Classe de 3ème";

    const ficheApc = {
      meta: {
        school: "COMPLEXE SCOLAIRE PRIVÉ EDUT",
        discipline: subjectName,
        classe: cls,
        chapitre: chap,
        titreLecon: lessonTitle,
        duree: dur,
        dateCreation: new Date().toLocaleDateString("fr-FR"),
        enseignant: (user as any).name || user.utilisateur || "Enseignant Responsable",
      },
      prerequis: [
        `Maîtrise des prérequis méthodologiques liés à ${chap}.`,
        `Capacité de lecture, d'analyse documentaire et de calcul de base.`,
      ],
      competencesVisees: [
        `Comprendre et mobiliser les concepts fondamentaux de « ${lessonTitle} ».`,
        `Résoudre des situations-problèmes contextualisées en faisant appel aux règles de ${subjectName}.`,
        `Communiquer avec clarté en utilisant le vocabulaire disciplinaire approprié.`,
      ],
      materielsEtSupports: [
        "Tableau blanc interactif / Manuel officiel de l'élève.",
        "Fiches d'activités polycopiées & exercices d'application.",
        "Calculatrice scientifique et instruments de traçage.",
      ],
      deroulementPhases: [
        {
          phase: "Phase 1 : Motivation & Situation-Problème",
          duree: "10 min",
          roleEnseignant: `Présenter une situation concrète issue du quotidien illustrant la nécessité de comprendre « ${lessonTitle} ». Poser des questions ouvertes.`,
          roleEleve: "Observer, émettre des hypothèses individuelles et noter les constats initiaux.",
          modalite: "Travail collectif / Brainstorming",
        },
        {
          phase: "Phase 2 : Activités d'Apprentissage & Recherche",
          duree: "25 min",
          roleEnseignant: "Guider les élèves dans la résolution de l'activité guidée, circuler dans les rangs et valider les étapes intermédiaires.",
          roleEleve: "Manipuler les données, appliquer les formules et confronter les démarches en petits groupes.",
          modalite: "Travail en binômes",
        },
        {
          phase: "Phase 3 : Synthèse & Institutionnalisation (Trace écrite)",
          duree: "12 min",
          roleEnseignant: "Structurer la règle générale au tableau, énoncer les théorèmes clés et faire noter le résumé essentiel.",
          roleEleve: "Recopier soigneusement la synthèse, surligner les définitions et formules clés.",
          modalite: "Collectif",
        },
        {
          phase: "Phase 4 : Évaluation Formative & Clôture",
          duree: "8 min",
          roleEnseignant: "Proposer un exercice rapide de vérification des acquis (minute quiz) et donner le travail à domicile.",
          roleEleve: "Résoudre l'exercice individuellement et noter le devoir sur le cahier de textes.",
          modalite: "Individuel",
        },
      ],
      evaluationFormative: {
        critere: "Critère de réussite : Résolution autonome d'au moins 80% de l'exercice d'application directe.",
        devoirDomicile: `Exercices n° 4, 5 et 8 de la page 42 du manuel pour la séance prochaine.`,
      },
    };

    return NextResponse.json({
      success: true,
      data: ficheApc,
      message: "Fiche pédagogique APC générée avec succès !",
    });
  } catch (error: any) {
    console.error("[AI Fiche Pedagogique API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la génération de la fiche", 500);
  }
}
