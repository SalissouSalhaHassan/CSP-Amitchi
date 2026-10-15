import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      schoolName,
      schoolCode,
      subdomain,
      country = "Niger",
      city = "Niamey",
      phone,
      adminEmail,
      adminPassword,
      adminName = "Directeur Général",
      planType = "Pro",
    } = body;

    if (!schoolName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Nom de l'école, email et mot de passe administrateur sont requis." },
        { status: 400 }
      );
    }

    // 1. Check if school or admin email already exists
    const existingSchool = await db.query.schools.findFirst({
      where: eq(schools.name, schoolName),
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "Une école avec ce nom existe déjà." },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.utilisateur, adminEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email administrateur est déjà utilisé." },
        { status: 400 }
      );
    }

    // 2. Create School Record
    const generatedCode = schoolCode || `SCH-${randomUUID().slice(0, 6).toUpperCase()}`;
    const [newSchool] = await db
      .insert(schools)
      .values({
        name: schoolName,
        slug: subdomain || schoolName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        plan: planType.toLowerCase(),
        status: "active",
      })
      .returning({ id: schools.id, name: schools.name });

    const schoolId = newSchool.id;

    // 3. Create Admin User
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        nomPrenom: adminName,
        utilisateur: adminEmail,
        motDePasse: hashedPassword,
        admin: true,
        schoolId,
      })
      .returning({ id: users.id, utilisateur: users.utilisateur });

    // 4. Create Initial Academic Session
    const currentYear = new Date().getFullYear();
    await db.insert(schoolSessions).values({
      schoolId,
      sessionName: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-09-01`),
      endDate: new Date(`${currentYear + 1}-06-30`),
      status: "Actif",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "École et compte administrateur créés avec succès !",
      data: {
        schoolId,
        schoolName: newSchool.name,
        schoolCode: generatedCode,
        adminUserId: adminUser.id,
        adminEmail: adminUser.utilisateur,
        planType,
      },
    });
  } catch (error: any) {
    console.error("[School Onboard API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la création de l'école." },
      { status: 500 }
    );
  }
}
