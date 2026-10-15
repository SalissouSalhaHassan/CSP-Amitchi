import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { settings } from "@/infrastructure/database/schema/settings";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { cache as redisCache } from "@/lib/redis";
import {
  DOCUMENT_HEADER_SETTING_KEY,
  mergeDocumentHeaderConfig,
  type DocumentHeaderConfig,
} from "@/domains/printing/document-header";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const activeSchoolId = await getActiveSchoolId().catch(() => null);
    const schoolId = user?.schoolId || activeSchoolId || 9;

    const body = (await request.json()) as Partial<DocumentHeaderConfig>;
    const cleanConfig = mergeDocumentHeaderConfig(body);
    const value = JSON.stringify(cleanConfig);

    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      ),
    });

    if (existing) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key: DOCUMENT_HEADER_SETTING_KEY,
        value,
        schoolId,
      });
    }

    // Invalidate Redis cache
    try {
      await redisCache.del(`edut:header_config:${schoolId}`);
    } catch (_) {}

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/dashboard/settings/headers");
      revalidatePath("/dashboard/campus-setup");
      revalidatePath("/dashboard/settings");
    } catch (_) {}

    return NextResponse.json({ success: true, data: cleanConfig });
  } catch (error: any) {
    console.error("[API /api/settings/headers] Error saving config:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'enregistrement de l'en-tête", success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const activeSchoolId = await getActiveSchoolId().catch(() => null);
    const schoolId = user?.schoolId || activeSchoolId || 9;

    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      ),
    });

    let configData = mergeDocumentHeaderConfig();
    if (existing?.value) {
      try {
        configData = mergeDocumentHeaderConfig(JSON.parse(existing.value));
      } catch (_) {}
    }

    return NextResponse.json({ success: true, data: configData });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur interne", success: false },
      { status: 500 }
    );
  }
}
