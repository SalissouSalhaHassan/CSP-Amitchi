import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/infrastructure/database";
import { admissionApplications } from "@/infrastructure/database/schema/admissions";
import { eq, or, desc } from "drizzle-orm";
import { mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const appNumber = searchParams.get("applicationNumber");

  if (!phone && !appNumber) {
    return mobileJsonError("Veuillez fournir un numéro de téléphone ou un numéro de dossier.", 400);
  }

  try {
    const conditions = [];
    if (appNumber) {
      conditions.push(eq(admissionApplications.applicationNumber, appNumber.trim().toUpperCase()));
    }
    if (phone) {
      const cleanPhone = phone.trim();
      conditions.push(
        or(
          eq(admissionApplications.parentPhone, cleanPhone),
          eq(admissionApplications.candidatePhone, cleanPhone),
          eq(admissionApplications.parentWhatsapp, cleanPhone),
          eq(admissionApplications.candidateWhatsapp, cleanPhone)
        )
      );
    }

    const applications = await readDb.query.admissionApplications.findMany({
      where: or(...conditions),
      orderBy: [desc(admissionApplications.createdAt)],
      limit: 20,
    });

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error: any) {
    console.error("[Mobile Admissions Status Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la recherche des dossiers", 500);
  }
}

