import { NextRequest, NextResponse } from "next/server";
import { submitAdmissionApplicationAction } from "@/domains/admissions/actions/admissions.actions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.studentFirstName?.trim() || !data.studentLastName?.trim() || !data.dateOfBirth) {
      return NextResponse.json(
        { error: "Veuillez renseigner toutes les informations obligatoires de l'élève (*)." },
        { status: 400 }
      );
    }

    if (!data.parentName?.trim() || (!data.parentPhone?.trim() && !data.candidatePhone?.trim())) {
      return NextResponse.json(
        { error: "Veuillez renseigner le nom et au moins un numéro de contact du tuteur ou du candidat (*)." },
        { status: 400 }
      );
    }

    const result = await submitAdmissionApplicationAction(data);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("❌ API /api/admissions/apply error:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur serveur lors de la soumission de la candidature." },
      { status: 500 }
    );
  }
}
