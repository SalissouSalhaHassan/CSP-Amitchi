"use server";

import { db, readDb } from "@/infrastructure/database";
import { 
  onlineTransactions, 
  feePayments, 
  cogesPayments, 
  studentFees, 
  syscohadaAccounts, 
  syscohadaEntries,
  studentPaymentSchedules 
} from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { getCurrentUser } from "@/domains/auth/services/session";
import { protectedDbAction } from "@/lib/protected-action";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function ensurePhase3Tables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "online_transactions" (
        "id" serial PRIMARY KEY,
        "school_id" integer,
        "student_id" integer,
        "fee_id" integer,
        "transaction_reference" varchar(100) NOT NULL UNIQUE,
        "provider" varchar(50) NOT NULL,
        "provider_transaction_id" varchar(100),
        "amount" double precision NOT NULL,
        "currency" varchar(10) DEFAULT 'XOF',
        "phone_number" varchar(30),
        "status" varchar(20) DEFAULT 'PENDING',
        "purpose" varchar(255),
        "webhook_payload" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "syscohada_accounts" (
        "id" serial PRIMARY KEY,
        "school_id" integer,
        "account_number" varchar(20) NOT NULL,
        "account_name" varchar(150) NOT NULL,
        "category_class" integer NOT NULL,
        "account_type" varchar(20) DEFAULT 'ACTIF',
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "syscohada_entries" (
        "id" serial PRIMARY KEY,
        "school_id" integer,
        "session_id" integer,
        "entry_date" timestamp DEFAULT now(),
        "reference" varchar(50) NOT NULL,
        "account_id" integer,
        "label" varchar(255) NOT NULL,
        "debit" double precision DEFAULT 0,
        "credit" double precision DEFAULT 0,
        "recorded_by" varchar(100),
        "created_at" timestamp DEFAULT now()
      );
    `);
  } catch (e) {
    console.warn("[ensurePhase3Tables] Error creating tables:", e);
  }
}

export interface InitiatePaymentParams {
  studentId?: number;
  feeId?: number;
  amount: number;
  provider: "AIRTEL_MONEY" | "MOOV_MONEY" | "FLOOZ" | "ORANGE_MONEY" | "WAVE" | "NITA" | "BANK_CARD" | "CINETPAY";
  phoneNumber?: string;
  purpose: "Scolarité" | "Inscription" | "Mensualité" | "COGES" | "Soutenance PFE" | "Autre";
}

/**
 * Initiate an online / mobile money payment transaction
 */
export async function initiateMobilePayment(params: InitiatePaymentParams) {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "Contexte d'établissement manquant" };

    if (!params.amount || params.amount <= 0) {
      return { success: false, error: "Montant de paiement invalide" };
    }

    const txnRef = `TXN-${params.provider.substring(0, 3)}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const [newTxn] = await db.insert(onlineTransactions).values({
      schoolId,
      studentId: params.studentId,
      feeId: params.feeId,
      transactionReference: txnRef,
      provider: params.provider,
      amount: params.amount,
      currency: "XOF",
      phoneNumber: params.phoneNumber,
      purpose: params.purpose,
      status: "PENDING",
      providerTransactionId: `EXT-${Date.now().toString().slice(-8)}`,
    }).returning();

    const payUrl = `/dashboard/finance/mobile-money?checkout=${newTxn.id}&ref=${txnRef}&amount=${params.amount}&provider=${params.provider}`;

    return {
      success: true,
      data: {
        transaction: newTxn,
        payUrl,
        message: `Transaction ${txnRef} initialisée avec succès via ${params.provider}`
      }
    };
  });
}

/**
 * Confirm / Process payment completion (Webhook or Instant Payment Execution)
 */
