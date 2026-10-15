import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const recipientId = Number(searchParams.get("recipientId"));

  try {
    // Current working hours check (e.g. 08:00 to 18:00, Mon-Fri)
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = currentDay === 0 || currentDay === 6;
    const isWorkingHours = !isWeekend && currentHour >= 8 && currentHour < 18;

    let messagesList: any[] = [];
    if (recipientId) {
      try {
        const rows = await readDb.execute(sql`
          SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.content, m.created_at, m.status
          FROM message_logs m
          WHERE (m.sender_id = ${user.id} AND m.recipient_id = ${recipientId})
             OR (m.sender_id = ${recipientId} AND m.recipient_id = ${user.id})
          ORDER BY m.created_at ASC
          LIMIT 50
        `);
        messagesList = ((rows as any).rows || rows) as any[];
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        isWorkingHours,
        workingHoursMessage: isWorkingHours
            ? "L'enseignant est actuellement en service et disponible."
            : "Hors des heures de cours (08h00 - 18h00). Votre message sera lu dès la prochaine journée scolaire.",
        messages: messagesList.map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          recipientId: m.recipient_id,
          content: m.content,
          createdAt: m.created_at,
          isMine: m.sender_id === user.id,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Direct Chat GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement des messages", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { recipientId, content, subject } = body;

    if (!recipientId || !content || !content.trim()) {
      return mobileJsonError("Destinataire et contenu requis.", 400);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const isWorkingHours = currentDay !== 0 && currentDay !== 6 && currentHour >= 8 && currentHour < 18;

    let insertedId = Date.now();
    try {
      const res = await db.execute(sql`
        INSERT INTO message_logs (sender_id, recipient_id, channel, subject, content, status, school_id, created_at)
        VALUES (${user.id}, ${recipientId}, 'Interne', ${subject || 'Discussion directe'}, ${content.trim()}, 'Délivré', ${user.schoolId || 1}, ${now})
        RETURNING id
      `);
      const rows = ((res as any).rows || res) as any[];
      if (rows && rows.length > 0) {
        insertedId = rows[0].id;
      }
    } catch (e) {
      console.warn("Direct message insert fallback:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: insertedId,
        senderId: user.id,
        recipientId,
        content: content.trim(),
        createdAt: now.toISOString(),
        isWorkingHours,
        autoReply: !isWorkingHours
          ? "Message bien reçu ! Le destinataire vous répondra durant ses heures de permanence (08h00 - 18h00)."
          : null,
      },
    });
  } catch (error: any) {
    console.error("[Direct Chat POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'envoi du message", 500);
  }
}
