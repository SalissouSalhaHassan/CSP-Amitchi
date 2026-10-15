import { NextRequest, NextResponse } from "next/server";
import { submitAdmissionApplicationAction } from "@/domains/admissions/actions/admissions.actions";
import { mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentFirstName,
      studentLastName,
      dateOfBirth,
      targetClass,
      degreeProgram,
      parentName,
      parentPhone,
      candidatePhone,
    } = body;

    if (!studentFirstName?.trim() || !studentLastName?.trim() || !dateOfBirth?.trim()) {
      return mobileJsonError(
        "Champs requis manquants de l'élève (Prénom, Nom, Date de naissance).",
        400
      );
    }

    const effectiveClass = targetClass?.trim() || degreeProgram?.trim();
    if (!effectiveClass) {
      return mobileJsonError("Veuillez sélectionner une classe ou une filière d'admission.", 400);
    }

    const effectivePhone = parentPhone?.trim() || candidatePhone?.trim();
    if (!parentName?.trim() || !effectivePhone) {
      return mobileJsonError(
        "Veuillez renseigner le nom du responsable et au moins un numéro de contact (*).",
        400
      );
    }

    const res = await submitAdmissionApplicationAction({
      ...body,
      schoolId: body.schoolId ? Number(body.schoolId) : 1,
      targetClass: effectiveClass,
      parentPhone: parentPhone?.trim() || effectivePhone,
    });

    if (res.error) {
      return mobileJsonError(res.error, 400);
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[Mobile Admissions Apply Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur lors de la soumission", 500);
  }
}

