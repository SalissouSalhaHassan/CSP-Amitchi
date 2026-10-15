"use server";

import { db } from "@/infrastructure/database";
import {
  messageTemplates,
  messageLogs,
  scheduledMessages,
  notifications,
} from "@/infrastructure/database/schema/messaging";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq, desc, sql, count, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveEducationalLevel, getCompatibleLevels } from "@/domains/auth/services/rbac";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getMessageTemplates() {
  return protectedDbAction("Messaging", "canView", async () => {
    const data = await db.query.messageTemplates.findMany({
      orderBy: [desc(messageTemplates.createdAt)],
    });
    return { data };
  });
}

export async function saveMessageTemplate(data: {
  title: string;
  msgType: string;
  content: string;
  category?: string;
}) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    await db.insert(messageTemplates).values({
      title: data.title,
      msgType: data.msgType,
      content: data.content,
      category: data.category || "Général",
    });
    revalidatePath("/dashboard/messaging");
    return { success: true };
  });
}

export async function updateMessageTemplate(
  id: number,
  data: { title: string; msgType: string; content: string; category?: string }
) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    await db
      .update(messageTemplates)
      .set({
        title: data.title,
        msgType: data.msgType,
        content: data.content,
        category: data.category || "Général",
      })
      .where(eq(messageTemplates.id, id));
    revalidatePath("/dashboard/messaging");
    return { success: true };
  });
}

export async function deleteMessageTemplate(id: number) {
  return protectedDbAction("Messaging", "canDelete", async () => {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    revalidatePath("/dashboard/messaging");
    return { success: true };
  });
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(data: {
  msgType: string;
  targetAudience: string;
  content: string;
  subject?: string;
  recipientCount?: number;
  testRecipient?: string;
}) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    let sentCount = 0;
    
    // 1. If it's a test recipient, send directly
    if (data.testRecipient && data.testRecipient.trim() !== "") {
      const recipient = data.testRecipient.trim();
      if (data.msgType === "SMS") {
        await MessagingService["sendViaAndroidGateway"](recipient, data.content);
      } else if (data.msgType === "WhatsApp") {
        await MessagingService["sendViaWhatsAppAPI"](recipient, data.content);
      }
      sentCount = 1;
    } else {
      // 2. Fetch real numbers and send
      if (data.targetAudience === "Tous les Parents" || data.targetAudience === "Tous (Parents + Staff)") {
        const activeStudents = await db.query.students.findMany();
        for (const std of activeStudents) {
          const num = std.mobile;
          if (num && num !== "N/A" && num.trim() !== "") {
            if (data.msgType === "SMS") {
              await MessagingService["sendViaAndroidGateway"](num, data.content);
              sentCount++;
            } else if (data.msgType === "WhatsApp") {
              await MessagingService["sendViaWhatsAppAPI"](std.whatsapp || num, data.content);
              sentCount++;
            }
          }
        }
      }
      
      if (data.targetAudience === "Tout le Personnel" || data.targetAudience === "Tous (Parents + Staff)") {
        const activeStaff = await db.query.employees.findMany();
        for (const emp of activeStaff) {
          const num = emp.mobile;
          if (num && num !== "N/A" && num.trim() !== "") {
            if (data.msgType === "SMS") {
              await MessagingService["sendViaAndroidGateway"](num, data.content);
              sentCount++;
            } else if (data.msgType === "WhatsApp") {
              await MessagingService["sendViaWhatsAppAPI"](num, data.content);
              sentCount++;
            }
          }
        }
      }
    }

    await db.insert(messageLogs).values({
      msgType: data.msgType,
      targetAudience: data.targetAudience,
      subject: data.subject || null,
      content: data.content,
      recipientCount: sentCount || data.recipientCount || 0,
      status: "Envoyé",
      sentBy: "Admin",
    });

    revalidatePath("/dashboard/messaging");
    return { success: true, message: `Message envoyé avec succès à ${sentCount} destinataire(s) !` };
  });
}

// ─── Logs ────────────────────────────────────────────────────────────────────

