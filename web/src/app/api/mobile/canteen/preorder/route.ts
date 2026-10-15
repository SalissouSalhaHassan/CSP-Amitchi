import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { studentWallets, canteenMealConsumptions } from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, menuId, menuDescription, mealDate, price = 1200 } = body;

    const targetStudentId = studentId ? Number(studentId) : user.studentId;
    if (!targetStudentId || !mealDate) {
      return mobileJsonError("studentId et mealDate sont requis.", 400);
    }

    const schoolId = user.schoolId || 1;

    // 1. Fetch Student Wallet
    const wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, targetStudentId),
    });

    if (wallet && wallet.isLocked) {
      return mobileJsonError("Le portefeuille de l'élève est temporairement verrouillé.", 403);
    }

    const currentBalance = wallet ? wallet.balance : 0;
    if (currentBalance < price) {
      return mobileJsonError(
        `Solde insuffisant (${currentBalance.toLocaleString("fr-FR")} FCFA). Veuillez recharger le portefeuille.`,
        400
      );
    }

    // 2. Deduct from wallet
    if (wallet) {
      await db
        .update(studentWallets)
        .set({
          balance: currentBalance - price,
          updatedAt: new Date(),
        })
        .where(eq(studentWallets.id, wallet.id));
    }

    // 3. Record consumption
    const [record] = await db
      .insert(canteenMealConsumptions)
      .values({
        schoolId,
        studentId: targetStudentId,
        mealType: "Déjeuner",
        consumptionDate: mealDate,
        servedAt: new Date(),
        menuDescription: menuDescription || "Repas commandé d'avance",
        costDeducted: price,
        parentNotified: true,
      })
      .returning({ id: canteenMealConsumptions.id });

    return NextResponse.json({
      success: true,
      message: "Repas commandé avec succès !",
      data: {
        orderId: record?.id,
        mealDate,
        costDeducted: price,
        remainingBalance: currentBalance - price,
      },
    });
  } catch (error: any) {
    console.error("[Canteen Preorder Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la commande du repas", 500);
  }
}
