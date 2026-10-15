"use client";

import * as React from "react";
import { useNavigationProgress } from "@/components/providers/navigation-progress";

export function DashboardLoadingBar() {
  const { isNavigating, progress } = useNavigationProgress();

  return (
    <>
      {/* ── Top Progress Bar ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        style={{ height: "3px" }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)",
            boxShadow: "0 0 12px 2px rgba(99,102,241,0.6)",
            borderRadius: "0 2px 2px 0",
            transition:
              isNavigating && progress < 100
                ? "width 0.12s ease-out"
                : "width 0.3s ease-out",
            opacity: isNavigating || progress > 0 ? 1 : 0,
          }}
        />
      </div>

      {/* ── Center Screen Overlay + Spinner ── */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center transition-all duration-300"
        style={{
          background: "rgba(248,250,252,0.55)",
          backdropFilter: isNavigating && progress < 100 ? "blur(3px)" : "blur(0px)",
          opacity: isNavigating && progress < 100 ? 1 : 0,
        }}
      >
        {/* Spinner card */}
        <div
          className="flex flex-col items-center gap-4 px-8 py-6 rounded-3xl transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 20px 60px -10px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.06)",
            transform: isNavigating && progress < 100 ? "scale(1)" : "scale(0.85)",
            opacity: isNavigating && progress < 100 ? 1 : 0,
            border: "1px solid rgba(99,102,241,0.12)",
          }}
        >
          {/* Spinner ring */}
          <div className="relative w-14 h-14">
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #6366f1, #8b5cf6, #ec4899, transparent)",
                animation: "spin 0.9s linear infinite",
                borderRadius: "50%",
                padding: "3px",
              }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{ background: "white" }}
              />
            </div>

            {/* Inner logo dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-5 h-5 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.5)",
                }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <p
              className="text-sm font-black tracking-wide"
              style={{ color: "#4f46e5" }}
            >
              Chargement...
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Veuillez patienter
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
