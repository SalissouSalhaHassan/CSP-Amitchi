import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

const BADGES_CATALOG = [
  {
    id: "math_star",
    title: "Étoile des Maths",
    titleAr: "نجم الرياضيات",
    icon: "🌟",
    color: "#F59E0B",
    category: "Académique",
    points: 50,
    description: "Excellente logique et maîtrise des calculs.",
  },
  {
    id: "golden_discipline",
    title: "Discipline d'Or",
    titleAr: "وسام الانضباط الذهبي",
    icon: "🎖️",
    color: "#10B981",
    category: "Comportement",
    points: 40,
    description: "Comportement exemplaire et assiduité sans faille.",
  },
  {
    id: "reading_champion",
    title: "Champion de Lecture",
    titleAr: "بطل القراءة",
    icon: "📚",
    color: "#3B82F6",
    category: "Littérature",
    points: 35,
    description: "Passion pour la lecture et aisance d'expression.",
  },
  {
    id: "rapid_progress",
    title: "Progression Éclair",
    titleAr: "أفضل تقدم أسبوعي",
    icon: "🚀",
    color: "#8B5CF6",
    category: "Effort",
    points: 45,
    description: "Efforts remarquables et nette amélioration des résultats.",
  },
  {
    id: "science_genius",
    title: "Génie Scientifique",
    titleAr: "العبقري العلمي",
    icon: "💡",
    color: "#06B6D4",
    category: "Sciences",
    points: 50,
    description: "Curiosité expérimentale et esprit d'innovation.",
  },
  {
    id: "team_spirit",
    title: "Esprit d'Équipe",
    titleAr: "روح التعاون",
    icon: "🤝",
    color: "#EC4899",
    category: "Valeurs",
    points: 30,
    description: "Entraide mutuelle et soutien à ses camarades.",
  },
];

// Student earned badges cache
const studentBadgesCache: Record<number, Array<{
  badgeId: string;
  awardedAt: string;
  awardedBy: string;
  reason?: string;
}>> = {
  1: [
    { badgeId: "math_star", awardedAt: new Date(Date.now() - 300000000).toISOString(), awardedBy: "M. Abdoulaye", reason: "19/20 au contrôle de géométrie" },
    { badgeId: "golden_discipline", awardedAt: new Date(Date.now() - 600000000).toISOString(), awardedBy: "Vie Scolaire", reason: "Zéro retard ce mois-ci" },
    { badgeId: "reading_champion", awardedAt: new Date(Date.now() - 900000000).toISOString(), awardedBy: "Mme. Mariama", reason: "Exposé brillant en français" },
  ],
};

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId")) || 1;

  const earned = studentBadgesCache[studentId] || [
    { badgeId: "math_star", awardedAt: new Date().toISOString(), awardedBy: "Enseignant", reason: "Excellence académique" },
    { badgeId: "golden_discipline", awardedAt: new Date().toISOString(), awardedBy: "Direction", reason: "Assiduité exemplaire" },
  ];

  const populatedEarned = earned.map((e) => {
    const bInfo = BADGES_CATALOG.find((b) => b.id === e.badgeId) || BADGES_CATALOG[0];
    return {
      ...bInfo,
      ...e,
    };
  });

  const totalMeritPoints = populatedEarned.reduce((acc, b) => acc + (b.points || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      catalog: BADGES_CATALOG,
      studentId,
      totalMeritPoints,
      earnedBadges: populatedEarned,
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, badgeId, reason } = body;

    if (!studentId || !badgeId) {
      return mobileJsonError("studentId et badgeId requis.", 400);
    }

    const sId = Number(studentId);
    if (!studentBadgesCache[sId]) {
      studentBadgesCache[sId] = [];
    }

    const newAward = {
      badgeId,
      awardedAt: new Date().toISOString(),
      awardedBy: (user as any).name || user.utilisateur || "Enseignant",
      reason: reason || "Attribution au mérite",
    };

    studentBadgesCache[sId].unshift(newAward);

    const badgeMeta = BADGES_CATALOG.find((b) => b.id === badgeId);

    return NextResponse.json({
      success: true,
      data: {
        ...badgeMeta,
        ...newAward,
      },
    });
  } catch (error: any) {
    console.error("[Badges Award POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'attribution du badge", 500);
  }
}
