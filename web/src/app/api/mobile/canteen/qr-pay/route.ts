import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { studentWallets, canteenMealConsumptions } from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, amount = 1000, itemDescription = "Repas / Snack Cantine" } = body;

    if (!studentId) {
      return mobileJsonError("studentId requis pour le paiement QR.", 400);
    }

    const schoolId = user.schoolId || 1;

    // 1. Fetch Student & Wallet
    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, Number(studentId)),
    });

    const currentBalance = wallet ? wallet.balance : 0;
    if (wallet && wallet.isLocked) {
      return mobileJsonError("Portefeuille bloqué par la direction ou le parent.", 403);
    }

    if (currentBalance < amount) {
      return mobileJsonError(
        `Solde insuffisant (${currentBalance.toLocaleString("fr-FR")} FCFA contre ${amount.toLocaleString("fr-FR")} FCFA requis).`,
        400
      );
    }

    // 2. Deduct cost
    if (wallet) {
      await db
        .update(studentWallets)
        .set({
          balance: currentBalance - amount,
          updatedAt: new Date(),
        })
        .where(eq(studentWallets.id, wallet.id));
    }

    // 3. Log consumption
    const today = new Date().toISOString().split("T")[0];
    const [consumption] = await db
      .insert(canteenMealConsumptions)
      .values({
        schoolId,
        studentId: Number(studentId),
        mealType: "Achat Direct POS / QR",
        consumptionDate: today,
        servedAt: new Date(),
        menuDescription: itemDescription,
        costDeducted: amount,
        parentNotified: true,
      })
      .returning({ id: canteenMealConsumptions.id });

    return NextResponse.json({
      success: true,
      message: "Paiement sans contact validé avec succès !",
      data: {
        studentName: (student as any).nomEtudiant || "Élève",
        matricule: (student as any).numAdmission || `MAT-${student.id}`,
        amountDeducted: amount,
        newBalance: currentBalance - amount,
        transactionId: `PAY-${consumption?.id || Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Canteen QR Pay Error]:", error);
    return mobileJsonError(error?.message || "Erreur de paiement QR", 500);
  }
}