export async function getMessageLogs() {
  return protectedDbAction("Messaging", "canView", async () => {
    const data = await db.query.messageLogs.findMany({
      orderBy: [desc(messageLogs.sentAt)],
      limit: 200,
    });
    return { data };
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getMessagingStats() {
  return protectedDbAction("Messaging", "canView", async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total logs
    const [totalSMS] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(eq(messageLogs.msgType, "SMS"));

    const [totalEmail] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(eq(messageLogs.msgType, "Email"));

    const [monthSMS] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(and(eq(messageLogs.msgType, "SMS"), gte(messageLogs.sentAt, startOfMonth)));

    const [monthEmail] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(and(eq(messageLogs.msgType, "Email"), gte(messageLogs.sentAt, startOfMonth)));

    const [todaySMS] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(and(eq(messageLogs.msgType, "SMS"), gte(messageLogs.sentAt, startOfToday)));

    const [todayEmail] = await db
      .select({ count: count() })
      .from(messageLogs)
      .where(and(eq(messageLogs.msgType, "Email"), gte(messageLogs.sentAt, startOfToday)));

    const [templateCount] = await db.select({ count: count() }).from(messageTemplates);

    // Audience counts
    const schoolId = await getActiveSchoolId();
    const [studentCount] = await db.select({ count: count() }).from(students).where(eq(students.schoolId, schoolId));
    const [staffCount] = await db.select({ count: count() }).from(employees).where(eq(employees.schoolId, schoolId));

    return {
      data: {
        totalSMS: totalSMS.count,
        totalEmail: totalEmail.count,
        monthSMS: monthSMS.count,
        monthEmail: monthEmail.count,
        todaySMS: todaySMS.count,
        todayEmail: todayEmail.count,
        templateCount: templateCount.count,
        studentCount: studentCount.count,
        staffCount: staffCount.count,
      },
    };
  });
}

// ─── Scheduled Messages ───────────────────────────────────────────────────────

export async function getScheduledMessages() {
  return protectedDbAction("Messaging", "canView", async () => {
    const data = await db.query.scheduledMessages.findMany({
      orderBy: [desc(scheduledMessages.scheduledAt)],
    });
    return { data };
  });
}

export async function scheduleMessage(data: {
  msgType: string;
  targetAudience: string;
  content: string;
  subject?: string;
  scheduledAt: string;
}) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    await db.insert(scheduledMessages).values({
      msgType: data.msgType,
      targetAudience: data.targetAudience,
      subject: data.subject || null,
      content: data.content,
      scheduledAt: new Date(data.scheduledAt),
      status: "En attente",
      createdBy: "Admin",
    });
    revalidatePath("/dashboard/messaging");
    return { success: true };
  });
}

export async function cancelScheduledMessage(id: number) {
  return protectedDbAction("Messaging", "canEdit", async () => {
    await db
      .update(scheduledMessages)
      .set({ status: "Annulé" })
      .where(eq(scheduledMessages.id, id));
    revalidatePath("/dashboard/messaging");
    return { success: true };
  });
}

export async function sendBulkPaymentReminders() {
  return protectedDbAction("Messaging", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeLevel = await getActiveEducationalLevel(user);

    // Get active session
    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
    });

    if (!activeSession) {
      return { success: false, error: "Aucune session active trouvée" };
    }

    // Query student fees with balance > 0
    let whereClause = and(
      eq(studentFees.schoolId, schoolId),
      eq(studentFees.sessionId, activeSession.id),
      sql`${studentFees.balance} > 0`
    );

    const unpaidFees = await db.query.studentFees.findMany({
      where: whereClause,
      with: {
        student: true
      }
    });

    let filteredFees = unpaidFees;

    // Filter by educationalLevel if activeLevel is restricted
    if (activeLevel && activeLevel !== "Tous" && activeLevel !== "All" && activeLevel !== "") {
      const compatibleLevels = getCompatibleLevels(activeLevel).map(l => l.toLowerCase());
      filteredFees = unpaidFees.filter(f => 
        f.student && f.student.educationalLevel &&
        compatibleLevels.includes(f.student.educationalLevel.toLowerCase())
      );
    }

    let sentCount = 0;
    for (const fee of filteredFees) {
      if (fee.student && (fee.student.mobile || fee.student.whatsapp)) {
        await MessagingService.sendPaymentReminder({
          to: fee.student.mobile || "",
          whatsapp: fee.student.whatsapp || fee.student.mobile || "",
          studentName: fee.student.nomEtudiant,
          balance: fee.balance || 0,
          sendSMS: true,
          sendWhatsApp: true
        });
        sentCount++;
      }
    }

    // Insert a notification for the admin who sent the alerts
    if (sentCount > 0) {
      await db.insert(notifications).values({
        title: "Relances de paiement envoyées",
        content: `${sentCount} relances de paiement ont été envoyées aux parents par SMS/WhatsApp.`,
        type: "success",
        category: "Finance",
        userId: user.id
      });
    }

    revalidatePath("/dashboard/messaging");
    revalidatePath("/dashboard/notifications");
    return { success: true, count: sentCount };
  });
}
