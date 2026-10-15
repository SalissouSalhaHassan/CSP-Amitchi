"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEY_DISMISSED = "edut_pwa_install_dismissed_until";
const STORAGE_KEY_INSTALLED = "edut_pwa_installed";
const DEFAULT_SNOOZE_DAYS = 3;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Check if currently running in standalone / installed mode
  const checkIsStandalone = useCallback(() => {
    if (typeof window === "undefined") return false;
    const isStandaloneMQ = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isAndroidStandalone = document.referrer.includes("android-app://");
    return isStandaloneMQ || isIOSStandalone || isAndroidStandalone;
  }, []);

  // Check if user previously snoozed the prompt
  const isSnoozed = useCallback(() => {
    if (typeof window === "undefined") return false;
    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!dismissedUntil) return false;
    const expiry = parseInt(dismissedUntil, 10);
    return !isNaN(expiry) && Date.now() < expiry;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect standalone
    const standalone = checkIsStandalone();
    if (standalone) {
      setIsInstalled(true);
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      setIsReady(true);
      return;
    }

    if (localStorage.getItem(STORAGE_KEY_INSTALLED) === "true") {
      setIsInstalled(true);
    }

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    const iosSafari = isIosDevice && isSafari;
    setIsIOS(iosSafari);

    // If iOS Safari and not installed and not snoozed, can show banner
    if (iosSafari && !standalone && !isSnoozed()) {
      setShowBanner(true);
    }

    // 3. Listen for beforeinstallprompt (Chromium, Edge, Opera, Samsung Internet)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !isSnoozed()) {
        setShowBanner(true);
      }
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
      setShowIOSGuide(false);
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      toast.success("Application installée avec succès !", {
        description: "Edut Pro est désormais disponible sur votre écran d'accueil.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    setIsReady(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [checkIsStandalone, isSnoozed]);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (isIOS) {
      setShowIOSGuide(true);
      return "unavailable";
    }

    if (!deferredPrompt) {
      return "unavailable";
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
        return "accepted";
      } else {
        snooze(DEFAULT_SNOOZE_DAYS);
        return "dismissed";
      }
    } catch (error) {
      console.error("Error invoking PWA install prompt:", error);
      return "unavailable";
    }
  }, [deferredPrompt, isIOS]);

  const snooze = useCallback((days: number = DEFAULT_SNOOZE_DAYS) => {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_DISMISSED, expiry.toString());
    setShowBanner(false);
  }, []);

  const dismissPermanently = useCallback(() => {
    // Dismiss for 365 days
    const expiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_DISMISSED, expiry.toString());
    setShowBanner(false);
    setShowIOSGuide(false);
  }, []);

  return {
    canInstall: (!!deferredPrompt || isIOS) && !isInstalled,
    isInstalled,
    isIOS,
    showBanner: showBanner && !isInstalled,
    showIOSGuide,
    isReady,
    promptInstall,
    snooze,
    dismissPermanently,
    setShowIOSGuide,
    setShowBanner,
  };
}
