"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { localDb } from "@/infrastructure/local-db/dexie";
import { syncOutbox } from "@/infrastructure/local-db/sync";

interface SyncStatusProps {
  user?: any;
}

export default function SyncStatus({ user }: SyncStatusProps = {}) {
  const isOnline = useOnlineStatus();
  const [isPending, startTransition] = useTransition();
  const [showStatus, setShowStatus] = useState(true);
  const wasOnline = useRef(isOnline);

  // Cache user and school context for offline operations
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      try {
        const sessionPayload = {
          id: user.id,
          utilisateur: user.utilisateur,
          nomPrenom: user.nomPrenom,
          schoolId: user.schoolId || user.school?.id || 9,
          role: user.role?.roleName || "Administrateur",
        };
        localStorage.setItem("edut_user_session", JSON.stringify(sessionPayload));
        if (sessionPayload.schoolId) {
          localStorage.setItem("active_school_id", String(sessionPayload.schoolId));
        }

        localDb.references.put({
          type: "session" as any,
          remoteId: user.id,
          label: "currentUser",
          payload: sessionPayload,
          updatedAt: Date.now(),
        }).catch(() => {});
      } catch (_) {}
    }
  }, [user]);

  const outboxCount = useLiveQuery(async () => {
    const items = await localDb.outbox.toArray();
    return items.filter((item) => !item.status || item.status === "pending" || item.status === "failed" || item.status === "conflict").length;
  }) ?? 0;

  useEffect(() => {
    const cameBackOnline = !wasOnline.current && isOnline;
    wasOnline.current = isOnline;

    if (cameBackOnline && outboxCount > 0 && !isPending) {
      handleSync();
    }
  }, [isOnline, outboxCount, isPending]);

  const handleSync = () => {
    startTransition(async () => {
      await syncOutbox();
    });
  };

  if (!showStatus) return null;

  const label = !isOnline
    ? "Hors-ligne"
    : isPending
      ? "Mise a jour..."
      : outboxCount > 0
        ? `${outboxCount} en attente`
        : "Synchronise";

  const detail = !isOnline
    ? "Modifications en cache local"
    : isPending
      ? "Envoi au serveur cloud"
      : outboxCount > 0
        ? "Cliquez pour synchroniser"
        : "Connexion cloud stable";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 print:hidden">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-xl transition-all duration-500",
          !isOnline
            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
            : isPending
              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
              : outboxCount > 0
                ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        )}
      >
        <div className="flex items-center justify-center shrink-0">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 animate-bounce" />
          ) : isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : outboxCount > 0 ? (
            <Wifi className="w-4 h-4 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>

        <div className="flex flex-col select-none">
          <span className="text-xs font-black uppercase tracking-widest leading-none">{label}</span>
          <span className="text-[9px] font-semibold opacity-80 mt-0.5 leading-none">{detail}</span>
        </div>

        {isOnline && outboxCount > 0 && !isPending && (
          <button
            onClick={handleSync}
            className="ml-1 p-1 rounded-lg hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer"
            title="Forcer la synchronisation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setShowStatus(false)}
          className="ml-1 text-[10px] font-bold opacity-40 hover:opacity-100 px-1 cursor-pointer"
          title="Masquer"
        >
          x
        </button>
      </div>
    </div>
  );
}
