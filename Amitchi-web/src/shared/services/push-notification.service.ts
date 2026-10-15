import { db } from "@/infrastructure/database";
import { notifications, messageLogs } from "@/infrastructure/database/schema/messaging";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, inArray, sql } from "drizzle-orm";

export interface AbsencePushPayload {
  studentId: number;
  studentName: string;
  status: "Absent" | "En Retard";
  date: string;
  className?: string;
  subjectName?: string;
}

export interface HomeworkPushPayload {
  homeworkTitle: string;
  classId: number;
  className?: string;
  subjectName?: string;
  dateDue: string;
}

export interface BulletinPushPayload {
  studentId: number;
  studentName: string;
  className: string;
  average: number;
  rank: string;
  pdfUrl?: string | null;
  verifyToken?: string;
}

export class PushNotificationService {
  /**
   * Send Mobile Push & In-App Notification when a bulletin becomes available
   */
  static async sendBulletinAvailable(payload: BulletinPushPayload) {
    const { studentId, studentName, className, average, rank, pdfUrl, verifyToken } = payload;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://edut.app";
    const verifyUrl = verifyToken ? `${appUrl}/verify/bulletin/${verifyToken}` : null;

    const title = `📊 Bulletin disponible / كشف الدرجات متاح: ${studentName}`;
    const contentFr = `Le bulletin scolaire de ${studentName} (${className}) est disponible.${average ? ` Moyenne: ${average.toFixed(2)}/20` : ""}${rank && rank !== "-" ? ` · Rang: ${rank}` : ""}`;
    const contentAr = `أصبح كشف درجات الطالب ${studentName} (${className}) متاحاً.${average ? ` المعدل: ${average.toFixed(2)}/20` : ""}${rank && rank !== "-" ? ` · الترتيب: ${rank}` : ""}`;
    const fullContent = `${contentFr}\n${contentAr}`;

    try {
      // Insert in-app notification
      const studentUsers = await db.query.users.findMany({
        where: eq(users.studentId, studentId),
      });

      const notifValues = {
        title,
        content: fullContent,
        type: "success" as const,
        category: "Bulletin",
        isRead: false,
      };

      if (studentUsers.length > 0) {
        for (const u of studentUsers) {
          await db.insert(notifications).values({ ...notifValues, userId: u.id });
        }
      } else {
        await db.insert(notifications).values({ ...notifValues, userId: null });
      }

      // Log
      await db.insert(messageLogs).values({
        msgType: "PUSH_MOBILE",
        targetAudience: `Élève ID: ${studentId} (${studentName})`,
        subject: title,
        content: fullContent,
        recipientCount: 1,
        status: "Envoyé",
        sentBy: "Système Bulletin",
      });

      // Push Gateway
      await this.dispatchToPushGateway({
        title,
        body: contentFr,
        data: {
          category: "Bulletin",
          studentId,
          average,
          rank,
          pdfUrl: pdfUrl ?? null,
          verifyUrl: verifyUrl ?? null,
          action: "OPEN_BULLETIN",
        },
      });

      console.log(`[PUSH BULLETIN SENT] ${studentName}`);
    } catch (error) {
      console.error("Error sending bulletin push notification:", error);
    }
  }

