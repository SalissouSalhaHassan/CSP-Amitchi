import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/domains/auth/actions/register";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, schoolSlug, matriculeOrEmail, username, fullName, password, activationPin } = body;

    if (!role || !schoolSlug || !matriculeOrEmail || !username || !fullName || !password || !activationPin) {
      return NextResponse.json(
        { success: false, error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    if (role !== "student" && role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Rôle invalide." },
        { status: 400 }
      );
    }

    const result = await registerUser({
      role,
      schoolSlug: String(schoolSlug).trim(),
      matriculeOrEmail: String(matriculeOrEmail).trim(),
      username: String(username).trim(),
      fullName: String(fullName).trim(),
      passwordHash: String(password),
      activationPin: String(activationPin).trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API mobile register error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
