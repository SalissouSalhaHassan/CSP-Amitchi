"use server";

import { db } from "@/infrastructure/database";
import { settings, schoolBranches } from "@/infrastructure/database/schema/settings";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { revalidatePath, unstable_cache, revalidateTag as nextRevalidateTag } from "next/cache";
const revalidateTag = nextRevalidateTag as any;
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { cache as redisCache } from "@/lib/redis";
import {
  DOCUMENT_HEADER_SETTING_KEY,
  mergeDocumentHeaderConfig,
  getActiveLevelHeaderConfig,
  isLevelMatching,
  inferEducationalLevel,
  isHigherEducationLevel,
  type DocumentHeaderConfig,
} from "@/domains/printing/document-header";

const SETTINGS_TAG = "settings-cache";
const BRANCHES_TAG = "branches-cache";

// --- Cached Data Fetchers ---

const fetchCachedBranches = (schoolId: number) =>
  unstable_cache(
    async () => {
      console.log(`🔄 [Cache Miss] Fetching branches from DB for School ${schoolId}...`);
      return await db.query.schoolBranches.findMany({
        where: eq(schoolBranches.schoolId, schoolId),
        orderBy: [desc(schoolBranches.createdAt)]
      });
    },
    ["all-branches", String(schoolId)],
    { tags: [BRANCHES_TAG], revalidate: 3600 } // Cache for 1 hour
  )();

const fetchCachedSettings = (schoolId: number) =>
  unstable_cache(
    async () => {
      console.log(`🔄 [Cache Miss] Fetching settings from DB for School ${schoolId}...`);
      try {
        return await db.query.settings.findMany({
          where: eq(settings.schoolId, schoolId)
        });
      } catch (e) {
        return [];
      }
    },
    ["all-settings", String(schoolId)],
    { tags: [SETTINGS_TAG], revalidate: 3600 }
  )();

export async function getBranches() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    
    // Automatically provision new administrative fields if they do not exist
    try {
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "ministry" varchar(255)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "region" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "dren" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "department" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "dden" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "inspection" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "commune" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "school_code" varchar(50)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "vu_clauses" text`);
    } catch (err) {
      console.error("Error migrating columns in getBranches:", err);
    }

    const data = await fetchCachedBranches(schoolId);
    return { data };
  });
}

export async function getBranchByLevel(level: string) {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const allBranches = await fetchCachedBranches(schoolId);
    
    let branch = allBranches.find(b => 
      isLevelMatching(b.instType || "", level) || isLevelMatching(b.branchName || "", level)
    );

    if (!branch && allBranches.length > 0) {
      const isUniv = isHigherEducationLevel(level);
      if (isUniv) {
        branch = allBranches.find(b => b.instType?.toLowerCase().includes("univ") || b.branchName?.toLowerCase().includes("univ"));
      } else {
        branch = allBranches.find(b => !b.instType?.toLowerCase().includes("univ") && !b.branchName?.toLowerCase().includes("univ"));
      }
      if (!branch) {
        branch = allBranches[0];
      }
    }

    return { data: branch || null };
  });
}

export async function saveBranch(data: any) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, ...rest } = data;
    
    // Automatically alter database column types to support longer prefixes, padding, and ports
    try {
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "adm_prefix" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "adm_padding" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "smtp_port" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "working_days" TYPE varchar(255)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "inst_type" TYPE varchar(255)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "inst_category" TYPE varchar(255)`);
      
      // Ensure new administrative fields are created
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "ministry" varchar(255)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "region" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "dren" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "department" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "dden" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "inspection" varchar(150)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "commune" varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "school_code" varchar(50)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "vu_clauses" text`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "primary_color" varchar(30)`);
      await db.execute(sql`ALTER TABLE "school_branches" ADD COLUMN IF NOT EXISTS "secondary_color" varchar(30)`);
      
      console.log("Database schema altered successfully inside saveBranch action.");
    } catch (err) {
      console.error("Error altering database columns inside saveBranch:", err);
    }
    
    // Sanitize workingDays array to a comma-separated string
    if (rest.workingDays && Array.isArray(rest.workingDays)) {
      rest.workingDays = rest.workingDays.join(",");
    }

    // Sanitize vuClauses array to JSON string
    if (rest.vuClauses && Array.isArray(rest.vuClauses)) {
      rest.vuClauses = JSON.stringify(rest.vuClauses.filter(Boolean));
    }
    
    let effectiveBranchId = id;

    if (id) {
      await db.update(schoolBranches)
        .set(rest)
        .where(and(
          eq(schoolBranches.id, id),
          eq(schoolBranches.schoolId, schoolId)
        ));
    } else {
      const inserted = await db.insert(schoolBranches).values({
        ...rest,
        schoolId: schoolId
      }).returning({ id: schoolBranches.id });
      if (inserted && inserted.length > 0) {
        effectiveBranchId = inserted[0].id;
      }
    }

    // Intelligent Bi-directional Sync: update or auto-create official document header profile for this campus
    if (effectiveBranchId) {
      await syncBranchToHeaderConfig(schoolId, rest, effectiveBranchId);
    }
    
    revalidateTag(BRANCHES_TAG);
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/campus-setup");
    revalidatePath("/dashboard/settings/headers");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    try {
      await redisCache.del(`edut:header_config:${schoolId}`);
    } catch (_) {}
    return { success: true, branchId: effectiveBranchId };
  });
}

