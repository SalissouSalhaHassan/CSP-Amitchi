"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  canteenItems,
  studentWallets,
  canteenTransactions,
  canteenInvoices,
  canteenWeeklyMenu,
  canteenMealSubscriptions,
  canteenMealConsumptions,
} from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { studentMedicalRecords } from "@/infrastructure/database/schema/health";
import { schoolBranches, settings } from "@/infrastructure/database/schema/settings";
import { schools } from "@/infrastructure/database/schema/auth";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { MessagingService } from "@/shared/services/messaging.service";

export async function getActiveSchoolProfile() {
  return protectedDbAction("Canteen", "canView", async () => {
    try {
      const schoolId = await getActiveSchoolId();

      const branch = await db.query.schoolBranches
        .findFirst({
          where: eq(schoolBranches.schoolId, schoolId),
        })
        .catch(() => null);

      if (branch && branch.branchName) {
        return { data: { schoolName: branch.branchName } };
      }

      const school = await db.query.schools
        .findFirst({
          where: eq(schools.id, schoolId),
        })
        .catch(() => null);

      if (school && school.name) {
        return { data: { schoolName: school.name } };
      }

      const nameSetting = await db.query.settings
        .findFirst({
          where: and(eq(settings.key, "school_name"), eq(settings.schoolId, schoolId)),
        })
        .catch(() => null);

      if (nameSetting?.value) {
        return { data: { schoolName: nameSetting.value } };
      }
    } catch (e) {
      console.error("School profile fetch error:", e);
    }
    return { data: { schoolName: "Établissement Scolaire" } };
  });
}

// ─── 1. Dashboard KPI Statistics ─────────────────────────────────────────────

export async function getCanteenDashboardStats() {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const todayStr = new Date().toISOString().slice(0, 10);

    const [subsCount, mealsTodayCount, walletsRes, itemsCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(canteenMealSubscriptions)
        .where(
          and(
            schoolId ? eq(canteenMealSubscriptions.schoolId, schoolId) : undefined,
            eq(canteenMealSubscriptions.status, "Actif")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(canteenMealConsumptions)
        .where(
          and(
            schoolId ? eq(canteenMealConsumptions.schoolId, schoolId) : undefined,
            eq(canteenMealConsumptions.consumptionDate, todayStr)
          )
        ),
      db
        .select({
          totalBalance: sql<number>`coalesce(sum(balance), 0)`,
          lowBalanceCount: sql<number>`count(case when balance < 2000 then 1 end)`,
        })
        .from(studentWallets)
        .where(schoolId ? eq(studentWallets.schoolId, schoolId) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(canteenItems)
        .where(schoolId ? eq(canteenItems.schoolId, schoolId) : undefined),
    ]);

    return {
      activeSubscriptions: Number(subsCount[0]?.count || 0),
      mealsServedToday: Number(mealsTodayCount[0]?.count || 0),
      totalWalletBalance: Number(walletsRes[0]?.totalBalance || 0),
      lowBalanceCount: Number(walletsRes[0]?.lowBalanceCount || 0),
      totalMenuItems: Number(itemsCount[0]?.count || 0),
    };
  });
}

// ─── 2. Weekly Menu Planning ─────────────────────────────────────────────────

export async function getWeeklyMenuAction(weekStartDate?: string) {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    // Default to Monday of current week if not provided
    let targetWeek = weekStartDate;
    if (!targetWeek) {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      targetWeek = monday.toISOString().slice(0, 10);
    }

    const items = await readDb.query.canteenWeeklyMenu.findMany({
      where: and(
        eq(canteenWeeklyMenu.schoolId, schoolId),
        eq(canteenWeeklyMenu.weekStartDate, targetWeek)
      ),
      orderBy: [desc(canteenWeeklyMenu.createdAt)],
    });

    return { data: items, weekStartDate: targetWeek };
  });
}

