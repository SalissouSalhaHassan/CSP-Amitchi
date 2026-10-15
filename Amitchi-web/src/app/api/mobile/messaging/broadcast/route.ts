import { NextRequest, NextResponse } from "next/server";
import { db, readDb } from "@/infrastructure/database";
import { notifications, messageLogs } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      title,
      content,
      channel = "ALL", // "ALL", "PUSH", "WHATSAPP", "SMS"
      category = "Général",
      targetAudience = "Tous les parents",
      recipientCount = 1,
      type = "info", // "info", "warning", "success"
    } = body;

    if (!title || !content) {
      return mobileJsonError("Titre et contenu obligatoires.", 400);
    }

    // 1. Insert Push Notification into Database
    await db.insert(notifications).values({
      title,
      content,
      category,
      type,
      isRead: false,
    });

    // 2. Log into Message Logs
    await db.insert(messageLogs).values({
      msgType: channel,
      targetAudience,
      subject: title,
      content,
      recipientCount: Number(recipientCount || 1),
      status: "Envoyé",
      sentBy: (user as any).email || user.utilisateur || "Direction",
    });

    return NextResponse.json({
      success: true,
      message: "Diffusion envoyée avec succès sur tous les canaux sélectionnés !",
    });
  } catch (error: any) {
    console.error("[Broadcast API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de diffusion", 500);
  }
}