export async function deleteBranch(id: number) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolBranches).where(and(
      eq(schoolBranches.id, id),
      eq(schoolBranches.schoolId, schoolId)
    ));
    
    // Unlink or clean header profile for this deleted branch
    await removeBranchFromHeaderConfig(schoolId, id);

    revalidateTag(BRANCHES_TAG);
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/campus-setup");
    revalidatePath("/dashboard/settings/headers");
    return { success: true };
  });
}

async function syncBranchToHeaderConfig(schoolId: number, branch: any, branchId: number) {
  try {
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });

    let currentConfig: DocumentHeaderConfig = existing?.value
      ? mergeDocumentHeaderConfig(JSON.parse(existing.value))
      : mergeDocumentHeaderConfig();

    const profiles = [...(currentConfig.levelProfiles || [])];
    const existingIdx = profiles.findIndex((p) => Number(p.branchId) === Number(branchId));

    // Determine applicable levels from instType
    let applicableLevels: string[] = [];
    if (branch.instType) {
      if (branch.instType === "Tous") {
        applicableLevels = ["Primaire", "College", "Lycée", "University"];
      } else {
        applicableLevels = branch.instType.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (applicableLevels.length === 0) {
      applicableLevels = ["Primaire"];
    }

    const defaultLevel = applicableLevels[0] || "Primaire";
    const profileName = `En-tête ${branch.branchName || "Campus"}${applicableLevels.length > 0 ? ` (${applicableLevels.join(" + ")})` : ""}`;

    let parsedVuClauses: string[] | undefined = undefined;
    if (branch.vuClauses) {
      if (Array.isArray(branch.vuClauses)) {
        parsedVuClauses = branch.vuClauses;
      } else if (typeof branch.vuClauses === "string" && branch.vuClauses.startsWith("[")) {
        try { parsedVuClauses = JSON.parse(branch.vuClauses); } catch (_) {}
      } else if (typeof branch.vuClauses === "string") {
        parsedVuClauses = branch.vuClauses.split("\n").filter(Boolean);
      }
    }

    const updatedHeaderConfig: Partial<DocumentHeaderConfig> = {
      schoolName: branch.branchName || currentConfig.schoolName,
      campusSubtitle: branch.branchAlias || "",
      ministry: branch.ministry || currentConfig.ministry,
      regionalDirection: branch.dren || currentConfig.regionalDirection,
      departmentalDirection: branch.dden || currentConfig.departmentalDirection,
      inspection: branch.inspection || currentConfig.inspection,
      commune: branch.commune || currentConfig.commune,
      schoolCode: branch.schoolCode || currentConfig.schoolCode,
      address: branch.address || currentConfig.address,
      phone: branch.contactNo || branch.officeNo || currentConfig.phone,
      email: branch.email || currentConfig.email,
      primaryColor: branch.primaryColor || currentConfig.primaryColor || "#4f46e5",
      secondaryColor: branch.secondaryColor || currentConfig.secondaryColor || "#10b981",
      style: defaultLevel === "University" ? "university_formal" : currentConfig.style,
      authorizationText: parsedVuClauses ? parsedVuClauses.join("\n") : currentConfig.authorizationText,
      vuClauses: parsedVuClauses || currentConfig.vuClauses,
    };

    if (existingIdx >= 0) {
      profiles[existingIdx] = {
        ...profiles[existingIdx],
        name: profileName,
        branchId: Number(branchId),
        branchName: branch.branchName,
        applicableLevels,
        leftLogo: branch.logoPath || profiles[existingIdx].leftLogo || currentConfig.leftLogo,
        headerConfig: {
          ...profiles[existingIdx].headerConfig,
          ...updatedHeaderConfig,
          leftLogo: branch.logoPath || profiles[existingIdx].headerConfig?.leftLogo || currentConfig.leftLogo,
        }
      };
    } else {
      const newId = `profile_branch_${branchId}_${Date.now().toString(36)}`;
      profiles.push({
        id: newId,
        name: profileName,
        branchId: Number(branchId),
        branchName: branch.branchName,
        applicableLevels,
        leftLogo: branch.logoPath || currentConfig.leftLogo,
        centerLogo: currentConfig.centerLogo,
        rightLogo: currentConfig.rightLogo,
        headerConfig: {
          ...updatedHeaderConfig,
          leftLogo: branch.logoPath || currentConfig.leftLogo,
        },
      });
    }

    currentConfig.levelProfiles = profiles;
    const value = JSON.stringify(currentConfig);

    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({ key: DOCUMENT_HEADER_SETTING_KEY, value, schoolId });
    }

    try {
      await redisCache.del(`edut:header_config:${schoolId}`);
    } catch (_) {}
  } catch (err) {
    console.error("Error in syncBranchToHeaderConfig:", err);
  }
}

