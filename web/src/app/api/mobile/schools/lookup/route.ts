import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq, ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const schoolList = await db.query.schools.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        logoPath: true,
        plan: true,
        status: true,
      },
      limit: 20,
    });

    const formattedList = schoolList.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.slug,
      slug: s.slug,
      subdomain: s.slug,
      city: "Niamey",
      country: "Niger",
      logoUrl: s.logoPath,
      plan: s.plan,
      status: s.status,
    }));

    return NextResponse.json({
      success: true,
      data: formattedList,
    });
  } catch (error: any) {
    console.error("[Schools Lookup API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de recherche des écoles." },
      { status: 500 }
    );
  }
}
