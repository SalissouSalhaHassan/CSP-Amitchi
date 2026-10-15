"use server";

import { db } from "@/infrastructure/database";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { eq, desc, and, isNull, or, count, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType } from "@/domains/auth/services/rbac";

// Get notifications for current user (strictly personalized: private to user + general public broadcasts)
export async function getNotifications() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non connecté" };
    }

    const roleType = await getUserRoleType(user);
    const isStudentOrParent = roleType === "eleve" || roleType === "parent";

    // For students and parents: only their direct notifications, or public general broadcasts
    const userFilter = isStudentOrParent
      ? or(
          eq(notifications.userId, user.id),
          and(
            isNull(notifications.userId),
            notInArray(notifications.category, ["Absence", "Retard", "Finance", "Discipline"])
          )
        )
      : or(eq(notifications.userId, user.id), isNull(notifications.userId));

    const data = await db.query.notifications.findMany({
      where: userFilter,
      orderBy: [desc(notifications.createdAt)],
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Error getting notifications:", error);
    return { success: false, error: error.message || "Erreur interne" };
  }
}

import { cache } from "react";

// Get unread notifications count for current user
export const getUnreadNotificationsCount = cache(async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const roleType = await getUserRoleType(user);
    const isStudentOrParent = roleType === "eleve" || roleType === "parent";

    const userFilter = isStudentOrParent
      ? or(
          eq(notifications.userId, user.id),
          and(
            isNull(notifications.userId),
            notInArray(notifications.category, ["Absence", "Retard", "Finance", "Discipline"])
          )
        )
      : or(eq(notifications.userId, user.id), isNull(notifications.userId));

    const res = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.isRead, false),
          userFilter
        )
      );

    return res[0]?.count || 0;
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    return 0;
  }
});

// Mark a single notification as read
export async function markAsRead(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté" };

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          or(
            eq(notifications.userId, user.id),
            isNull(notifications.userId)
          )
        )
      );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message || "Erreur interne" };
  }
}

// Mark all notifications as read
export async function markAllAsRead() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté" };

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.isRead, false),
          or(
            eq(notifications.userId, user.id),
            isNull(notifications.userId)
          )
        )
      );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message || "Erreur interne" };
  }
}

// Delete a single notification
export async function deleteNotification(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté" };

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          or(
            eq(notifications.userId, user.id),
            isNull(notifications.userId)
          )
        )
      );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return { success: false, error: error.message || "Erreur interne" };
  }
}

// Clear all notifications
export async function clearAllNotifications() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non connecté" };

    await db
      .delete(notifications)
      .where(
        or(
          eq(notifications.userId, user.id),
          isNull(notifications.userId)
        )
      );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error clearing notifications:", error);
    return { success: false, error: error.message || "Erreur interne" };
  }
}

// Create a new notification (Requires Messaging canEdit permissions)
export async function createNotification(data: {
  title: string;
  content: string;
  type: string;
  category: string;
  userId?: number;
}) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    await db.insert(notifications).values({
      title: data.title,
      content: data.content,
      type: data.type,
      category: data.category,
      userId: data.userId || null,
      isRead: false,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  });
}
