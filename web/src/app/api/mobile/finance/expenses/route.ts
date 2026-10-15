import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, desc, inArray, or, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, readDb } from "@/infrastructure/database";
import { expenses, expenseCategories } from "@/infrastructure/database/schema/finance";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType, getCompatibleLevels } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const schoolIdParam = searchParams.get("schoolId");
  const schoolId = schoolIdParam ? Number(schoolIdParam) : user.schoolId;

  if (!schoolId) {
    return mobileJsonError("schoolId manquant", 400);
  }

  if (user.schoolId && user.schoolId !== schoolId) {
    return mobileJsonError("Accès refusé", 403);
  }

  const roleType = await getUserRoleType(user);

  try {
    let whereClause = or(eq(expenses.schoolId, schoolId), isNull(expenses.schoolId)) as any;

    if (roleType === "level_director" && user.educationalLevel) {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      whereClause = and(whereClause, inArray(expenses.educationalLevel, compatibleLevels)) as any;
    }

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (startDateStr) {
      const start = new Date(startDateStr);
      if (!isNaN(start.getTime())) {
        whereClause = and(whereClause, sql`${expenses.dateExpense} >= ${start.toISOString()}`) as any;
      }
    }

    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime())) {
        whereClause = and(whereClause, sql`${expenses.dateExpense} <= ${end.toISOString()}`) as any;
      }
    }

    const rows = await readDb.query.expenses.findMany({
      where: whereClause,
      with: {
        category: true,
      },
      orderBy: [desc(expenses.dateExpense), desc(expenses.id)],
      limit: 150,
    });

    const data = rows.map((e) => ({
      id: e.id,
      school_id: e.schoolId,
      reference: e.reference,
      category_id: e.categoryId,
      category: e.category?.name || "Général",
      description: e.description || e.category?.name || "Dépense",
      amount: Number(e.amount) || 0,
      date_expense: e.dateExpense ? new Date(e.dateExpense).toISOString() : new Date().toISOString(),
      payment_mode: e.paymentMode || "Espèces",
      status: e.status || "Payé",
      recorded_by: e.recordedBy || "Admin",
      educational_level: e.educationalLevel || null,
      created_at: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    }));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (err: any) {
    console.error("[Mobile Expenses GET Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  if (!schoolId) {
    return mobileJsonError("Utilisateur non rattaché à une école", 403);
  }

  try {
    const body = await request.json();
    const amount = Number(body.amount || 0);
    const description = String(body.description || "").trim();
    const categoryName = String(body.category || body.categoryName || "Fournitures de Bureau").trim();
    const paymentMode = String(body.payment_mode || body.paymentMode || "Espèces").trim();
    const dateExpense = body.date_expense || body.dateExpense ? new Date(body.date_expense || body.dateExpense) : new Date();

    if (amount <= 0 || !description) {
      return mobileJsonError("Montant et description requis", 400);
    }

    // Resolve or create category
    let category = await db.query.expenseCategories.findFirst({
      where: and(
        eq(expenseCategories.schoolId, schoolId),
        ilike(expenseCategories.name, categoryName)
      ),
    });

    if (!category) {
      try {
        const [insertedCat] = await db
          .insert(expenseCategories)
          .values({
            schoolId,
            name: categoryName,
            description: categoryName,
          })
          .returning();
        category = insertedCat;
      } catch (_) {
        category = await db.query.expenseCategories.findFirst({
          where: eq(expenseCategories.schoolId, schoolId),
        });
      }
    }

    const reference = body.reference || `DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [created] = await db
      .insert(expenses)
      .values({
        schoolId,
        reference,
        categoryId: category?.id || null,
        amount,
        description,
        dateExpense,
        paymentMode,
        status: body.status || "Payé",
        recordedBy: user.employee?.nom || user.utilisateur || "Mobile App",
        educationalLevel: user.educationalLevel || null,
      })
      .returning();

    revalidatePath("/dashboard/finance/expenses");
    revalidatePath("/dashboard/finance");

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        reference: created.reference,
        amount: created.amount,
        description: created.description,
        category: categoryName,
        payment_mode: paymentMode,
        date_expense: created.dateExpense,
      },
    });
  } catch (err: any) {
    console.error("[Mobile Expenses POST Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
