import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  if (!user.schoolId) {
    return mobileJsonError("Utilisateur non rattaché à un établissement.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { queueId, mediaType, entityId, fileName, fileBase64 } = body;

    // Handle offline media confirmation
    const fileUrl = `/uploads/schools/${user.schoolId}/${mediaType}/${fileName || `${queueId}.jpg`}`;

    return NextResponse.json({
      success: true,
      queueId,
      mediaType,
      entityId,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Media Upload Route Error:", error);
    return mobileJsonError(error.message || "Erreur de traitement du fichier média.", 500);
  }
}
