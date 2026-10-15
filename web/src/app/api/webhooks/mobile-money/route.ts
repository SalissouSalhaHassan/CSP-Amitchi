import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { onlineTransactions, feePayments, cogesPayments, studentFees, syscohadaAccounts, syscohadaEntries } from "@/infrastructure/database/schema/finance";
import { eq, and } from "drizzle-orm";

/**
 * Mobile Money & Payment Gateway Webhook Receiver (Orange Money, Moov Money, Wave, CinetPay)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 Mobile Money Webhook Received:", JSON.stringify(body, null, 2));

    // Extract transaction reference and status from webhook payload
    const txnRef = body.transaction_id || body.cpay_trans_id || body.ref || body.reference;
    const statusStr = body.status || body.cpay_status || body.code;
    
    if (!txnRef) {
      return NextResponse.json({ success: false, message: "Missing transaction reference" }, { status: 400 });
    }

    const isSuccess = String(statusStr).toUpperCase() === "SUCCESS" || String(statusStr) === "00" || String(statusStr) === "ACCEPTED";
    const status = isSuccess ? "SUCCESS" : "FAILED";

    // Find transaction record
    const [txn] = await db.select().from(onlineTransactions).where(eq(onlineTransactions.transactionReference, txnRef));
    if (!txn) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    if (txn.status === "SUCCESS") {
      return NextResponse.json({ success: true, message: "Transaction already processed" });
    }

    // Update transaction record with webhook payload
    await db.update(onlineTransactions).set({
      status,
      webhookPayload: body,
      updatedAt: new Date()
    }).where(eq(onlineTransactions.id, txn.id));

    // If payment succeeded, credit student fee / COGES and create SYSCOHADA entry
    if (isSuccess) {
      const receiptNo = `REC-WEB-${Date.now().toString().slice(-6)}`;

      if (txn.feeId) {
        const [fee] = await db.select().from(studentFees).where(eq(studentFees.id, txn.feeId));
        if (fee) {
          await db.insert(feePayments).values({
            schoolId: txn.schoolId,
            feeId: txn.feeId,
            amount: txn.amount,
            reduction: 0,
            datePaid: new Date(),
            paymentMode: `Mobile Money (${txn.provider})`,
            reference: txn.transactionReference,
            recordedBy: "Webhook Automatique"
          });

          const newPaid = (fee.totalPaid || 0) + txn.amount;
          const newBalance = Math.max(0, fee.totalExpected - newPaid - (fee.totalReduction || 0));

          await db.update(studentFees).set({
            totalPaid: newPaid,
            balance: newBalance,
            status: newBalance === 0 ? "Soldé" : "Partiel"
          }).where(eq(studentFees.id, txn.feeId));
        }
      } else if (txn.purpose === "COGES") {
        await db.insert(cogesPayments).values({
          schoolId: txn.schoolId,
          receiptNumber: receiptNo,
          studentId: txn.studentId || undefined,
          amount: txn.amount,
          receivedFrom: txn.phoneNumber || "Payeur Mobile Webhook",
          purpose: "Cotisation COGES (Mobile Money Webhook)",
          recordedBy: "Webhook Automatique",
          status: "Validé"
        });
      }

      // Record SYSCOHADA Ledger Entry
      try {
        if (txn.schoolId) {
          const [bankAcc] = await db.select().from(syscohadaAccounts).where(
            and(eq(syscohadaAccounts.schoolId, txn.schoolId), eq(syscohadaAccounts.accountNumber, "512000"))
          );
          const [revAcc] = await db.select().from(syscohadaAccounts).where(
            and(eq(syscohadaAccounts.schoolId, txn.schoolId), eq(syscohadaAccounts.accountNumber, "706000"))
          );

          if (bankAcc && revAcc) {
            await db.insert(syscohadaEntries).values({
              schoolId: txn.schoolId,
              reference: txn.transactionReference,
              accountId: bankAcc.id,
              label: `Webhook Paiement ${txn.purpose} via ${txn.provider}`,
              debit: txn.amount,
              credit: 0,
              recordedBy: "Webhook API"
            });

            await db.insert(syscohadaEntries).values({
              schoolId: txn.schoolId,
              reference: txn.transactionReference,
              accountId: revAcc.id,
              label: `Webhook Produit ${txn.purpose} via ${txn.provider}`,
              debit: 0,
              credit: txn.amount,
              recordedBy: "Webhook API"
            });
          }
        }
      } catch (err) {
        console.error("Webhook SYSCOHADA Entry Error:", err);
      }
    }

    return NextResponse.json({ success: true, message: `Webhook processed for ${txnRef} (${status})` });
  } catch (error: any) {
    console.error("❌ Mobile Money Webhook Error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
