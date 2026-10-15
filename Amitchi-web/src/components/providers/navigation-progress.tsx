"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationProgressContextValue {
  isNavigating: boolean;
  progress: number;
  startNavigation: () => void;
  finishNavigation: () => void;
}

const NavigationProgressContext = React.createContext<NavigationProgressContextValue>({
  isNavigating: false,
  progress: 0,
  startNavigation: () => {},
  finishNavigation: () => {},
});

export function useNavigationProgress() {
  return React.useContext(NavigationProgressContext);
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
  };

  const startNavigation = React.useCallback(() => {
    clearTimers();
    setIsNavigating(true);
    setProgress(5);

    // Animate from 5% to 85% over ~800ms
    let current = 5;
    timerRef.current = setInterval(() => {
      current += Math.random() * 12 + 4;
      if (current >= 85) {
        current = 85;
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setProgress(current);
    }, 120);
  }, []);

  const finishNavigation = React.useCallback(() => {
    clearTimers();
    setProgress(100);
    finishTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 400);
  }, []);

  // Detect route change completion
  React.useEffect(() => {
    finishNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ isNavigating, progress, startNavigation, finishNavigation }}>
      {children}
    </NavigationProgressContext.Provider>
  );
}
