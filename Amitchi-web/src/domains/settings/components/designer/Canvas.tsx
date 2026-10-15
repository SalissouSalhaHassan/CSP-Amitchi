"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { DesignerElement, PageSize, Orientation, PAGE_DIMENSIONS } from "./types";
import { Move, RotateCw, Lock, EyeOff, Table, QrCode, Barcode, ShieldCheck, CheckSquare } from "lucide-react";

interface CanvasProps {
  elements: DesignerElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignerElement>) => void;
  pageSize: PageSize;
  orientation: Orientation;
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
}

export default function Canvas({
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  pageSize,
  orientation,
  zoom,
  showGrid,
  showRulers,
  snapToGrid,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  const baseDim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
  const pageWidth = orientation === "landscape" ? baseDim.height : baseDim.width;
  const pageHeight = orientation === "landscape" ? baseDim.width : baseDim.height;

  const scale = zoom / 100;

  // Sorting elements by Z-Index
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent, el: DesignerElement) => {
    if (el.locked || el.hidden) return;
    e.stopPropagation();
    onSelect(el.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialElX = el.x;
    const initialElY = el.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      let newX = Math.round(initialElX + dx);
      let newY = Math.round(initialElY + dy);

      // Snap alignment system (Canva-style)
      const guides: { x?: number; y?: number } = {};
      if (snapToGrid) {
        const snapThreshold = 6;
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;

        // Snap to center
        if (Math.abs(newX + el.width / 2 - centerX) < snapThreshold) {
          newX = centerX - el.width / 2;
          guides.x = centerX;
        }
        if (Math.abs(newY + el.height / 2 - centerY) < snapThreshold) {
          newY = centerY - el.height / 2;
          guides.y = centerY;
        }

        // Snap to page edges
        if (Math.abs(newX) < snapThreshold) { newX = 0; guides.x = 0; }
        if (Math.abs(newY) < snapThreshold) { newY = 0; guides.y = 0; }
        if (Math.abs(newX + el.width - pageWidth) < snapThreshold) { newX = pageWidth - el.width; guides.x = pageWidth; }
        if (Math.abs(newY + el.height - pageHeight) < snapThreshold) { newY = pageHeight - el.height; guides.y = pageHeight; }
      }

      setSnapLines(guides);
      onUpdateElement(el.id, { x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setSnapLines({});
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Resize Handle Dragging
  const handleResizeStart = (e: React.PointerEvent, el: DesignerElement, handle: string) => {
    if (el.locked) return;
    e.stopPropagation();
    setResizingId(el.id);
    setResizeHandle(handle);

    const startX = e.clientX;
    const startY = e.clientY;
    const { x, y, width, height } = el;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      let newW = width;
      let newH = height;
      let newX = x;
      let newY = y;

      if (handle.includes("e")) newW = Math.max(20, width + dx);
      if (handle.includes("s")) newH = Math.max(10, height + dy);
      if (handle.includes("w")) {
        const potentialW = width - dx;
        if (potentialW > 20) {
          newW = potentialW;
          newX = x + dx;
        }
      }
      if (handle.includes("n")) {
        const potentialH = height - dy;
        if (potentialH > 10) {
          newH = potentialH;
          newY = y + dy;
        }
      }

      onUpdateElement(el.id, { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
    };

    const handlePointerUp = () => {
      setResizingId(null);
      setResizeHandle(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Rotation Handle Dragging
  const handleRotateStart = (e: React.PointerEvent, el: DesignerElement) => {
    if (el.locked) return;
    e.stopPropagation();
    setRotatingId(el.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + (el.x + el.width / 2) * scale;
    const centerY = rect.top + (el.y + el.height / 2) * scale;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const radians = Math.atan2(moveEvent.clientX - centerX, -(moveEvent.clientY - centerY));
      let degrees = Math.round(radians * (180 / Math.PI));
      if (degrees < 0) degrees += 360;

      // Snap angles
      const snapAngles = [0, 15, 30, 45, 90, 180, 270, 360];
      for (const angle of snapAngles) {
        if (Math.abs(degrees - angle) < 4) {
          degrees = angle % 360;
          break;
        }
      }

      onUpdateElement(el.id, { rotation: degrees });
    };

    const handlePointerUp = () => {
      setRotatingId(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="relative flex-1 overflow-auto bg-slate-200/80 dark:bg-slate-950 p-8 flex items-center justify-center select-none" onClick={() => onSelect(null)}>
      {/* Rulers Container */}
      {showRulers && (
        <>
          <div className="absolute top-0 left-0 right-0 h-6 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 flex items-center px-8 text-[9px] font-mono text-slate-500 dark:text-slate-400 z-10 pointer-events-none">
            {Array.from({ length: Math.ceil(pageWidth / 50) }).map((_, i) => (
              <span key={i} style={{ width: 50 * scale }} className="border-l border-slate-300 dark:border-slate-800 h-3 pl-1">
                {i * 50}
              </span>
            ))}
          </div>
          <div className="absolute top-0 left-0 bottom-0 w-6 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex flex-col items-center py-8 text-[9px] font-mono text-slate-500 dark:text-slate-400 z-10 pointer-events-none">
            {Array.from({ length: Math.ceil(pageHeight / 50) }).map((_, i) => (
              <span key={i} style={{ height: 50 * scale }} className="border-t border-slate-300 dark:border-slate-800 w-3 pt-1">
                {i * 50}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Main WYSIWYG Page Sheet */}
      <div
        ref={canvasRef}
        style={{
          width: pageWidth * scale,
          height: pageHeight * scale,
          transformOrigin: "center center",
        }}
        className={`relative bg-white shadow-2xl transition-all border border-slate-300 overflow-hidden ${
          showGrid ? "bg-grid-pattern" : ""
        }`}
      >
        {/* Alignment Guide Lines */}
        {snapLines.x !== undefined && (
          <div className="absolute top-0 bottom-0 border-r-2 border-dashed border-rose-500 z-50 pointer-events-none" style={{ left: snapLines.x * scale }} />
        )}
        {snapLines.y !== undefined && (
          <div className="absolute left-0 right-0 border-b-2 border-dashed border-rose-500 z-50 pointer-events-none" style={{ top: snapLines.y * scale }} />
        )}

        {/* Render Elements */}
        {sortedElements.map((el) => {
          if (el.hidden) return null;
          const isSelected = el.id === selectedId;

          return (
            <div
              key={el.id}
              onPointerDown={(e) => handlePointerDown(e, el)}
              style={{
                position: "absolute",
                left: el.x * scale,
                top: el.y * scale,
                width: el.width * scale,
                height: el.height * scale,
                transform: `rotate(${el.rotation || 0}deg)`,
                opacity: el.opacity ?? 1,
                zIndex: el.zIndex,
              }}
              className={`group cursor-move transition-shadow ${
                isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : "hover:ring-1 hover:ring-indigo-300"
              }`}
            >
              {/* Element Inner Content Renderer */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  fontFamily: el.fontFamily || "Times New Roman",
                  fontSize: (el.fontSize || 16) * scale,
                  fontWeight: el.fontWeight || "normal",
                  fontStyle: el.fontStyle || "normal",
                  textDecoration: el.textDecoration || "none",
                  textTransform: el.textTransform || "none",
                  textAlign: el.textAlign || "left",
                  color: el.color || "#000000",
                  backgroundColor: el.backgroundColor || "transparent",
                  borderColor: el.borderColor || "transparent",
                  borderWidth: (el.borderWidth || 0) * scale,
                  borderRadius: (el.borderRadius || 0) * scale,
                  borderStyle: el.borderStyle || "solid",
                  paddingTop: (el.paddingTop || 0) * scale,
                  paddingRight: (el.paddingRight || 0) * scale,
                  paddingBottom: (el.paddingBottom || 0) * scale,
                  paddingLeft: (el.paddingLeft || 0) * scale,
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : "normal",
                  lineHeight: el.lineHeight || 1.2,
                  boxShadow: el.boxShadowEnabled
                    ? `${el.boxShadowOffsetX || 0}px ${el.boxShadowOffsetY || 2}px ${el.boxShadowBlur || 4}px ${el.boxShadowColor || "rgba(0,0,0,0.1)"}`
                    : "none",
                }}
                className="overflow-hidden flex items-center"
              >
                {el.type === "text" || el.type === "variable" || el.type === "date" || el.type === "pageNumber" ? (
                  <span className="w-full break-words">{el.content}</span>
                ) : el.type === "shape" ? (
                  <div
                    style={{
                      borderRadius: el.shapeType === "circle" ? "50%" : el.borderRadius || 0,
                    }}
                    className="w-full h-full"
                  />
                ) : el.type === "logo" || el.type === "image" ? (
                  <img src={el.src || "/placeholder-logo.png"} alt={el.name} className="w-full h-full object-contain pointer-events-none" />
                ) : el.type === "table" ? (
                  <table className="w-full h-full border-collapse border border-slate-400 text-center text-[10px]">
                    <tbody>
                      {(el.tableData || [["C1", "C2"], ["R1", "R2"]]).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="border border-slate-400 p-1 font-bold">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : el.type === "qrcode" ? (
                  <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center rounded p-1">
                    <QrCode size={24 * scale} />
                    <span className="text-[7px] font-mono tracking-tighter truncate mt-0.5">{el.content}</span>
                  </div>
                ) : el.type === "barcode" ? (
                  <div className="w-full h-full bg-white border border-slate-300 flex flex-col items-center justify-center p-1">
                    <Barcode size={28 * scale} />
                    <span className="text-[7px] font-mono tracking-tighter">{el.content}</span>
                  </div>
                ) : el.type === "signature" || el.type === "stamp" ? (
                  <div className="w-full h-full border-2 border-dashed border-indigo-400 bg-indigo-50/50 rounded flex flex-col items-center justify-center text-indigo-700 font-bold p-1">
                    <ShieldCheck size={20 * scale} />
                    <span className="text-[9px] font-black uppercase">{el.content}</span>
                  </div>
                ) : null}
              </div>

              {/* Handles & Transform Indicators for Selected Element */}
              {isSelected && !el.locked && (
                <>
                  {/* Rotation Top Handle */}
                  <div
                    onPointerDown={(e) => handleRotateStart(e, el)}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                    title="Faire pivoter"
                  >
                    <RotateCw size={12} />
                  </div>

                  {/* 8 Resize Handles */}
                  {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                    const positions: Record<string, string> = {
                      nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
                      n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                      ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
                      e: "top-1.5 -right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                      se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                      s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                      sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                      w: "top-1.5 -left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                    };

                    return (
                      <div
                        key={h}
                        onPointerDown={(e) => handleResizeStart(e, el, h)}
                        className={`absolute w-3 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-md z-30 ${positions[h]}`}
                      />
                    );
                  })}
                </>
              )}

              {/* Lock Indicator */}
              {el.locked && isSelected && (
                <div className="absolute -top-3 -right-3 p-1 bg-amber-500 text-white rounded-full shadow">
                  <Lock size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
