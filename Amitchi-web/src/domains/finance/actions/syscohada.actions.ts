"use server";

import { db } from "@/infrastructure/database";
import { syscohadaAccounts, syscohadaEntries, cogesBudgets, cogesPayments, expenses, revenues } from "@/infrastructure/database/schema/finance";
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
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "syscohada_accounts" (
        "id" serial PRIMARY KEY,
        "school_id" integer,
        "account_number" varchar(20) NOT NULL,
        "account_name" varchar(150) NOT NULL,
        "category_class" integer NOT NULL,
        "account_type" varchar(20) DEFAULT 'ACTIF',
        "created_at" timestamp DEFAULT now()
      );
    `);

    await db.execute(sql`
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

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coges_budgets" (
        "id" serial PRIMARY KEY,
        "school_id" integer,
        "session_id" integer,
        "category" varchar(100) NOT NULL,
        "budgeted_amount" double precision NOT NULL,
        "realized_amount" double precision DEFAULT 0,
        "comments" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
  } catch (e) {
    console.warn("[syscohada.ensurePhase3Tables] Error creating tables:", e);
  }
}

const STANDARD_SYSCOHADA_ACCOUNTS = [
  { accountNumber: "101000", accountName: "Capital / Fonds d'Établissement", categoryClass: 1, accountType: "PASSIF" },
  { accountNumber: "162000", accountName: "Emprunts auprès des Établissements de Crédit", categoryClass: 1, accountType: "PASSIF" },
  { accountNumber: "211000", accountName: "Terrains & Sol d'Établissement", categoryClass: 2, accountType: "ACTIF" },
  { accountNumber: "241000", accountName: "Matériel Informatique & Didactique", categoryClass: 2, accountType: "ACTIF" },
  { accountNumber: "411000", accountName: "Créances Élèves / Parents d'Élèves", categoryClass: 4, accountType: "ACTIF" },
  { accountNumber: "401000", accountName: "Fournisseurs d'Équipements & Manuels", categoryClass: 4, accountType: "PASSIF" },
  { accountNumber: "512000", accountName: "Compte Bancaire / Mobile Money", categoryClass: 5, accountType: "ACTIF" },
  { accountNumber: "531000", accountName: "Caisse Principale Établissement", categoryClass: 5, accountType: "ACTIF" },
  { accountNumber: "601000", accountName: "Achats de Fournitures Scolaires & Manuels", categoryClass: 6, accountType: "CHARGE" },
  { accountNumber: "621000", accountName: "Entretien, Réparations & Services", categoryClass: 6, accountType: "CHARGE" },
  { accountNumber: "661000", accountName: "Rémunération du Personnel & Enseignants", categoryClass: 6, accountType: "CHARGE" },
  { accountNumber: "706000", accountName: "Prestations Scolaires & Frais de Scolarité", categoryClass: 7, accountType: "PRODUIT" },
  { accountNumber: "707000", accountName: "Cotisations COGES & Vente d'Insignes", categoryClass: 7, accountType: "PRODUIT" },
];

/**
 * Seed standard SYSCOHADA Chart of Accounts if empty for school
 */
export async function seedSyscohadaAccounts() {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const existing = await db.select().from(syscohadaAccounts).where(eq(syscohadaAccounts.schoolId, schoolId));
    if (existing.length > 0) {
      return { success: true, data: existing, message: "Plan comptable déjà initialisé" };
    }

    const inserted = [];
    for (const acc of STANDARD_SYSCOHADA_ACCOUNTS) {
      const [rec] = await db.insert(syscohadaAccounts).values({
        schoolId,
        ...acc
      }).returning();
      inserted.push(rec);
    }

    revalidatePath("/dashboard/finance/syscohada");
    return { success: true, data: inserted, message: "Plan comptable SYSCOHADA initialisé avec succès!" };
  });
}

/**
 * Get SYSCOHADA Chart of Accounts
 */
export async function getSyscohadaAccounts() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: true, data: [] };

    let accounts = await db.select().from(syscohadaAccounts).where(eq(syscohadaAccounts.schoolId, schoolId));
    if (accounts.length === 0) {
      // Auto seed if empty
      const seedRes = await seedSyscohadaAccounts();
      if (seedRes.success && seedRes.data) {
        accounts = seedRes.data as any;
      }
    }

    return { success: true, data: accounts };
  });
}

/**
 * Add a new SYSCOHADA Ledger Entry manually
 */