export async function confirmMobilePayment(transactionId: number, status: "SUCCESS" | "FAILED" = "SUCCESS") {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const [txn] = await db.select().from(onlineTransactions).where(
      and(eq(onlineTransactions.id, transactionId), eq(onlineTransactions.schoolId, schoolId))
    );

    if (!txn) return { success: false, error: "Transaction non trouvée" };
    if (txn.status === "SUCCESS") return { success: true, message: "Transaction déjà validée" };

    // Update transaction status
    await db.update(onlineTransactions).set({
      status,
      updatedAt: new Date()
    }).where(eq(onlineTransactions.id, transactionId));

    if (status === "SUCCESS") {
      const receiptNo = `REC-MOB-${Date.now().toString().slice(-6)}`;

      // 1. If linked to Student Fee, record payment
      if (txn.feeId) {
        const [fee] = await db.select().from(studentFees).where(eq(studentFees.id, txn.feeId));
        if (fee) {
          await db.insert(feePayments).values({
            schoolId,
            feeId: txn.feeId,
            amount: txn.amount,
            reduction: 0,
            datePaid: new Date(),
            paymentMode: `Mobile Money (${txn.provider})`,
            reference: txn.transactionReference,
            recordedBy: user.email || "Passerelle Mobile Money"
          });

          // Update student fee totals
          const newPaid = (fee.totalPaid || 0) + txn.amount;
          const newBalance = Math.max(0, fee.totalExpected - newPaid - (fee.totalReduction || 0));
          const newStatus = newBalance === 0 ? "Soldé" : "Partiel";

          await db.update(studentFees).set({
            totalPaid: newPaid,
            balance: newBalance,
            status: newStatus
          }).where(eq(studentFees.id, txn.feeId));
        }
      } 
      // 2. If student has monthly payment schedules, settle the earliest overdue schedule
      if (txn.studentId) {
        try {
          const pendingSchedules = await db
            .select()
            .from(studentPaymentSchedules)
            .where(
              and(
                eq(studentPaymentSchedules.studentId, txn.studentId),
                sql`${studentPaymentSchedules.balance} > 0`
              )
            )
            .orderBy(studentPaymentSchedules.dueDate)
            .limit(1);

          if (pendingSchedules.length > 0) {
            const sched = pendingSchedules[0];
            const paidForSched = Math.min(sched.balance, txn.amount);
            const newPaid = (sched.paidAmount || 0) + paidForSched;
            const newBal = Math.max(0, sched.netAmount - newPaid);
            const newStatus = newBal === 0 ? "Payé" : "Partiel";

            await db.update(studentPaymentSchedules).set({
              paidAmount: newPaid,
              balance: newBal,
              status: newStatus,
              updatedAt: new Date(),
            }).where(eq(studentPaymentSchedules.id, sched.id));
          }
        } catch (e) {
          console.warn("Could not auto-settle studentPaymentSchedules:", e);
        }
      }
      // 3. If COGES Purpose, record in COGES Payments
      else if (txn.purpose === "COGES") {
        await db.insert(cogesPayments).values({
          schoolId,
          receiptNumber: receiptNo,
          studentId: txn.studentId || undefined,
          amount: txn.amount,
          receivedFrom: txn.phoneNumber || "Payeur Mobile",
          purpose: "Cotisation COGES (Mobile Money)",
          recordedBy: user.email || "Système Mobile Money",
          status: "Validé"
        });
      }

      // 4. Post Automatic SYSCOHADA Ledger Entry (512000 Banque/Mobile ↔ 706000 Prestations)
      try {
        const [bankAccount] = await db.select().from(syscohadaAccounts).where(
          and(eq(syscohadaAccounts.schoolId, schoolId), eq(syscohadaAccounts.accountNumber, "512000"))
        );
        const [revenueAccount] = await db.select().from(syscohadaAccounts).where(
          and(eq(syscohadaAccounts.schoolId, schoolId), eq(syscohadaAccounts.accountNumber, "706000"))
        );

        if (bankAccount && revenueAccount) {
          await db.insert(syscohadaEntries).values({
            schoolId,
            reference: txn.transactionReference,
            accountId: bankAccount.id,
            label: `Paiement ${txn.purpose} via ${txn.provider} - Ref: ${txn.transactionReference}`,
            debit: txn.amount,
            credit: 0,
            recordedBy: user.email || "Automatique"
          });

          await db.insert(syscohadaEntries).values({
            schoolId,
            reference: txn.transactionReference,
            accountId: revenueAccount.id,
            label: `Produit ${txn.purpose} via ${txn.provider}`,
            debit: 0,
            credit: txn.amount,
            recordedBy: user.email || "Automatique"
          });
        }
      } catch (e) {
        console.error("Erreur lors de la génération de l'écriture SYSCOHADA:", e);
      }
    }

    revalidatePath("/dashboard/finance/mobile-money");
    revalidatePath("/dashboard/finance");
    return { success: true, message: `Paiement de ${txn.amount.toLocaleString()} FCFA confirmé avec succès!` };
  });
}

/**
 * Fetch all online transactions with full Student details for the Mobile Money Hub
 */
export async function getOnlineTransactionsData() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) {
      return {
        success: true,
        data: {
          transactions: [],
          metrics: {
            totalAmount: 0,
            successCount: 0,
            pendingCount: 0,
            airtelVolume: 0,
            moovVolume: 0,
            orangeVolume: 0,
            waveVolume: 0,
            cardVolume: 0,
          }
        }
      };
    }

    const records = await (readDb || db)
      .select({
        id: onlineTransactions.id,
        schoolId: onlineTransactions.schoolId,
        studentId: onlineTransactions.studentId,
        feeId: onlineTransactions.feeId,
        transactionReference: onlineTransactions.transactionReference,
        provider: onlineTransactions.provider,
        providerTransactionId: onlineTransactions.providerTransactionId,
        amount: onlineTransactions.amount,
        currency: onlineTransactions.currency,
        phoneNumber: onlineTransactions.phoneNumber,
        status: onlineTransactions.status,
        purpose: onlineTransactions.purpose,
        createdAt: onlineTransactions.createdAt,
        updatedAt: onlineTransactions.updatedAt,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
      })
      .from(onlineTransactions)
      .leftJoin(students, eq(onlineTransactions.studentId, students.id))
      .where(eq(onlineTransactions.schoolId, schoolId))
      .orderBy(desc(onlineTransactions.createdAt));

    // Calculate aggregated metrics
    const successfulTxns = records.filter(r => r.status === "SUCCESS");
    const totalAmount = successfulTxns.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const successCount = successfulTxns.length;
    const pendingCount = records.filter(r => r.status === "PENDING").length;

    const airtelVolume = successfulTxns.filter(r => r.provider === "AIRTEL_MONEY").reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const moovVolume = successfulTxns.filter(r => r.provider === "MOOV_MONEY").reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const orangeVolume = successfulTxns.filter(r => r.provider === "ORANGE_MONEY").reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const waveVolume = successfulTxns.filter(r => r.provider === "WAVE").reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const cardVolume = successfulTxns.filter(r => r.provider === "BANK_CARD" || r.provider === "CINETPAY").reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return {
      success: true,
      data: {
        transactions: records,
        metrics: {
          totalAmount,
          successCount,
          pendingCount,
          airtelVolume,
          moovVolume,
          orangeVolume,
          waveVolume,
          cardVolume,
        }
      }
    };
  });
}

/**
 * Fetch all online transactions for school admin dashboard (legacy format for Syscohada page)
 */
export async function getOnlineTransactions() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: true, data: [] };

    const transactions = await (readDb || db)
      .select()
      .from(onlineTransactions)
      .where(eq(onlineTransactions.schoolId, schoolId))
      .orderBy(desc(onlineTransactions.createdAt));

    return { success: true, data: transactions };
  });
}

