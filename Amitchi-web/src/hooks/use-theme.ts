"use client";

import { useState, useEffect, useCallback } from "react";

const THEME_STORAGE_KEY = "edut_theme";
const THEME_EVENT = "edut-theme-change";

export function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [isMounted, setIsMounted] = useState(false);

  const applyThemeToDOM = useCallback((newTheme: "dark" | "light") => {
    if (typeof document === "undefined") return;
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    let currentTheme: "dark" | "light" = "dark";

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light") {
        currentTheme = "light";
      } else if (saved === "dark") {
        currentTheme = "dark";
      } else {
        // Default to dark, or check prefers-color-scheme if preferred
        currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      }
    } catch {
      currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    }

    setThemeState(currentTheme);
    applyThemeToDOM(currentTheme);

    // Synchronize across components and tabs
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setThemeState(customEvent.detail);
        applyThemeToDOM(customEvent.detail);
      } else {
        const isDarkNow = document.documentElement.classList.contains("dark");
        setThemeState(isDarkNow ? "dark" : "light");
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeState(e.newValue);
        applyThemeToDOM(e.newValue);
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [applyThemeToDOM]);

  const setTheme = useCallback(
    (newTheme: "dark" | "light") => {
      setThemeState(newTheme);
      applyThemeToDOM(newTheme);

      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (e) {
        console.warn("Theme storage error:", e);
      }

      // Notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: newTheme }));
      }
    },
    [applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    const isDarkNow = document.documentElement.classList.contains("dark");
    const nextTheme: "dark" | "light" = isDarkNow ? "light" : "dark";
    setTheme(nextTheme);
  }, [setTheme]);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
    isMounted,
  };
}
