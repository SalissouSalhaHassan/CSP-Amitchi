import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { canteenWeeklyMenu, canteenItems } from "@/infrastructure/database/schema/canteen";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const schoolId = user.schoolId || 1;

    // 1. Fetch weekly menu
    const weeklyMenu = await db.query.canteenWeeklyMenu.findMany({
      where: eq(canteenWeeklyMenu.schoolId, schoolId),
      orderBy: (m, { asc }) => [asc(m.dayOfWeek)],
    });

    // 2. Fetch available canteen items
    const items = await db.query.canteenItems.findMany({
      where: eq(canteenItems.schoolId, schoolId),
      orderBy: (i, { asc }) => [asc(i.category)],
    });

    // Fallback sample weekly menu if database is empty
    let finalMenu = weeklyMenu;
    if (finalMenu.length === 0) {
      finalMenu = [
        {
          id: 1,
          schoolId,
          weekStartDate: new Date().toISOString().split("T")[0],
          dayOfWeek: "Lundi",
          mealType: "Déjeuner",
          starterDish: "Salade de carottes râpées & vinaigrette douce",
          mainDish: "Riz sauté aux légumes & Poulet braisé",
          sideDish: "Alloco (bananes plantains)",
          dessert: "Yaourt nature ou Pomme",
          allergens: "Lactose",
          calories: 620,
          isVegetarian: false,
          notes: "Repas équilibré riche en protéines.",
          createdAt: new Date(),
        },
        {
          id: 2,
          schoolId,
          weekStartDate: new Date().toISOString().split("T")[0],
          dayOfWeek: "Mardi",
          mealType: "Déjeuner",
          starterDish: "Concombre au fromage blanc",
          mainDish: "Filet de poisson au four & Purée de patates douces",
          sideDish: "Haricots verts vapeur",
          dessert: "Mangue fraîche",
          allergens: "Poisson, Lactose",
          calories: 580,
          isVegetarian: false,
          notes: "Menu riche en oméga-3.",
          createdAt: new Date(),
        },
        {
          id: 3,
          schoolId,
          weekStartDate: new Date().toISOString().split("T")[0],
          dayOfWeek: "Mercredi",
          mealType: "Déjeuner",
          starterDish: "Potage velouté de potiron",
          mainDish: "Pâtes bolognaise au boeuf haché halal",
          sideDish: "Salade verte",
          dessert: "Fruit de saison",
          allergens: "Gluten",
          calories: 650,
          isVegetarian: false,
          notes: "Classique apprécié des élèves.",
          createdAt: new Date(),
        },
        {
          id: 4,
          schoolId,
          weekStartDate: new Date().toISOString().split("T")[0],
          dayOfWeek: "Jeudi",
          mealType: "Déjeuner",
          starterDish: "Salade de betteraves",
          mainDish: "Ragoût de boeuf aux carottes & Riz blanc",
          sideDish: "Légumes sautés",
          dessert: "Compote de pommes",
          allergens: "Aucun majeur",
          calories: 610,
          isVegetarian: false,
          notes: "Plat traditionnel savoureux.",
          createdAt: new Date(),
        },
        {
          id: 5,
          schoolId,
          weekStartDate: new Date().toISOString().split("T")[0],
          dayOfWeek: "Vendredi",
          mealType: "Déjeuner",
          starterDish: "Salade niçoise",
          mainDish: "Couscous royal aux légumes & Poulet",
          sideDish: "Pois chiches & raisins",
          dessert: "Orange ou gâteau maison",
          allergens: "Gluten",
          calories: 700,
          isVegetarian: false,
          notes: "Repas festif de fin de semaine.",
          createdAt: new Date(),
        },
      ] as any;
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyMenu: finalMenu,
        items,
      },
    });
  } catch (error: any) {
    console.error("[Canteen Menu API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors du chargement des menus", 500);
  }
}