async function removeBranchFromHeaderConfig(schoolId: number, branchId: number) {
  try {
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });
    if (existing?.value) {
      const currentConfig = mergeDocumentHeaderConfig(JSON.parse(existing.value));
      currentConfig.levelProfiles = (currentConfig.levelProfiles || []).filter(
        (p) => Number(p.branchId) !== Number(branchId)
      );
      await db.update(settings).set({ value: JSON.stringify(currentConfig), updatedAt: new Date() }).where(eq(settings.id, existing.id));
      await redisCache.del(`edut:header_config:${schoolId}`);
    }
  } catch (err) {
    console.error("Error in removeBranchFromHeaderConfig:", err);
  }
}

export async function syncHeaderProfileToBranch(branchId: number, data: Partial<DocumentHeaderConfig>) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!branchId) return { success: false, error: "Branch ID requis" };

    const updatePayload: Record<string, any> = {};
    if (data.schoolName) updatePayload.branchName = data.schoolName;
    if (data.campusSubtitle !== undefined) updatePayload.branchAlias = data.campusSubtitle;
    if (data.ministry !== undefined) updatePayload.ministry = data.ministry;
    if (data.regionalDirection !== undefined) updatePayload.dren = data.regionalDirection;
    if (data.departmentalDirection !== undefined) updatePayload.dden = data.departmentalDirection;
    if (data.inspection !== undefined) updatePayload.inspection = data.inspection;
    if (data.commune !== undefined) updatePayload.commune = data.commune;
    if (data.schoolCode !== undefined) updatePayload.schoolCode = data.schoolCode;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.phone !== undefined) updatePayload.contactNo = data.phone;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.leftLogo !== undefined) updatePayload.logoPath = data.leftLogo;
    if (data.primaryColor !== undefined) updatePayload.primaryColor = data.primaryColor;
    if (data.secondaryColor !== undefined) updatePayload.secondaryColor = data.secondaryColor;
    if (data.authorizationText !== undefined) {
      updatePayload.vuClauses = JSON.stringify(data.authorizationText.split("\n").filter(Boolean));
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.update(schoolBranches)
        .set(updatePayload)
        .where(and(
          eq(schoolBranches.id, Number(branchId)),
          eq(schoolBranches.schoolId, schoolId)
        ));
    }

    revalidateTag(BRANCHES_TAG);
    revalidatePath("/dashboard/campus-setup");
    revalidatePath("/dashboard/settings");

    return { success: true };
  });
}

