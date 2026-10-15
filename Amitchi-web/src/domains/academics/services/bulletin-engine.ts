import { db } from "@/infrastructure/database";
import { bulletinRecords } from "@/infrastructure/database/schema/academics";
import { users } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PushNotificationService } from "@/shared/services/push-notification.service";

export interface BulletinStudentData {
  studentId: number;
  student: any;
  session: string;
  term: string;
  results: any[];
  summary: any;
  summaryS1?: any;
  summaryS2?: any;
  totalStudents: number;
  branchInfo: any;
  headerConfig: any;
}

export interface BatchOptions {
  classId: number;
  periodId?: number;
  sessionId?: number;
  schoolId: number;
  period: string;
  mergeIntoPdf?: boolean;
  uploadToStorage?: boolean;
  notifyWhatsapp?: boolean;
  notifyPush?: boolean;
  generatedBy?: string;
  language?: "FR" | "AR";
}

export interface BatchStudentResult {
  studentId: number;
  studentName: string;
  success: boolean;
  verifyToken?: string;
  pdfUrl?: string;
  whatsappSent?: boolean;
  pushSent?: boolean;
  error?: string;
}

export interface BatchResult {
  generated: number;
  failed: number;
  results: BatchStudentResult[];
}

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey);
}

async function uploadBulletinPDF(
  pdfBuffer: Buffer,
  schoolId: number,
  sessionId: number | undefined,
  classId: number,
  studentId: number,
  period: string
): Promise<{ pdfUrl: string | null; pdfPath: string | null }> {
  try {
    const supabase = getStorageClient();
    const sanitizedPeriod = period.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const timestamp = Date.now();
    const pdfPath = `bulletins/${schoolId}/${sessionId ?? "session"}/${classId}/${studentId}_${sanitizedPeriod}_${timestamp}.pdf`;

    const { error } = await supabase.storage
      .from("bulletins")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (error) {
      console.warn("[BulletinEngine] Storage upload warning:", error.message);
      return { pdfUrl: null, pdfPath: null };
    }

    const { data: signedData } = await supabase.storage
      .from("bulletins")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 365);

    return { pdfUrl: signedData?.signedUrl ?? null, pdfPath };
  } catch (err) {
    console.warn("[BulletinEngine] Storage error:", err);
    return { pdfUrl: null, pdfPath: null };
  }
}

async function sendBulletinWhatsApp(opts: {
  recipientPhone: string;
  recipientName: string;
  studentName: string;
  className: string;
  averageScore: string;
  rank: string;
  pdfUrl?: string | null;
  language?: string;
}): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res = await fetch(`${appUrl}/api/mobile/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bulletin",
        recipientPhone: opts.recipientPhone,
        recipientName: opts.recipientName,
        studentName: opts.studentName,
        className: opts.className,
        averageScore: opts.averageScore,
        rank: opts.rank,
        pdfUrl: opts.pdfUrl,
        language: opts.language ?? "FR",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export class BulletinEngine {
  static async generateBatch(
    bulletinsData: BulletinStudentData[],
    opts: BatchOptions
  ): Promise<BatchResult> {
    const { generateBulletinBlob } = await import("@/domains/academics/utils/bulletin-generator");

    const results: BatchStudentResult[] = [];
    let generated = 0;
    let failed = 0;

    for (const bulletinData of bulletinsData) {
      const { studentId, student } = bulletinData;
      const studentName = student?.nomEtudiant || student?.name || `Élève #${studentId}`;

      try {
        const verifyToken = randomUUID().replace(/-/g, "");

        const pdfBlob = await generateBulletinBlob({ ...bulletinData, verifyToken });

        let pdfUrl: string | null = null;
        let pdfPath: string | null = null;

        if (opts.uploadToStorage) {
          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
          const uploadResult = await uploadBulletinPDF(
            pdfBuffer, opts.schoolId, opts.sessionId, opts.classId, studentId, opts.period
          );
          pdfUrl = uploadResult.pdfUrl;
          pdfPath = uploadResult.pdfPath;
        }

        const average = bulletinData.summary?.average ?? 0;
        const rank = bulletinData.summary?.rank ?? "-";
        const decision = bulletinData.summary?.decision ?? "";

        await db.insert(bulletinRecords).values({
          schoolId: opts.schoolId,
          studentId,
          classId: opts.classId,
          sessionId: opts.sessionId,
          periodId: opts.periodId,
          period: opts.period,
          average,
          rank: String(rank),
          totalStudents: bulletinData.totalStudents,
          decision,
          pdfUrl,
          pdfPath,
          verifyToken,
          status: "validé",
          whatsappSent: false,
          pushSent: false,
          generatedBy: opts.generatedBy ?? "Systeme",
        }).onConflictDoNothing();

        let whatsappSent = false;
        if (opts.notifyWhatsapp) {
          const parentUsers = await db.query.users.findMany({ where: eq(users.studentId, studentId) });
          const parentPhone = (student as any)?.whatsapp || (student as any)?.mobile || (parentUsers as any[])?.find((u: any) => u.phone || u.whatsapp)?.phone;
          const parentName = (student as any)?.nomPere || (parentUsers as any[])?.[0]?.nomPrenom || "Parent";

          if (parentPhone) {
            whatsappSent = await sendBulletinWhatsApp({
              recipientPhone: parentPhone,
              recipientName: parentName,
              studentName,
              className: student?.classe ?? student?.className ?? "-",
              averageScore: typeof average === "number" ? average.toFixed(2) : String(average),
              rank: String(rank),
              pdfUrl,
              language: opts.language ?? "FR",
            });
            if (whatsappSent) {
              await db.update(bulletinRecords).set({ whatsappSent: true }).where(eq(bulletinRecords.verifyToken, verifyToken));
            }
          }
        }

        let pushSent = false;
        if (opts.notifyPush) {
          try {
            await PushNotificationService.sendBulletinAvailable({
              studentId,
              studentName,
              className: student?.classe ?? "-",
              average: typeof average === "number" ? average : parseFloat(String(average)) || 0,
              rank: String(rank),
              pdfUrl,
              verifyToken,
            });
            pushSent = true;
            await db.update(bulletinRecords).set({ pushSent: true }).where(eq(bulletinRecords.verifyToken, verifyToken));
          } catch {}
        }

        results.push({ studentId, studentName, success: true, verifyToken, pdfUrl: pdfUrl ?? undefined, whatsappSent, pushSent });
        generated++;
      } catch (err: any) {
        console.error(`[BulletinEngine] Failed for student ${studentId}:`, err);
        results.push({ studentId, studentName, success: false, error: err?.message ?? "Erreur inconnue" });
        failed++;
      }
    }

    return { generated, failed, results };
  }

  static async getBulletinByToken(token: string) {
    return db.query.bulletinRecords.findFirst({
      where: eq(bulletinRecords.verifyToken, token),
      with: { student: true, class: true, session: true },
    }).catch(() => null);
  }

  static async listBulletinsForStudent(studentId: number) {
    return db.query.bulletinRecords.findMany({
      where: eq(bulletinRecords.studentId, studentId),
      orderBy: (t: any, { desc }: any) => [desc(t.generatedAt)],
    });
  }

  static async listBulletinsForClass(classId: number, period?: string) {
    const records = await db.query.bulletinRecords.findMany({
      where: eq(bulletinRecords.classId, classId),
      with: { student: true },
      orderBy: (t: any, { desc }: any) => [desc(t.generatedAt)],
    });
    return period ? records.filter((r: any) => r.period === period) : records;
  }
}