export async function saveWeeklyMenuItemAction(data: {
  id?: number;
  weekStartDate: string;
  dayOfWeek: string;
  mealType?: string;
  starterDish?: string;
  mainDish: string;
  sideDish?: string;
  dessert?: string;
  allergens?: string;
  calories?: number;
  isVegetarian?: boolean;
  notes?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const payload = {
      schoolId,
      weekStartDate: data.weekStartDate,
      dayOfWeek: data.dayOfWeek,
      mealType: data.mealType || "Déjeuner",
      starterDish: data.starterDish || null,
      mainDish: data.mainDish,
      sideDish: data.sideDish || null,
      dessert: data.dessert || null,
      allergens: data.allergens || null,
      calories: Number(data.calories || 650),
      isVegetarian: data.isVegetarian || false,
      notes: data.notes || null,
    };

    if (data.id) {
      await db
        .update(canteenWeeklyMenu)
        .set(payload)
        .where(
          and(eq(canteenWeeklyMenu.id, data.id), eq(canteenWeeklyMenu.schoolId, schoolId))
        );
    } else {
      await db.insert(canteenWeeklyMenu).values(payload);
    }

    revalidatePath("/dashboard/canteen");
    return { success: true, message: "Menu de cantine enregistré avec succès." };
  });
}

export async function deleteWeeklyMenuItemAction(id: number) {
  return protectedDbAction("Canteen", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Accès refusé." };

    await db
      .delete(canteenWeeklyMenu)
      .where(
        and(eq(canteenWeeklyMenu.id, id), eq(canteenWeeklyMenu.schoolId, schoolId))
      );

    revalidatePath("/dashboard/canteen");
    return { success: true, message: "Élément de menu supprimé." };
  });
}

// ─── 3. Subscriptions & Special Diets ────────────────────────────────────────

export async function getCanteenSubscriptions(params?: { query?: string; planType?: string }) {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const conditions = [eq(canteenMealSubscriptions.schoolId, schoolId)];
    if (params?.planType && params.planType !== "ALL") {
      conditions.push(eq(canteenMealSubscriptions.planType, params.planType));
    }

    const subs = await readDb.query.canteenMealSubscriptions.findMany({
      where: and(...conditions),
      with: {
        student: true,
      },
      orderBy: [desc(canteenMealSubscriptions.createdAt)],
    });

    let filtered = subs;
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      filtered = subs.filter(
        (s) =>
          s.student?.nomEtudiant?.toLowerCase().includes(q) ||
          s.student?.numAdmission?.toLowerCase().includes(q) ||
          s.specialDiet?.toLowerCase().includes(q)
      );
    }

    return { data: filtered };
  });
}

export async function saveMealSubscriptionAction(data: {
  id?: number;
  studentId: number;
  planType: string;
  monthlyPrice?: number;
  specialDiet?: string;
  allergiesNotice?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  startDate?: Date;
  status?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
    });

    if (!student) return { error: "Élève introuvable." };

    const parentPhone = data.parentPhone || (student as any)?.mobile || (student as any)?.phoneFixe || null;
    const parentWhatsapp = data.parentWhatsapp || (student as any)?.whatsapp || parentPhone;

    const payload = {
      schoolId,
      studentId: data.studentId,
      planType: data.planType,
      monthlyPrice: Number(data.monthlyPrice || 25000),
      specialDiet: data.specialDiet || "Normal",
      allergiesNotice: data.allergiesNotice || null,
      parentPhone,
      parentWhatsapp,
      startDate: data.startDate || new Date(),
      status: data.status || "Actif",
    };

    if (data.id) {
      await db
        .update(canteenMealSubscriptions)
        .set(payload)
        .where(
          and(
            eq(canteenMealSubscriptions.id, data.id),
            eq(canteenMealSubscriptions.schoolId, schoolId)
          )
        );
    } else {
      await db.insert(canteenMealSubscriptions).values(payload);

      // Ensure student wallet exists
      const existingWallet = await db.query.studentWallets.findFirst({
        where: eq(studentWallets.studentId, data.studentId),
      });
      if (!existingWallet) {
        await db.insert(studentWallets).values({
          schoolId,
          studentId: data.studentId,
          balance: 0,
          dailySpendingLimit: 2000,
        });
      }
    }

    revalidatePath("/dashboard/canteen");
    return { success: true, message: "Abonnement de cantine enregistré avec succès." };
  });
}