export async function syncAllBranchesToHeaders() {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const branches = await db.query.schoolBranches.findMany({
      where: eq(schoolBranches.schoolId, schoolId)
    });

    for (const branch of branches) {
      await syncBranchToHeaderConfig(schoolId, branch, branch.id);
    }

    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings/headers");
    return { success: true, count: branches.length };
  });
}


export async function updateSchoolDomain(customDomain: string) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) throw new Error("School not found");

    await db.update(schools)
      .set({ customDomain: customDomain?.toLowerCase() || null })
      .where(eq(schools.id, schoolId));
    
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function getSettings() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const data = await fetchCachedSettings(schoolId);
    return { data };
  });
}

export async function updateSetting(key: string, value: string) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, key),
        eq(settings.schoolId, schoolId)
      )
    });

    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key,
        value,
        schoolId: schoolId
      });
    }

    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function fetchDocumentHeaderConfigForSchool(
  schoolId: number,
  targetLevel?: string | null,
  targetBranchId?: number | string | null
) {
  const cacheKey = `edut:header_config:${schoolId}`;
  let configData: DocumentHeaderConfig | null = null;

  try {
    const cached = await redisCache.get<DocumentHeaderConfig>(cacheKey);
    if (cached) {
      configData = cached;
    }
  } catch (e) {
    console.warn("[Redis Cache] Error checking header config cache:", e);
  }

  if (!configData) {
    // Fetch branch of the school for fallback values (matching targetBranchId and targetLevel if specified)
    let branchFallback: any = null;
    try {
      const branches = await db.query.schoolBranches.findMany({
        where: eq(schoolBranches.schoolId, schoolId),
        orderBy: [desc(schoolBranches.createdAt)]
      });
      if (branches && branches.length > 0) {
        if (targetBranchId) {
          branchFallback = branches.find(b => b.id === Number(targetBranchId));
        }
        if (!branchFallback && targetLevel) {
          // Priority 1: Specific level match (excluding pure "Tous" if a specific branch exists)
          branchFallback = branches.find(b => 
            b.instType !== "Tous" && (isLevelMatching(b.instType || "", targetLevel) || isLevelMatching(b.branchName || "", targetLevel))
          ) || branches.find(b => 
            isLevelMatching(b.instType || "", targetLevel) || isLevelMatching(b.branchName || "", targetLevel)
          );
        }
        if (!branchFallback && targetLevel) {
          const isUniv = isHigherEducationLevel(targetLevel);
          if (isUniv) {
            branchFallback = branches.find(b => b.instType?.toLowerCase().includes("univ") || b.branchName?.toLowerCase().includes("univ"));
          } else {
            branchFallback = branches.find(b => !b.instType?.toLowerCase().includes("univ") && !b.branchName?.toLowerCase().includes("univ"));
          }
        }
        if (!branchFallback) {
          branchFallback = branches[0];
        }
      }
    } catch (e) {
      console.error("Error fetching branch fallback in fetchDocumentHeaderConfigForSchool:", e);
    }

    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });

    if (!existing?.value) {
      configData = mergeDocumentHeaderConfig();
    } else {
      try {
        configData = mergeDocumentHeaderConfig(JSON.parse(existing.value));
      } catch {
        configData = mergeDocumentHeaderConfig();
      }
    }

    // Apply fallbacks from branch if header config fields are missing
    if (branchFallback) {
      if (!configData.schoolName) configData.schoolName = branchFallback.branchName || "";
      if (!configData.ministry) configData.ministry = branchFallback.ministry || "";
      if (!configData.regionalDirection) configData.regionalDirection = branchFallback.dren || branchFallback.region || "";
      if (!configData.departmentalDirection) configData.departmentalDirection = branchFallback.dden || branchFallback.department || "";
      if (!configData.inspection) configData.inspection = branchFallback.inspection || "";
      if (!configData.commune) configData.commune = branchFallback.commune || "";
      if (!configData.schoolCode) configData.schoolCode = branchFallback.schoolCode || "";

      if (branchFallback.vuClauses) {
        try {
          let parsed: string[] = [];
          if (typeof branchFallback.vuClauses === "string" && branchFallback.vuClauses.startsWith("[")) {
            parsed = JSON.parse(branchFallback.vuClauses);
          } else if (typeof branchFallback.vuClauses === "string") {
            parsed = branchFallback.vuClauses.split("\n").filter(Boolean);
          } else if (Array.isArray(branchFallback.vuClauses)) {
            parsed = branchFallback.vuClauses;
          }
          if (parsed && parsed.length > 0) {
            configData.vuClauses = parsed;
          }
        } catch (_) {}
      }

      const branchLogo = branchFallback.logoPath || branchFallback.logo || branchFallback.schoolLogo;
      if (branchLogo) {
        if (!configData.leftLogo) configData.leftLogo = branchLogo;
        if (!configData.rightLogo) configData.rightLogo = branchLogo;
        if (!configData.centerLogo) configData.centerLogo = branchLogo;
      }
    }

    // Fallback to school_logo setting if leftLogo is still empty
    if (!configData.leftLogo) {
      try {
        const logoSetting = await db.query.settings.findFirst({
          where: and(
            or(
              eq(settings.key, "school_logo"),
              eq(settings.key, "logo"),
              eq(settings.key, "schoolLogo")
            ),
            eq(settings.schoolId, schoolId)
          )
        });
        if (logoSetting?.value) {
          configData.leftLogo = logoSetting.value;
          if (!configData.rightLogo) configData.rightLogo = logoSetting.value;
          if (!configData.centerLogo) configData.centerLogo = logoSetting.value;
        }
      } catch (e) {
        console.error("Error fetching logo setting fallback:", e);
      }
    }

    // 2. Store in Redis for 1 hour
    try {
      await redisCache.set(cacheKey, configData, 3600);
    } catch (e) {
      console.warn("[Redis Cache] Error writing header config cache:", e);
    }
  }

  // Resolve branch and level-specific overrides if targetLevel or targetBranchId is provided
  if (configData && (targetLevel || targetBranchId)) {
    return getActiveLevelHeaderConfig(configData, targetLevel, targetBranchId);
  }

  return configData || mergeDocumentHeaderConfig();
}

