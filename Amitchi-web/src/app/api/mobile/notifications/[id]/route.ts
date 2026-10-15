import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/infrastructure/database";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return mobileJsonError("Notification invalide.", 400);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, id),
        or(eq(notifications.userId, user.id), isNull(notifications.userId))
      )
    );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return mobileJsonError("Notification invalide.", 400);

  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, id),
        or(eq(notifications.userId, user.id), isNull(notifications.userId))
      )
    );

  return NextResponse.json({ success: true });
}