export async function cancelMealSubscriptionAction(id: number) {
  return protectedDbAction("Canteen", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Accès refusé." };

    await db
      .update(canteenMealSubscriptions)
      .set({ status: "Suspendu" })
      .where(
        and(
          eq(canteenMealSubscriptions.id, id),
          eq(canteenMealSubscriptions.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/canteen");
    return { success: true, message: "Abonnement suspendu." };
  });
}

// ─── 4. Student Digital Wallets & Top-Up ──────────────────────────────────────

export async function getStudentWalletsAction(params?: { query?: string }) {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const wallets = await readDb.query.studentWallets.findMany({
      where: eq(studentWallets.schoolId, schoolId),
      with: {
        student: true,
      },
      orderBy: [desc(studentWallets.updatedAt)],
    });

    let filtered = wallets;
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      filtered = wallets.filter(
        (w) =>
          w.student?.nomEtudiant?.toLowerCase().includes(q) ||
          w.student?.numAdmission?.toLowerCase().includes(q)
      );
    }

    return { data: filtered };
  });
}

export async function topUpStudentWalletAction(data: {
  studentId: number;
  amount: number;
  paymentMethod?: string;
  itemsDesc?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const amount = Number(data.amount);

    if (isNaN(amount) || amount <= 0) {
      return { error: "Le montant de la recharge doit être supérieur à 0." };
    }

    const [student, wallet] = await Promise.all([
      db.query.students.findFirst({
        where: eq(students.id, data.studentId),
      }),
      db.query.studentWallets.findFirst({
        where: eq(studentWallets.studentId, data.studentId),
      }),
    ]);

    if (!student) return { error: "Élève introuvable." };

    let newBalance = amount;
    if (wallet) {
      newBalance = Number(wallet.balance) + amount;
      await db
        .update(studentWallets)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(studentWallets.id, wallet.id));
    } else {
      await db.insert(studentWallets).values({
        schoolId,
        studentId: data.studentId,
        balance: amount,
        dailySpendingLimit: 2000,
      });
    }

    // Record transaction
    await db.insert(canteenTransactions).values({
      schoolId,
      studentId: data.studentId,
      amount,
      type: "Recharge",
      paymentMethod: data.paymentMethod || "Espèces",
      itemsDesc: data.itemsDesc || `Recharge de compte cantine (+${amount} CFA)`,
      recordedBy: user.nomPrenom || user.utilisateur || "Caissier Cantine",
    });

    // Parent WhatsApp/SMS Alert
    const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;
    if (parentPhone) {
      try {
        await MessagingService.sendCanteenWalletTopupAlert({
          to: parentPhone,
          whatsapp: (student as any)?.whatsapp || parentPhone,
          parentName: (student as any)?.nomPere || "Parent d'élève",
          studentName: student.nomEtudiant,
          amount,
          newBalance,
          schoolName: "Edut Pro",
        });
      } catch (err) {
        console.error("Failed to send canteen topup SMS:", err);
      }
    }

    revalidatePath("/dashboard/canteen");
    return {
      success: true,
      newBalance,
      message: `Compte de ${student.nomEtudiant} rechargé de ${amount.toLocaleString()} CFA avec succès.`,
    };
  });
}

export async function updateWalletSpendingLimitAction(data: {
  studentId: number;
  dailySpendingLimit: number;
  isLocked: boolean;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Accès refusé." };

    await db
      .update(studentWallets)
      .set({
        dailySpendingLimit: Number(data.dailySpendingLimit || 2000),
        isLocked: data.isLocked,
        updatedAt: new Date(),
      })
      .where(
        and(eq(studentWallets.studentId, data.studentId), eq(studentWallets.schoolId, schoolId))
      );

    revalidatePath("/dashboard/canteen");
    return { success: true, message: "Paramètres du compte mis à jour." };
  });
}

// ─── 5. Cafeteria Roll Call & Allergy Verification ───────────────────────────