export async function getDocumentHeaderConfig(
  targetLevel?: string | null,
  targetBranchId?: number | string | null
) {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    let effectiveBranchId = targetBranchId;
    if (!effectiveBranchId) {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const cookieBranch = cookieStore.get("selected_branch_id")?.value;
        if (cookieBranch && cookieBranch !== "all" && !isNaN(parseInt(cookieBranch))) {
          effectiveBranchId = parseInt(cookieBranch);
        }
      } catch (_) {}
    }

    const data = await fetchDocumentHeaderConfigForSchool(schoolId, targetLevel, effectiveBranchId);
    return { data };
  });
}

export async function saveDocumentHeaderConfig(config: DocumentHeaderConfig) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const cleanConfig = mergeDocumentHeaderConfig(config);
    const value = JSON.stringify(cleanConfig);
    
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });

    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key: DOCUMENT_HEADER_SETTING_KEY,
        value,
        schoolId,
      });
    }

    // Invalidate Redis Cache & Next.js cache
    try {
      await redisCache.del(`edut:header_config:${schoolId}`);
    } catch (_) {}

    try {
      if (typeof revalidateTag === "function") {
        revalidateTag(SETTINGS_TAG);
      }
    } catch (_) {}

    return { success: true, saved: true };
  });
}

export async function saveSettings(data: Record<string, string>) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    
    for (const [k, v] of Object.entries(data)) {
      const existing = await db.query.settings.findFirst({ 
        where: and(
          eq(settings.key, k),
          eq(settings.schoolId, schoolId)
        )
      });

      if (existing) {
        await db.update(settings)
          .set({ value: v, updatedAt: new Date() })
          .where(and(
            eq(settings.key, k),
            eq(settings.schoolId, schoolId)
          ));
      } else {
        await db.insert(settings).values({ 
          key: k, 
          value: v,
          schoolId: schoolId 
        });
      }
    }
    
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}

