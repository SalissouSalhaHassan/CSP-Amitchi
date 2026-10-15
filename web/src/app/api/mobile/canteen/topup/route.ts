import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { topUpStudentWalletAction } from "@/domains/canteen/actions/canteen.actions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  try {
    const body = await request.json();
    const { studentId, amount, paymentMethod } = body;

    if (!studentId || !amount || Number(amount) <= 0) {
      return mobileJsonError("studentId et montant valide requis.", 400);
    }

    const res = await topUpStudentWalletAction({
      studentId: Number(studentId),
      amount: Number(amount),
      paymentMethod: paymentMethod || "Mobile Money",
      itemsDesc: `Recharge mobile par ${user.nomPrenom || user.utilisateur || "Parent"}`,
    });

    if (res?.error) {
      return mobileJsonError(res.error, 400);
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[Mobile Canteen Topup Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la recharge", 500);
  }
}