export async function recordMealConsumptionAction(data: {
  studentId: number;
  mealType?: string;
  menuDescription?: string;
  dishName?: string;
  dishAllergens?: string;
  mealPrice?: number;
}) {
  return protectedDbAction("Canteen", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    const mealType = data.mealType || "Déjeuner";

    const [student, subscription, wallet, medicalProfile] = await Promise.all([
      db.query.students.findFirst({
        where: eq(students.id, data.studentId),
      }),
      db.query.canteenMealSubscriptions.findFirst({
        where: and(
          eq(canteenMealSubscriptions.studentId, data.studentId),
          eq(canteenMealSubscriptions.status, "Actif")
        ),
      }),
      db.query.studentWallets.findFirst({
        where: eq(studentWallets.studentId, data.studentId),
      }),
      db.query.studentMedicalRecords.findFirst({
        where: eq(studentMedicalRecords.studentId, data.studentId),
      }),
    ]);

    if (!student) return { error: "Élève introuvable." };

    // 1. Check Allergy Conflict
    let allergyWarningTriggered = false;
    let detectedAllergen = "";

    const studentAllergies = (
      (medicalProfile?.allergies || "") +
      " " +
      (subscription?.allergiesNotice || "") +
      " " +
      (subscription?.specialDiet || "")
    ).toLowerCase();

    const menuAllergens = (data.dishAllergens || "").toLowerCase();

    if (menuAllergens) {
      const allergenList = menuAllergens.split(/[,;\s]+/).filter(Boolean);
      for (const alg of allergenList) {
        if (studentAllergies.includes(alg)) {
          allergyWarningTriggered = true;
          detectedAllergen = alg;
          break;
        }
      }
    }

    // 2. Handle Payment / Subscription logic
    let costDeducted = 0;
    if (!subscription) {
      // Must deduct from wallet
      const price = Number(data.mealPrice || 1000);
      if (!wallet || Number(wallet.balance) < price) {
        return {
          error: `Solde insuffisant pour ${student.nomEtudiant}. Solde actuel: ${wallet?.balance || 0} CFA (Prix repas: ${price} CFA). Veuillez recharger le compte.`,
        };
      }

      if (wallet.isLocked) {
        return { error: `Le compte cantine de ${student.nomEtudiant} est temporairement verrouillé.` };
      }

      costDeducted = price;
      const newBal = Number(wallet.balance) - price;
      await db
        .update(studentWallets)
        .set({ balance: newBal, updatedAt: new Date() })
        .where(eq(studentWallets.id, wallet.id));

      await db.insert(canteenTransactions).values({
        schoolId,
        studentId: data.studentId,
        amount: -price,
        type: "Achat Repas",
        paymentMethod: "Solde Compte",
        itemsDesc: `Service repas: ${data.dishName || mealType}`,
        recordedBy: user.nomPrenom || user.utilisateur || "Chef de Cantine",
      });
    }

    // 3. Record consumption
    const [inserted] = await db
      .insert(canteenMealConsumptions)
      .values({
        schoolId,
        studentId: data.studentId,
        subscriptionId: subscription?.id || null,
        mealType,
        consumptionDate: todayStr,
        servedAt: new Date(),
        menuDescription: data.menuDescription || data.dishName || "Repas complet",
        servedBy: user.nomPrenom || user.utilisateur || "Chef de Cantine",
        allergyWarningTriggered,
        costDeducted,
        parentNotified: allergyWarningTriggered,
      })
      .returning();

    // 4. Alert if Allergy Warning
    if (allergyWarningTriggered) {
      const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;
      if (parentPhone) {
        try {
          await MessagingService.sendCanteenAllergyAlert({
            to: parentPhone,
            whatsapp: (student as any)?.whatsapp || parentPhone,
            parentName: (student as any)?.nomPere || "Parent d'élève",
            studentName: student.nomEtudiant,
            dishName: data.dishName || "Repas du jour",
            allergen: detectedAllergen || "Allergène",
            schoolName: "Edut Pro",
          });
        } catch (err) {
          console.error("Failed to send allergy alert:", err);
        }
      }
    }

    revalidatePath("/dashboard/canteen");
    return {
      success: true,
      allergyWarningTriggered,
      message: allergyWarningTriggered
        ? `⚠️ Repas validé avec ATTENTION : Risque d'allergie (${detectedAllergen}) détecté pour ${student.nomEtudiant}!`
        : `Repas ${mealType} validé avec succès pour ${student.nomEtudiant}.`,
    };
  });
}

