import { localDb } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";

type OfflineTable = 
  | "students" 
  | "exams" 
  | "examResults" 
  | "studentResults"
  | "devoirs"
  | "subjects" 
  | "feePayments" 
  | "attendanceBatches"
  | "documents"
  | "library"
  | "canevas";

interface MutationOptions<T> {
  targetTable: OfflineTable;
  onlineAction: (payload: T) => Promise<{ success?: boolean; error?: string; action?: string; id?: number }>;
  onSuccess?: (res: { success: boolean; action?: string; id?: number }) => void;
  entity?: string;
  entityId?: string | number | null;
  idempotencyKey?: string;
  priority?: number;
  userId?: string | number | null;
  schoolId?: string | number | null;
  userName?: string | null;
  schoolName?: string | null;
}

const SYNC_SUPPORTED_TABLES = new Set<OfflineTable>([
  "students", 
  "exams", 
  "examResults", 
  "studentResults",
  "devoirs",
  "feePayments", 
  "attendanceBatches",
  "documents",
  "library",
  "canevas"
]);

type OfflineMutationResult = {
  success: boolean;
  error?: string;
  fromCloud?: boolean;
  fromLocal?: boolean;
};

export function useOfflineMutation<T>() {
  const isOnline = useOnlineStatus();

  const mutate = async (payload: T, options: MutationOptions<T>): Promise<OfflineMutationResult> => {
    const { targetTable, onlineAction, onSuccess } = options;

    if (isOnline) {
      try {
        const res = await onlineAction(payload);
        if (res?.success) {
          const localPayload = {
            ...payload,
            id: res.id,
            updatedAt: Date.now(),
          };

          if (targetTable in localDb) {
            await (localDb as any)[targetTable].put(localPayload as any);
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("edut:table-updated", {
              detail: { targetTable, action: (payload as any).id ? "update" : "insert", item: localPayload }
            }));
          }

          onSuccess?.({ success: true, action: res.action, id: res.id });
          return { success: true, fromCloud: true };
        }

        toast.error(res?.error || "Erreur sur le serveur.");
        return { success: false, error: res?.error };
      } catch (error) {
        console.warn("[useOfflineMutation] Server action failed, falling back to local queue:", error);
        return queueOffline(payload, options);
      }
    }

    return queueOffline(payload, options);
  };

  const queueOffline = async (payload: T, options: MutationOptions<T>) => {
    const { targetTable, onSuccess } = options;

    try {
      if (!SYNC_SUPPORTED_TABLES.has(targetTable)) {
        const message = `La table ${targetTable} n'est pas encore synchronisable hors-ligne.`;
        toast.error(message);
        return { success: false, error: message };
      }

      // 1. Resolve userId, schoolId, userName, and schoolName with multi-tier offline-first fallbacks
      let userId: string | number | null = options.userId || (payload as any)?.userId || null;
      let schoolId: string | number | null = options.schoolId || (payload as any)?.schoolId || null;
      let userName: string | null = options.userName || (payload as any)?.recordedBy || (payload as any)?.userName || null;
      let schoolName: string | null = options.schoolName || (payload as any)?.schoolName || null;

      // Tier 1: Check localStorage for cached user session or active school
      if (typeof window !== "undefined" && (!userId || !schoolId || !userName || !schoolName)) {
        try {
          const cachedSchoolId = localStorage.getItem("active_school_id") || localStorage.getItem("edut_school_id");
          if (cachedSchoolId && !schoolId) schoolId = Number(cachedSchoolId) || null;

          const cachedSchoolName = localStorage.getItem("active_school_name") || localStorage.getItem("edut_school_name");
          if (cachedSchoolName && !schoolName) schoolName = cachedSchoolName;

          const cachedSessionStr = localStorage.getItem("edut_user_session") || localStorage.getItem("edut_session_user");
          if (cachedSessionStr) {
            const cachedUser = JSON.parse(cachedSessionStr);
            if (!userId) userId = cachedUser.id || cachedUser.utilisateur || null;
            if (!userName) userName = cachedUser.nomPrenom || (cachedUser.prenom || cachedUser.nom ? `${cachedUser.prenom || ""} ${cachedUser.nom || ""}`.trim() : cachedUser.utilisateur || cachedUser.name || null);
            if (!schoolId) schoolId = cachedUser.schoolId || cachedUser.school?.id || null;
            if (!schoolName) schoolName = cachedUser.school?.name || cachedUser.schoolName || null;
          }
        } catch (_) {}
      }

      // Tier 2: Check IndexedDB localDb.references for cached session
      if (!userId || !schoolId || !userName || !schoolName) {
        try {
          const sessionRef = await localDb.references.where("type").equals("session" as any).first();
          if (sessionRef?.payload) {
            if (!userId) userId = sessionRef.payload.id || sessionRef.payload.utilisateur || null;
            if (!userName) userName = sessionRef.payload.nomPrenom || sessionRef.payload.utilisateur || null;
            if (!schoolId) schoolId = sessionRef.payload.schoolId || null;
            if (!schoolName) schoolName = sessionRef.payload.school?.name || sessionRef.payload.schoolName || null;
          }
        } catch (_) {}
      }

      // Tier 3: Check document.cookie for branch / school
      if (typeof document !== "undefined" && !schoolId) {
        try {
          const matchBranch = document.cookie.match(/selected_branch_id=([^;]+)/);
          const matchImpersonated = document.cookie.match(/impersonated_school_id=([^;]+)/);
          const matchSchool = document.cookie.match(/school_id=([^;]+)/);
          const matchedVal = matchImpersonated?.[1] || matchSchool?.[1] || matchBranch?.[1];
          if (matchedVal) schoolId = Number(matchedVal) || null;
        } catch (_) {}
      }

      // Tier 4: Fallback to Supabase auth session if available
      if (!userId || !schoolId || !userName) {
        try {
          const { createClient } = await import("@/shared/utils/supabase/client");
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (!userId) userId = session.user.id;
            if (!userName) userName = (session.user.user_metadata as any)?.full_name || (session.user.user_metadata as any)?.name || session.user.email?.split("@")[0] || null;
            if (!schoolId) {
              schoolId = session.user.user_metadata?.schoolId || session.user.user_metadata?.school_id || null;
            }
          }
        } catch (e) {
          console.warn("[useOfflineMutation] Failed to fetch session from Supabase client Component", e);
        }
      }

      // Tier 5: Absolute default fallbacks to prevent orphaned / anonymous outbox actions
      if (!schoolId) {
        schoolId = 11;
      }
      if (!schoolName) {
        schoolName = "Établissement Scolaire";
      }
      if (!userId) {
        userId = (payload as any)?.recordedBy || "Admin";
      }
      if (!userName) {
        userName = (payload as any)?.recordedBy || (String(userId) === "28" ? "Admin GROUP AIIU-NIGER" : "Admin");
      }

      const now = Date.now();
      const idempotencyKey =
        options.idempotencyKey ||
        (payload as any).idempotencyKey ||
        (payload as any).reference ||
        `${targetTable}:${options.entityId || (payload as any).id || crypto.randomUUID?.() || now}`;
      const localId = (payload as any).id || Math.floor(Math.random() * 1000000);
      const localPayload = {
        ...payload,
        id: localId,
        schoolId: (payload as any)?.schoolId || schoolId,
        idempotencyKey,
        updatedAt: now,
      };

      if (targetTable in localDb) {
        await (localDb as any)[targetTable].put(localPayload as any);
      }

      const priority = options.priority || (
        targetTable === "students" ? 1 :
        targetTable === "feePayments" ? 2 :
        (targetTable === "studentResults" || targetTable === "devoirs" || targetTable === "examResults" || targetTable === "exams") ? 3 :
        targetTable === "attendanceBatches" ? 4 : 5
      );

      const existingQueued = await localDb.outbox
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();

      if (existingQueued && existingQueued.status !== "synced" && existingQueued.status !== "cancelled") {
        await localDb.outbox.update(existingQueued.id!, {
          payload: {
            ...payload,
            id: localId,
            schoolId: (payload as any)?.schoolId || schoolId,
            idempotencyKey,
          },
          status: "pending sync",
          priority,
          updatedAt: now,
          lastError: null,
          userId,
          schoolId,
          userName,
          schoolName,
        });
      } else {
        await localDb.outbox.add({
          actionType: (payload as any).id ? "UPDATE" : "INSERT",
          targetTable,
          entity: options.entity || targetTable,
          entityId: options.entityId || (payload as any).id || localId,
          payload: {
            ...payload,
            id: localId,
            schoolId: (payload as any)?.schoolId || schoolId,
            idempotencyKey,
          },
          status: "pending sync",
          priority,
          timestamp: now,
          updatedAt: now,
          retryCount: 0,
          idempotencyKey,
          lastError: null,
          userId,
          schoolId,
          userName,
          schoolName,
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("edut:table-updated", {
          detail: { targetTable, action: (payload as any).id ? "update" : "insert", item: localPayload }
        }));
      }

      toast.warning("Modifications enregistrées localement (hors-ligne).");

      const res = { success: true, action: (payload as any).id ? "update" : "insert", id: localId };
      onSuccess?.(res);
      return { success: true, fromLocal: true };
    } catch (error: any) {
      console.error("[useOfflineMutation] IndexedDB error:", error);
      toast.error("Impossible d'enregistrer localement: " + error.message);
      return { success: false, error: error.message };
    }
  };

  return { mutate, isOnline };
}