  /**
   * Send Mobile Push & In-App Notification for Student Absence or Delay
   */
  static async sendAbsenceAlert(payload: AbsencePushPayload) {
    const { studentId, studentName, status, date, subjectName } = payload;

    const subText = subjectName ? ` (${subjectName})` : "";
    const isAbsent = status === "Absent";

    const title = isAbsent 
      ? `🚨 Alerte Absence / تنبيه غياب: ${studentName}`
      : `⏰ Alerte Retard / تنبيه تأخر: ${studentName}`;

    const contentFr = isAbsent
      ? `Le statut de ${studentName} a été enregistré comme ABSENT(E) le ${date}${subText}. Veuillez fournir un justificatif.`
      : `Le statut de ${studentName} a été enregistré comme EN RETARD le ${date}${subText}. Merci de veiller à la ponctualité.`;

    const contentAr = isAbsent
      ? `تم تسجيل الطالب(ة) ${studentName} غائباً بتاريخ ${date}${subText}. يرجى تقديم مبرر للغياب.`
      : `تم تسجيل الطالب(ة) ${studentName} متأخراً بتاريخ ${date}${subText}. يرجى الحرص على المواعيد.`;

    const fullContent = `${contentFr}\n${contentAr}`;

    try {
      // 1. Look up user account(s) associated with this student
      const studentUsers = await db.query.users.findMany({
        where: eq(users.studentId, studentId),
      });

      if (studentUsers.length > 0) {
        for (const u of studentUsers) {
          await db.insert(notifications).values({
            title,
            content: fullContent,
            type: isAbsent ? "warning" : "info",
            category: "Absence",
            userId: u.id,
            isRead: false,
          });
        }
      } else {
        // Fallback: If no dedicated student account exists yet, save with null
        await db.insert(notifications).values({
          title,
          content: fullContent,
          type: isAbsent ? "warning" : "info",
          category: "Absence",
          userId: null,
          isRead: false,
        });
      }

      // 2. Log in message_logs
      await db.insert(messageLogs).values({
        msgType: "PUSH_MOBILE",
        targetAudience: `Élève ID: ${studentId} (${studentName})`,
        subject: title,
        content: fullContent,
        recipientCount: 1,
        status: "Envoyé",
        sentBy: "Système Push Mobile",
      });

      // 3. Dispatch Push Notification Gateway (Expo / FCM API)
      await this.dispatchToPushGateway({
        title,
        body: contentFr,
        data: {
          category: "Absence",
          studentId,
          status,
          date,
        },
      });

      console.log(`[PUSH NOTIFICATION SENT] Absence alert for ${studentName}`);
    } catch (error) {
      console.error("Error sending absence push notification:", error);
    }
  }

  /**
   * Send Mobile Push & In-App Notification for New Homework Assignment
   */
  static async sendHomeworkAlert(payload: HomeworkPushPayload) {
    const { homeworkTitle, classId, className, subjectName, dateDue } = payload;
    const classLabel = className ? `Classe ${className}` : `Classe #${classId}`;
    const subjectLabel = subjectName || "Matière non spécifiée";

    const title = `📝 Nouveau Devoir / واجب منزلي جديد (${subjectLabel})`;

    const contentFr = `Un nouveau devoir a été attribué pour la ${classLabel} en ${subjectLabel} : "${homeworkTitle}". À rendre pour le ${dateDue}.`;
    const contentAr = `تمت إضافة واجب منزلي جديد لقسم ${classLabel} في مادة ${subjectLabel}: "${homeworkTitle}". التاريخ المستحق: ${dateDue}.`;

    const fullContent = `${contentFr}\n${contentAr}`;

    try {
      // 1. Insert DB Notification
      await db.insert(notifications).values({
        title,
        content: fullContent,
        type: "info",
        category: "Devoirs",
        userId: null, // Scoped via Mobile Notifications endpoint for class
        isRead: false,
      });

      // 2. Log in message_logs
      await db.insert(messageLogs).values({
        msgType: "PUSH_MOBILE",
        targetAudience: `Classe ID: ${classId} (${classLabel})`,
        subject: title,
        content: fullContent,
        recipientCount: 1,
        status: "Envoyé",
        sentBy: "Système Push Mobile",
      });

      // 3. Dispatch Push Notification Gateway (Expo / FCM API)
      await this.dispatchToPushGateway({
        title,
        body: contentFr,
        data: {
          category: "Devoirs",
          classId,
          dateDue,
        },
      });

      console.log(`[PUSH NOTIFICATION SENT] Homework alert for ${classLabel}: ${homeworkTitle}`);
    } catch (error) {
      console.error("Error sending homework push notification:", error);
    }
  }

  /**
   * Internal Helper: Dispatch HTTP Push Payload to Expo or FCM Gateway
   */
  private static async dispatchToPushGateway(payload: {
    title: string;
    body: string;
    data: Record<string, any>;
  }) {
    try {
      const expoPushUrl = process.env.EXPO_PUSH_GATEWAY_URL || "https://exp.host/--/api/v2/push/send";
      const fcmKey = process.env.FCM_SERVER_KEY;

      if (fcmKey) {
        // Send via FCM Legacy / HTTP V1 API
        await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${fcmKey}`,
          },
          body: JSON.stringify({
            to: "/topics/all_mobile_users",
            notification: {
              title: payload.title,
              body: payload.body,
              sound: "default",
            },
            data: payload.data,
          }),
        });
      } else {
        // Fallback or Expo Push API broadcast trigger
        await fetch(expoPushUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "ExponentPushToken[Broadcast_All]",
            title: payload.title,
            body: payload.body,
            data: payload.data,
            sound: "default",
          }),
        }).catch(() => null);
      }
    } catch (err) {
      console.warn("Push Gateway Dispatch Notice:", err);
    }
  }
}
