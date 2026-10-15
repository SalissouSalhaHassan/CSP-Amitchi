import { NextRequest, NextResponse } from "next/server";
import { recoverAndResetAccount } from "@/domains/auth/actions/reset-password";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, schoolSlug, matriculeOrEmail, verificationCodeOrPhone, newPassword } = body;

    if (!role || !schoolSlug || !matriculeOrEmail || !verificationCodeOrPhone) {
      return NextResponse.json(
        { success: false, error: "Tous les champs d'identification sont requis." },
        { status: 400 }
      );
    }

    if (role !== "student" && role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Rôle invalide (doit être student ou teacher)." },
        { status: 400 }
      );
    }

    const result = await recoverAndResetAccount({
      role,
      schoolSlug: String(schoolSlug).trim(),
      matriculeOrEmail: String(matriculeOrEmail).trim(),
      verificationCodeOrPhone: String(verificationCodeOrPhone).trim(),
      newPassword: newPassword ? String(newPassword).trim() : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error("API mobile forgot-password error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
