import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import {
  canteenMealSubscriptions,
  studentWallets,
  canteenWeeklyMenu,
  canteenMealConsumptions,
} from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAYS_MAP: { [key: number]: string } = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam ? Number(studentIdParam) : (user as any).studentId;

  if (!studentId) {
    return mobileJsonError("studentId manquant.", 400);
  }

  try {
    const today = new Date();
    const todayDayName = DAYS_MAP[today.getDay()] || "Lundi";
    const todayStr = today.toISOString().slice(0, 10);

    const [student, subscription, wallet, todayMenu, recentLogs] = await Promise.all([
      readDb.query.students.findFirst({
        where: eq(students.id, studentId),
      }),
      readDb.query.canteenMealSubscriptions.findFirst({
        where: and(
          eq(canteenMealSubscriptions.studentId, studentId),
          eq(canteenMealSubscriptions.status, "Actif")
        ),
      }),
      readDb.query.studentWallets.findFirst({
        where: eq(studentWallets.studentId, studentId),
      }),
      readDb.query.canteenWeeklyMenu.findFirst({
        where: eq(canteenWeeklyMenu.dayOfWeek, todayDayName),
        orderBy: [desc(canteenWeeklyMenu.createdAt)],
      }),
      readDb.query.canteenMealConsumptions.findMany({
        where: eq(canteenMealConsumptions.studentId, studentId),
        orderBy: [desc(canteenMealConsumptions.servedAt)],
        limit: 15,
      }),
    ]);

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.nomEtudiant,
        class: student.classe,
        admissionNo: student.numAdmission,
      },
      isSubscribed: !!subscription,
      subscription: subscription
        ? {
            id: subscription.id,
            planType: subscription.planType,
            monthlyPrice: subscription.monthlyPrice,
            specialDiet: subscription.specialDiet,
            allergiesNotice: subscription.allergiesNotice,
            status: subscription.status,
          }
        : null,
      wallet: {
        balance: wallet ? Number(wallet.balance) : 0,
        dailySpendingLimit: wallet ? Number(wallet.dailySpendingLimit || 2000) : 2000,
        isLocked: wallet ? wallet.isLocked : false,
      },
      todayMenu: todayMenu
        ? {
            id: todayMenu.id,
            dayOfWeek: todayMenu.dayOfWeek,
            mealType: todayMenu.mealType,
            starterDish: todayMenu.starterDish,
            mainDish: todayMenu.mainDish,
            sideDish: todayMenu.sideDish,
            dessert: todayMenu.dessert,
            allergens: todayMenu.allergens,
            calories: todayMenu.calories,
          }
        : null,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        mealType: l.mealType,
        menuDescription: l.menuDescription,
        servedAt: l.servedAt,
        allergyWarningTriggered: l.allergyWarningTriggered,
        costDeducted: l.costDeducted,
      })),
    });
  } catch (error: any) {
    console.error("[Mobile Canteen Student Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur", 500);
  }
}
