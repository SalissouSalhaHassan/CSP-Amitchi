import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const criteria = [
    {
      id: "teachingQuality",
      title: "Qualité de l'enseignement & Pédagogie",
      description: "Niveau des cours, suivi des devoirs et disponibilité des professeurs.",
      icon: "school",
    },
    {
      id: "transport",
      title: "Transport Scolaire & Ponctualité",
      description: "Respect des horaires, sécurité des bus et suivi GPS en direct.",
      icon: "directions_bus",
    },
    {
      id: "canteen",
      title: "Restauration & Cantine Scolaire",
      description: "Qualité et équilibre des repas, hygiène et service.",
      icon: "restaurant",
    },
    {
      id: "cleanliness",
      title: "Hygiène, Propreté & Cadre de Vie",
      description: "Propreté des salles, cours de récréation et sécurité de l'enceinte.",
      icon: "cleaning_services",
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      surveyTitle: "Baromètre Trimestriel de Satisfaction Scolaire",
      surveyDescription: "Votre avis compte pour continuer d'élever les standards de notre établissement.",
      period: "Année Scolaire 2025 - 2026",
      criteria,
    },
  });
}
