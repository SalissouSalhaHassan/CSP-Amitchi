"use client";

import { CardElement } from "./types";
import { Layers, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Lock, Eye, EyeOff, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardLayersPanelProps {
  elements: CardElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function CardLayersPanel({
  elements,
  selectedId,
  onSelect,
  onMoveLayer,
  onToggleLock,
  onToggleHide,
  onDuplicate,
  onDelete,
}: CardLayersPanelProps) {
  const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="bg-white dark:bg-[#131622] border-t border-slate-200 dark:border-slate-800 p-3 select-none text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Calques de la carte (Card Layers)</h4>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">({elements.length})</span>
        </div>

        {selectedId && (
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" onClick={() => onMoveLayer(selectedId, "top")} className="h-6 w-6 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" title="Placer tout devant">
              <ArrowUpToLine size={11} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onMoveLayer(selectedId, "up")} className="h-6 w-6 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" title="Avancer">
              <ArrowUp size={11} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onMoveLayer(selectedId, "down")} className="h-6 w-6 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" title="Reculer">
              <ArrowDown size={11} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onMoveLayer(selectedId, "bottom")} className="h-6 w-6 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" title="Placer tout derrière">
              <ArrowDownToLine size={11} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
        {sortedLayers.map((el) => {
          const isSelected = el.id === selectedId;

          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                isSelected 
                  ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-bold" 
                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">z:{el.zIndex}</span>
                <span className="text-[11px] truncate">{el.name}</span>
              </div>

              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onToggleLock(el.id)} className={`p-0.5 rounded hover:bg-white dark:hover:bg-slate-800 ${el.locked ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                  <Lock size={11} />
                </button>
                <button onClick={() => onToggleHide(el.id)} className={`p-0.5 rounded hover:bg-white dark:hover:bg-slate-800 ${el.hidden ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                  {el.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <button onClick={() => onDuplicate(el.id)} className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800">
                  <Copy size={11} />
                </button>
                <button onClick={() => onDelete(el.id)} className="p-0.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
