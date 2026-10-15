import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { behaviorRewards } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const targetStudentId = searchParams.get("studentId") ? Number(searchParams.get("studentId")) : user.studentId;

    if (!targetStudentId) {
      return mobileJsonError("studentId requis.", 400);
    }

    const student = await db.query.students.findFirst({
      where: eq(students.id, targetStudentId),
      columns: {
        id: true,
        nomEtudiant: true,
        numAdmission: true,
        classe: true,
      },
    });

    const rewards = await db.query.behaviorRewards.findMany({
      where: eq(behaviorRewards.studentId, targetStudentId),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    // Compute total points
    const totalPoints = rewards.reduce((sum, r) => sum + (r.pointsEffect || 0), 100);

    // Available badges catalog
    const badgesCatalog = [
      {
        id: "excellence",
        name: "Excellence Académique 🌟",
        description: "Moyenne générale supérieure à 16/20",
        points: 50,
        icon: "star",
        color: "#F59E0B",
      },
      {
        id: "discipline",
        name: "Discipline Exemplaire 🎖️",
        description: "Zéro retard et comportement irréprochable",
        points: 40,
        icon: "military_tech",
        color: "#10B981",
      },
      {
        id: "entraide",
        name: "Entraide & Esprit d'équipe 🤝",
        description: "Soutien et bienveillance envers ses camarades",
        points: 30,
        icon: "handshake",
        color: "#3B82F6",
      },
      {
        id: "participation",
        name: "Participation Active 💡",
        description: "Interventions constructives et régulières en classe",
        points: 25,
        icon: "lightbulb",
        color: "#8B5CF6",
      },
      {
        id: "ponctualite",
        name: "Ponctualité Parfaite ⏰",
        description: "Assiduité sans faille tout au long du mois",
        points: 20,
        icon: "schedule",
        color: "#06B6D4",
      },
      {
        id: "progression",
        name: "Meilleure Progression 📈",
        description: "Progression remarquable des résultats scolaires",
        points: 35,
        icon: "trending_up",
        color: "#EC4899",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        student,
        totalPoints,
        earnedBadges: rewards,
        badgesCatalog,
        level: totalPoints >= 300 ? "Maître d'Élite 🏆" : totalPoints >= 200 ? "Élève Exemplaire ⭐" : "Élève Apprenant 📚",
      },
    });
  } catch (error: any) {
    console.error("[Badges API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement des badges", 500);
  }
}
