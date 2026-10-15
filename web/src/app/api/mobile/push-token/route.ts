import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { db } from "@/infrastructure/database";
import { messageLogs } from "@/infrastructure/database/schema/messaging";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/push-token
 * Registers or updates a mobile device push token (FCM / Expo Push Token)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await getMobileUser(request);
    if (response || !user) return response || mobileJsonError("Non autorisé", 401);

    const body = await request.json();
    const { pushToken, deviceType = "Android/iOS" } = body;

    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Le paramètre pushToken est requis" },
        { status: 400 }
      );
    }

    const userLabel = user.utilisateur || `User #${user.id}`;

    // Log device token registration
    await db.insert(messageLogs).values({
      msgType: "PUSH_TOKEN_REGISTRATION",
      targetAudience: `User ID: ${user.id} (${userLabel})`,
      subject: `Token enregistre: ${deviceType}`,
      content: pushToken,
      recipientCount: 1,
      status: "Actif",
      sentBy: "Application Mobile Flutter",
    });

    console.log(`[PUSH TOKEN REGISTERED] User ${user.id} (${userLabel}): ${pushToken.slice(0, 20)}...`);

    return NextResponse.json({
      success: true,
      message: "Push token enregistré avec succès",
    });
  } catch (error: any) {
    console.error("Error registering push token:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