export async function getMealConsumptionLogs(params?: { date?: string; limit?: number }) {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const targetDate = params?.date || new Date().toISOString().slice(0, 10);

    const logs = await readDb.query.canteenMealConsumptions.findMany({
      where: and(
        eq(canteenMealConsumptions.schoolId, schoolId),
        eq(canteenMealConsumptions.consumptionDate, targetDate)
      ),
      with: {
        student: true,
      },
      orderBy: [desc(canteenMealConsumptions.servedAt)],
      limit: params?.limit || 50,
    });

    return { data: logs };
  });
}

// ─── 6. Existing POS Compatibility Functions ─────────────────────────────────

export async function getCanteenItems() {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const items = await readDb.query.canteenItems.findMany({
      where: schoolId ? eq(canteenItems.schoolId, schoolId) : undefined,
      orderBy: [desc(canteenItems.createdAt)],
    });
    return { data: items };
  });
}

export async function createCanteenItem(data: {
  name: string;
  code?: string;
  price: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
  calories?: number;
  allergens?: string;
  isVegetarian?: boolean;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.insert(canteenItems).values({
      schoolId,
      name: data.name,
      code: data.code || null,
      price: Number(data.price),
      category: data.category || "Plat",
      stock: Number(data.stock ?? 100),
      imageUrl: data.imageUrl || null,
      calories: data.calories ? Number(data.calories) : null,
      allergens: data.allergens || null,
      isVegetarian: data.isVegetarian || false,
    });
    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, message: "Article ajouté avec succès" };
  });
}

export async function updateCanteenItem(id: number, data: any) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db
      .update(canteenItems)
      .set(data)
      .where(eq(canteenItems.id, id));
    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, message: "Article mis à jour" };
  });
}

export async function deleteCanteenItem(id: number) {
  return protectedDbAction("Canteen", "canDelete", async () => {
    await db.delete(canteenItems).where(eq(canteenItems.id, id));
    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, message: "Article supprimé" };
  });
}

export async function getCanteenInvoices() {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const invoices = await readDb.query.canteenInvoices.findMany({
      where: schoolId ? eq(canteenInvoices.schoolId, schoolId) : undefined,
      orderBy: [desc(canteenInvoices.createdAt)],
      limit: 100,
    });
    return { data: invoices };
  });
}

export async function createCanteenInvoice(data: any) {
  return protectedDbAction("Canteen", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const invNumber = `FAC-${Date.now().toString().slice(-6)}`;
    const [inserted] = await db
      .insert(canteenInvoices)
      .values({
        schoolId,
        invoiceNumber: invNumber,
        clientName: data.clientName || "CLIENT COMPTANT",
        studentId: data.studentId || null,
        subtotal: Number(data.subtotal || 0),
        tva: Number(data.tva || 0),
        totalTtc: Number(data.totalTtc || data.subtotal || 0),
        amountReceived: Number(data.amountReceived || 0),
        changeGiven: Number(data.changeGiven || 0),
        paymentMethod: data.paymentMethod || "Cash",
        itemsJson: typeof data.itemsJson === "string" ? data.itemsJson : JSON.stringify(data.itemsJson || []),
        cashierName: user.nomPrenom || user.utilisateur || "Caissier",
      })
      .returning();

    revalidatePath("/dashboard/pos");
    return { success: true, invoice: inserted };
  });
}

export async function voidCanteenInvoice(id: number) {
  return protectedDbAction("Canteen", "canDelete", async () => {
    await db
      .update(canteenInvoices)
      .set({ status: "Annulée" })
      .where(eq(canteenInvoices.id, id));
    revalidatePath("/dashboard/pos");
    return { success: true, message: "Facture annulée" };
  });
}

export async function updateCanteenInvoice(id: number, data: any) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.update(canteenInvoices).set(data).where(eq(canteenInvoices.id, id));
    revalidatePath("/dashboard/pos");
    return { success: true, message: "Facture modifiée" };
  });
}

export async function getCanteenStudents() {
  return protectedDbAction("Canteen", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const list = await readDb.query.students.findMany({
      where: and(
        schoolId ? eq(students.schoolId, schoolId) : undefined,
        eq(students.statut, "Actif")
      ),
      columns: {
        id: true,
        nomEtudiant: true,
        numAdmission: true,
        classe: true,
      },
      limit: 100,
    });
    return { data: list };
  });
}
