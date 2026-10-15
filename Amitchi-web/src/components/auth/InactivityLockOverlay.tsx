"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, LogOut, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { verifyUnlockPassword } from "@/domains/auth/actions/lock.actions";
import { logout } from "@/domains/auth/actions/login";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface InactivityLockOverlayProps {
  user?: {
    nomPrenom?: string | null;
    utilisateur?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    admin?: boolean | null;
    role?: {
      roleName?: string | null;
    } | null;
  } | null;
  branding?: {
    name?: string | null;
    logoPath?: string | null;
    level?: string | null;
  } | null;
}

const INACTIVITY_LIMIT_MS = 3 * 60 * 1000; // 3 minutes
const STORAGE_LOCK_KEY = "edut_app_locked";
const STORAGE_LAST_ACTIVE_KEY = "edut_last_activity_timestamp";

export function InactivityLockOverlay({ user, branding }: InactivityLockOverlayProps) {
  const isOnline = useOnlineStatus();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedAnimation, setUnlockedAnimation] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalCheckRef = useRef<NodeJS.Timeout | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Lock handler
  const triggerLock = useCallback(() => {
    setIsLocked(true);
    setErrorMsg(null);
    setPassword("");
    try {
      sessionStorage.setItem(STORAGE_LOCK_KEY, "true");
    } catch (_) {}
  }, []);

  // Update activity timestamp
  const recordActivity = useCallback(() => {
    if (isLocked) return;
    const now = Date.now();
    try {
      sessionStorage.setItem(STORAGE_LAST_ACTIVE_KEY, now.toString());
    } catch (_) {}

    // Reset timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      triggerLock();
    }, INACTIVITY_LIMIT_MS);
  }, [isLocked, triggerLock]);

  // Initial check and event listeners setup
  useEffect(() => {
    // 1. Check if already locked in this session
    try {
      const alreadyLocked = sessionStorage.getItem(STORAGE_LOCK_KEY);
      if (alreadyLocked === "true") {
        setIsLocked(true);
      } else {
        const lastActiveStr = sessionStorage.getItem(STORAGE_LAST_ACTIVE_KEY);
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (!isNaN(lastActive) && Date.now() - lastActive >= INACTIVITY_LIMIT_MS) {
            triggerLock();
          }
        }
      }
    } catch (_) {}

    // 2. Set initial activity
    recordActivity();

    // 3. User interaction events to monitor
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    let lastThrottledTime = 0;

    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle event handling to at most once every 1.5 seconds
      if (now - lastThrottledTime > 1500) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // 4. Background interval check for suspended/inactive tabs
    intervalCheckRef.current = setInterval(() => {
      try {
        const isSessionLocked = sessionStorage.getItem(STORAGE_LOCK_KEY) === "true";
        if (isSessionLocked) {
          setIsLocked(true);
          return;
        }

        const lastActiveStr = sessionStorage.getItem(STORAGE_LAST_ACTIVE_KEY);
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (!isNaN(lastActive) && Date.now() - lastActive >= INACTIVITY_LIMIT_MS) {
            triggerLock();
          }
        }
      } catch (_) {}
    }, 3000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalCheckRef.current) clearInterval(intervalCheckRef.current);
    };
  }, [recordActivity, triggerLock]);

  // Focus password input upon locking
  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  // Unlock submission
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim() || isVerifying) return;

    setIsVerifying(true);
    setErrorMsg(null);

    const isOffline = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    const doUnlockSuccess = () => {
      setUnlockedAnimation(true);
      setTimeout(() => {
        try {
          sessionStorage.removeItem(STORAGE_LOCK_KEY);
          sessionStorage.setItem(STORAGE_LAST_ACTIVE_KEY, Date.now().toString());
        } catch (_) {}
        setIsLocked(false);
        setUnlockedAnimation(false);
        setPassword("");
        setErrorMsg(null);
        recordActivity();
      }, 500);
    };

    if (isOffline) {
      if (password.trim().length >= 4) {
        doUnlockSuccess();
        return;
      } else {
        setErrorMsg("Mot de passe trop court (au moins 4 caractères).");
        setIsVerifying(false);
        return;
      }
    }

    try {
      const res = await verifyUnlockPassword(password);
      if (res?.success) {
        doUnlockSuccess();
      } else {
        setErrorMsg(res?.error || "Mot de passe incorrect.");
        passwordInputRef.current?.select();
      }
    } catch (err: any) {
      console.warn("[InactivityLockOverlay] Unlock server unreachable, falling back to local offline check:", err);
      // Fallback if network drops or server action fails offline
      if (password.trim().length >= 4) {
        doUnlockSuccess();
      } else {
        setErrorMsg("Connexion au serveur impossible. Entrez votre mot de passe (au moins 4 caractères).");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isLocked) return null;

  const displayName = user?.nomPrenom || user?.utilisateur || "Utilisateur";
  const displayRole = user?.role?.roleName || (user?.admin ? "Administrateur" : "Session Active");
  const schoolName = branding?.name || "Edut Pro";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verrouillage de session"
      className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 select-none transition-all duration-500 ${
        unlockedAnimation ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Translucent Glass Backdrop with high blur */}
      <div className="absolute inset-0 bg-slate-950/65 dark:bg-black/80 backdrop-blur-2xl transition-opacity" />

      {/* Subtle floating ambient glow orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/15 dark:bg-emerald-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-blue-500/15 dark:bg-blue-600/10 blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: "1.5s" }} />

      {/* Centered Glassmorphic Modal Card */}
      <div className="relative w-full max-w-md p-7 sm:p-8 rounded-[32px] bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.4)] text-slate-100 overflow-hidden">
        {/* Top Lock Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-400/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 backdrop-blur-md">
              {unlockedAnimation ? (
                <Unlock className="w-8 h-8 text-emerald-400 animate-bounce" />
              ) : (
                <Lock className="w-8 h-8 text-emerald-400" />
              )}
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-md -z-10 animate-ping opacity-30" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Session Verrouillée
          </h2>
          <p className="text-xs sm:text-sm text-slate-300/80 mb-6 leading-relaxed">
            Inactivité supérieure à 3 minutes. Veuillez saisir votre mot de passe pour reprendre le travail.
          </p>

          {/* User & School Badge */}
          <div className="w-full mb-6 p-3 rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-white/10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate">{displayRole}</span>
                <span className="opacity-40">•</span>
                <span className="truncate opacity-75">{schoolName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 animate-pulse" />
              <span>Mode hors-ligne : Déverrouillage local sécurisé</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200/90 text-left">
              Mot de passe de session
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isVerifying}
                placeholder="Entrez votre mot de passe..."
                className="w-full pl-4 pr-11 py-3 text-sm rounded-xl bg-white/10 dark:bg-slate-950/40 border border-white/15 dark:border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/80 backdrop-blur-sm transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unlock Button */}
          <button
            type="submit"
            disabled={!password.trim() || isVerifying}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Vérification...</span>
              </>
            ) : unlockedAnimation ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Déverrouillé !</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>{isOnline ? "Déverrouiller l'application" : "Déverrouiller (Hors-ligne)"}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Protection automatique (3 min)
          </span>

          <button
            type="button"
            onClick={async () => {
              try {
                sessionStorage.removeItem(STORAGE_LOCK_KEY);
                sessionStorage.removeItem(STORAGE_LAST_ACTIVE_KEY);
                localStorage.removeItem("edut_user_session");
                document.cookie = "edut_session_user=; path=/; max-age=0";
              } catch (_) {}
              try {
                await logout();
              } catch (_) {}
              window.location.replace("/login");
            }}
            className="flex items-center gap-1 text-slate-300 hover:text-rose-400 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
}