export async function getOfficialTemplates() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    try {
      const { officialTemplates } = await import("@/infrastructure/database/schema/academics");
      const list = await db.select().from(officialTemplates).where(eq(officialTemplates.schoolId, schoolId)).orderBy(desc(officialTemplates.updatedAt));
      return list;
    } catch (e: any) {
      console.error("[getOfficialTemplates] error:", e);
      return [];
    }
  });
}

export async function saveOfficialTemplate(data: { id?: number; name: string; description?: string; pageSize?: string; orientation?: string; jsonDesign: any; isDefault?: boolean }) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    try {
      const { officialTemplates } = await import("@/infrastructure/database/schema/academics");
      if (data.isDefault) {
        await db.update(officialTemplates).set({ isDefault: false }).where(eq(officialTemplates.schoolId, schoolId));
      }

      if (data.id) {
        await db.update(officialTemplates).set({
          name: data.name,
          description: data.description,
          pageSize: data.pageSize || "A4",
          orientation: data.orientation || "portrait",
          jsonDesign: data.jsonDesign,
          isDefault: Boolean(data.isDefault),
          updatedAt: new Date()
        }).where(and(eq(officialTemplates.id, data.id), eq(officialTemplates.schoolId, schoolId)));
        return { success: true, id: data.id };
      } else {
        const [inserted] = await db.insert(officialTemplates).values({
          schoolId,
          name: data.name,
          description: data.description,
          pageSize: data.pageSize || "A4",
          orientation: data.orientation || "portrait",
          jsonDesign: data.jsonDesign,
          isDefault: Boolean(data.isDefault),
        }).returning({ id: officialTemplates.id });
        return { success: true, id: inserted.id };
      }
    } catch (e: any) {
      console.error("[saveOfficialTemplate] error:", e);
      return { error: e.message || "Impossible d'enregistrer le modèle" };
    }
  });
}

export async function deleteOfficialTemplate(id: number) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    try {
      const { officialTemplates } = await import("@/infrastructure/database/schema/academics");
      await db.delete(officialTemplates).where(and(eq(officialTemplates.id, id), eq(officialTemplates.schoolId, schoolId)));
      return { success: true };
    } catch (e: any) {
      return { error: e.message || "Impossible de supprimer le modèle" };
    }
  });
}

export async function getBranchInfo(schoolId?: number) {
  const sid = schoolId || await getActiveSchoolId().catch(() => 1);
  return await fetchCachedBranches(sid);
}

export async function getHeaderConfig(schoolId?: number) {
  const sid = schoolId || await getActiveSchoolId().catch(() => 1);
  return await fetchCachedSettings(sid);
}