export async function addSyscohadaEntry(data: {
  reference: string;
  accountId: number;
  label: string;
  debit: number;
  credit: number;
}) {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const [newEntry] = await db.insert(syscohadaEntries).values({
      schoolId,
      reference: data.reference,
      accountId: data.accountId,
      label: data.label,
      debit: data.debit,
      credit: data.credit,
      recordedBy: user.email || "Utilisateur"
    }).returning();

    revalidatePath("/dashboard/finance/syscohada");
    return { success: true, data: newEntry, message: "Écriture comptable enregistrée" };
  });
}

/**
 * Get SYSCOHADA Ledger Entries
 */
export async function getSyscohadaEntries() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: true, data: [] };

    const entries = await db.select({
      id: syscohadaEntries.id,
      reference: syscohadaEntries.reference,
      entryDate: syscohadaEntries.entryDate,
      label: syscohadaEntries.label,
      debit: syscohadaEntries.debit,
      credit: syscohadaEntries.credit,
      recordedBy: syscohadaEntries.recordedBy,
      accountNumber: syscohadaAccounts.accountNumber,
      accountName: syscohadaAccounts.accountName,
      accountType: syscohadaAccounts.accountType
    })
    .from(syscohadaEntries)
    .innerJoin(syscohadaAccounts, eq(syscohadaEntries.accountId, syscohadaAccounts.id))
    .where(eq(syscohadaEntries.schoolId, schoolId))
    .orderBy(desc(syscohadaEntries.entryDate));

    return { success: true, data: entries };
  });
}

/**
 * Calculate SYSCOHADA Financial Statements (Bilan & Compte de Résultat)
 */
export async function getSyscohadaStatements() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const entries = await db.select({
      debit: syscohadaEntries.debit,
      credit: syscohadaEntries.credit,
      accountType: syscohadaAccounts.accountType,
      categoryClass: syscohadaAccounts.categoryClass,
      accountNumber: syscohadaAccounts.accountNumber,
      accountName: syscohadaAccounts.accountName
    })
    .from(syscohadaEntries)
    .innerJoin(syscohadaAccounts, eq(syscohadaEntries.accountId, syscohadaAccounts.id))
    .where(eq(syscohadaEntries.schoolId, schoolId));

    let totalActif = 0;
    let totalPassif = 0;
    let totalCharges = 0; // Class 6
    let totalProduits = 0; // Class 7

    const accountBalances: Record<string, { name: string; type: string; balance: number }> = {};

    for (const e of entries) {
      const key = `${e.accountNumber} - ${e.accountName}`;
      if (!accountBalances[key]) {
        accountBalances[key] = { name: e.accountName, type: e.accountType || "ACTIF", balance: 0 };
      }

      const netAmt = (e.debit || 0) - (e.credit || 0);
      accountBalances[key].balance += netAmt;

      if (e.accountType === "ACTIF") totalActif += netAmt;
      else if (e.accountType === "PASSIF") totalPassif += Math.abs(netAmt);
      else if (e.accountType === "CHARGE") totalCharges += netAmt;
      else if (e.accountType === "PRODUIT") totalProduits += Math.abs(netAmt);
    }

    const resultatNet = totalProduits - totalCharges;

    return {
      success: true,
      data: {
        totalActif,
        totalPassif: totalPassif + (resultatNet > 0 ? resultatNet : 0),
        totalCharges,
        totalProduits,
        resultatNet,
        accountBalances
      }
    };
  });
}

/**
 * Generate COGES Official Financial Report
 */
export async function getCogesFinancialReport() {
  return protectedDbAction("Finance", "canView", async (user) => {
    await ensurePhase3Tables();
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const cogesPymts = await db.select().from(cogesPayments).where(eq(cogesPayments.schoolId, schoolId));
    const cogesExpenses = await db.select().from(expenses).where(
      and(eq(expenses.schoolId, schoolId), eq(expenses.educationalLevel, "COGES"))
    );

    const totalCotisations = cogesPymts.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDepenses = cogesExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const soldeDisponible = totalCotisations - totalDepenses;

    const qrVerificationHash = `COGES-REG-${schoolId}-${Date.now().toString().slice(0, 8)}`;

    return {
      success: true,
      data: {
        schoolName: (user as any).schoolName || (user as any).school?.name || "Établissement Scolaire",
        totalCotisations,
        totalDepenses,
        soldeDisponible,
        paymentCount: cogesPymts.length,
        expenseCount: cogesExpenses.length,
        qrVerificationHash,
        generatedAt: new Date().toLocaleDateString("fr-FR")
      }
    };
  });
}
