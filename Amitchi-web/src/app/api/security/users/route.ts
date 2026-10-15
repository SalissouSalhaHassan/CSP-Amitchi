import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/domains/auth/services/session";
import { saveUser, deleteUser, getUsers } from "@/domains/auth/actions/users.actions";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }
    const res = await getUsers();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    const res = await saveUser(data, id ? Number(id) : undefined);
    
    if (!res.success) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/security/users POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID utilisateur requis" }, { status: 400 });
    }

    const res = await deleteUser(Number(id));
    if (!res.success) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/security/users DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur lors de la suppression" }, { status: 500 });
  }
}
