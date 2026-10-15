/**
 * EDUT SaaS Platform - Centralized Tenant Licensing & Capability Engine
 * Unifies Platform Admin, Super Admin Dashboard, and Tenant Subscriptions.
 */

export type SubscriptionPlan = "gratuit" | "basic" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "expired" | "suspended";

export interface PlanCapabilities {
  name: string;
  nameAr: string;
  maxStudents: number;
  maxTeachers: number;
  maxClasses: number;
  maxStorageGb: number;
  smsQuota: number;
  features: {
    lmdUniversityEngine: boolean;
    digitalIntegrityPortal: boolean;
    onlinePaymentGateway: boolean;
    aiEarlyWarning: boolean;
    canteenModule: boolean;
    transportModule: boolean;
    customDomain: boolean;
    advancedAuditLogs: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_MATRIX: Record<SubscriptionPlan, PlanCapabilities> = {
  gratuit: {
    name: "Gratuit / Découverte",
    nameAr: "مجاني / تجريبي",
    maxStudents: 30,
    maxTeachers: 5,
    maxClasses: 3,
    maxStorageGb: 1,
    smsQuota: 50,
    features: {
      lmdUniversityEngine: false,
      digitalIntegrityPortal: true,
      onlinePaymentGateway: false,
      aiEarlyWarning: false,
      canteenModule: false,
      transportModule: false,
      customDomain: false,
      advancedAuditLogs: false,
      prioritySupport: false,
    },
  },
  basic: {
    name: "Forfait Basique",
    nameAr: "الباقة الأساسية",
    maxStudents: 150,
    maxTeachers: 20,
    maxClasses: 10,
    maxStorageGb: 10,
    smsQuota: 500,
    features: {
      lmdUniversityEngine: false,
      digitalIntegrityPortal: true,
      onlinePaymentGateway: true,
      aiEarlyWarning: false,
      canteenModule: true,
      transportModule: true,
      customDomain: false,
      advancedAuditLogs: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Forfait Professionnel",
    nameAr: "الباقة الاحترافية",
    maxStudents: 500,
    maxTeachers: 60,
    maxClasses: 30,
    maxStorageGb: 50,
    smsQuota: 2500,
    features: {
      lmdUniversityEngine: true,
      digitalIntegrityPortal: true,
      onlinePaymentGateway: true,
      aiEarlyWarning: true,
      canteenModule: true,
      transportModule: true,
      customDomain: true,
      advancedAuditLogs: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    name: "Forfait Entreprise & Université",
    nameAr: "باقة المؤسسات والجامعات الكبرى",
    maxStudents: 10000,
    maxTeachers: 500,
    maxClasses: 200,
    maxStorageGb: 500,
    smsQuota: 10000,
    features: {
      lmdUniversityEngine: true,
      digitalIntegrityPortal: true,
      onlinePaymentGateway: true,
      aiEarlyWarning: true,
      canteenModule: true,
      transportModule: true,
      customDomain: true,
      advancedAuditLogs: true,
      prioritySupport: true,
    },
  },
};

/**
 * Generate a standardized secure License Key
 * Format: EDUT-[PLAN]-[DURATION]-[CHECKSUM]-[RANDOM]
 * e.g., EDUT-PRO-12M-A84F-9382
 */
export function generateLicenseKey(plan: SubscriptionPlan, durationMonths: number = 12): string {
  const planTag = plan.toUpperCase().slice(0, 3);
  const durTag = `${durationMonths}M`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  
  const randSegment = (len: number) => {
    let res = "";
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const seg1 = randSegment(4);
  const seg2 = randSegment(4);

  return `EDUT-${planTag}-${durTag}-${seg1}-${seg2}`;
}

/**
 * Validate and parse a License Key
 */
export function parseLicenseKey(key: string): { 
  isValid: boolean; 
  plan?: SubscriptionPlan; 
  durationMonths?: number;
  error?: string;
} {
  if (!key || typeof key !== "string") {
    return { isValid: false, error: "Clé de licence invalide" };
  }

  const cleanKey = key.trim().toUpperCase();
  const parts = cleanKey.split("-");

  if (parts.length !== 5 || parts[0] !== "EDUT") {
    return { isValid: false, error: "Format de clé non reconnu (Format attendu: EDUT-XXX-XXM-XXXX-XXXX)" };
  }

  const planTag = parts[1];
  let plan: SubscriptionPlan = "basic";
  if (planTag === "GRA") plan = "gratuit";
  else if (planTag === "BAS") plan = "basic";
  else if (planTag === "PRO") plan = "pro";
  else if (planTag === "ENT") plan = "enterprise";

  const durationStr = parts[2].replace("M", "");
  const durationMonths = parseInt(durationStr, 10) || 12;

  return {
    isValid: true,
    plan,
    durationMonths,
  };
}

/**
 * Calculate Remaining Days and Status
 */
export function getSubscriptionStatus(expiryDate: Date | string | null): {
  status: SubscriptionStatus;
  daysRemaining: number;
  isExpired: boolean;
  isUrgent: boolean; // less than 15 days
} {
  if (!expiryDate) {
    return {
      status: "expired",
      daysRemaining: 0,
      isExpired: true,
      isUrgent: true,
    };
  }

  const expTime = new Date(expiryDate).getTime();
  const nowTime = Date.now();
  const diffMs = expTime - nowTime;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;
  const isUrgent = daysRemaining <= 15 && !isExpired;

  return {
    status: isExpired ? "expired" : "active",
    daysRemaining,
    isExpired,
    isUrgent,
  };
}
