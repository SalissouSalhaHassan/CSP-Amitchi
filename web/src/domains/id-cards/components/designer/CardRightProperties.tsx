"use client";

import { CardElement, FONT_FAMILIES } from "./types";
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Sliders, Lock, Eye, EyeOff, Trash2, Copy, Circle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CardRightPropertiesProps {
  element: CardElement | null;
  onUpdate: (id: string, updates: Partial<CardElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
}

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  "linear-gradient(135deg, #1f2937 0%, #030712 100%)",
  "linear-gradient(135deg, #047857 0%, #064e3b 100%)",
  "linear-gradient(135deg, #be123c 0%, #881337 100%)",
  "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)",
];

export default function CardRightProperties({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleHide,
}: CardRightPropertiesProps) {
  if (!element) {
    return (
      <aside className="w-80 bg-white dark:bg-[#131622] border-l border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none">
        <Sliders size={40} className="mb-3 text-slate-300 dark:text-slate-600 animate-pulse" />
        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">Aucun élément sélectionné</h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Cliquez sur un élément de la carte pour ajuster sa position, sa taille, ses couleurs et sa police.</p>
      </aside>
    );
  }

  const update = (field: keyof CardElement, value: any) => {
    onUpdate(element.id, { [field]: value });
  };

  return (
    <aside className="w-80 bg-white dark:bg-[#131622] border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col h-full select-none z-20 overflow-y-auto">
      {/* Header & Quick Actions */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{element.name}</h4>
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{element.id}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleLock(element.id)}
            className={`h-7 w-7 rounded-lg ${element.locked ? "text-amber-600 bg-amber-50 dark:bg-amber-950/60" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title="Verrouiller"
          >
            <Lock size={13} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleHide(element.id)}
            className={`h-7 w-7 rounded-lg ${element.hidden ? "text-rose-600 bg-rose-50 dark:bg-rose-950/60" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title="Masquer"
          >
            {element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDuplicate(element.id)}
            className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Dupliquer"
          >
            <Copy size={13} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(element.id)}
            className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Supprimer"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Content Editor */}
        {(element.type === "text" || element.type === "variable" || element.type === "badge" || element.type === "watermark" || element.type === "qrcode" || element.type === "barcode" || element.type === "signature" || element.type === "stamp") && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Contenu & Texte</p>
            <Input
              type="text"
              value={element.content || ""}
              onChange={(e) => update("content", e.target.value)}
              className="h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
              placeholder="Texte du contenu..."
            />
          </div>
        )}

        {/* Opacity Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Transparence / Opacité</label>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{Math.round((element.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={element.opacity ?? 1}
            onChange={(e) => update("opacity", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Position & Size */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Position & Dimensions</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Axe X</label>
              <Input
                type="number"
                value={element.x}
                onChange={(e) => update("x", parseInt(e.target.value) || 0)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Axe Y</label>
              <Input
                type="number"
                value={element.y}
                onChange={(e) => update("y", parseInt(e.target.value) || 0)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Largeur (W)</label>
              <Input
                type="number"
                value={element.width}
                onChange={(e) => update("width", parseInt(e.target.value) || 10)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Hauteur (H)</label>
              <Input
                type="number"
                value={element.height}
                onChange={(e) => update("height", parseInt(e.target.value) || 10)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Media & Circular Crop for Student Photo / Logo */}
        {(element.type === "studentPhoto" || element.type === "schoolLogo" || element.type === "image") && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Découpe photo</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update("circularCrop", !element.circularCrop)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  element.circularCrop ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Circle size={14} /> Découpe circulaire
              </button>
            </div>
          </div>
        )}

        {/* Typography */}
        {(element.type === "text" || element.type === "variable" || element.type === "badge" || element.type === "watermark") && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Typographie & Couleur</p>
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Police (Font)</label>
              <Select value={element.fontFamily || "Poppins"} onValueChange={(v) => update("fontFamily", v)}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Taille (px)</label>
                <Input
                  type="number"
                  value={element.fontSize || 12}
                  onChange={(e) => update("fontSize", parseInt(e.target.value) || 8)}
                  className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Couleur</label>
                <input
                  type="color"
                  value={element.color || "#111827"}
                  onChange={(e) => update("color", e.target.value)}
                  className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1">
              <button
                onClick={() => update("fontWeight", element.fontWeight === "bold" ? "normal" : "bold")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.fontWeight === "bold" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                title="Gras"
              >
                <Bold size={13} />
              </button>
              <button
                onClick={() => update("fontStyle", element.fontStyle === "italic" ? "normal" : "italic")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.fontStyle === "italic" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                title="Italique"
              >
                <Italic size={13} />
              </button>
              <button
                onClick={() => update("textDecoration", element.textDecoration === "underline" ? "none" : "underline")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.textDecoration === "underline" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                title="Souligné"
              >
                <Underline size={13} />
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => update("textAlign", "left")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.textAlign === "left" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
              >
                <AlignLeft size={13} />
              </button>
              <button
                onClick={() => update("textAlign", "center")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.textAlign === "center" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
              >
                <AlignCenter size={13} />
              </button>
              <button
                onClick={() => update("textAlign", "right")}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${element.textAlign === "right" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
              >
                <AlignRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Styling & Gradients */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">Styles & Dégradés</p>
          
          <div>
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Dégradés prédéfinis</label>
            <div className="flex items-center gap-1.5 mt-1">
              {PRESET_GRADIENTS.map((grad, idx) => (
                <button
                  key={idx}
                  onClick={() => update("bgGradient", grad)}
                  style={{ background: grad }}
                  className="w-7 h-7 rounded-lg border border-white/20 shadow-sm hover:scale-110 transition-transform"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Couleur unie</label>
              <input
                type="color"
                value={element.backgroundColor || "#ffffff"}
                onChange={(e) => { update("bgGradient", ""); update("backgroundColor", e.target.value); }}
                className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Rayon (Radius)</label>
              <Input
                type="number"
                value={element.borderRadius || 0}
                onChange={(e) => update("borderRadius", parseInt(e.target.value) || 0)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
