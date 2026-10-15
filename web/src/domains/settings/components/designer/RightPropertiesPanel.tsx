"use client";

import { DesignerElement, FONT_FAMILIES } from "./types";
import { toast } from "sonner";
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Type, RotateCw, Move, Sliders,
  Palette, Square, Layers, Lock, Eye, EyeOff, Trash2, Copy, Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface RightPropertiesPanelProps {
  element: DesignerElement | null;
  onUpdate: (id: string, updates: Partial<DesignerElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
}

export default function RightPropertiesPanel({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleHide,
}: RightPropertiesPanelProps) {
  if (!element) {
    return (
      <aside className="w-80 bg-white dark:bg-[#131622]/90 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 select-none">
        <Sliders size={48} className="mb-4 text-slate-300 dark:text-slate-600 animate-pulse" />
        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">لم يتم تحديد أي عنصر</h4>
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">انقر على أي عنصر داخل الصفحة لتعديل خصائصه وموقعه وحجمه والخطوط والنيشان.</p>
      </aside>
    );
  }

  const update = (field: keyof DesignerElement, value: any) => {
    onUpdate(element.id, { [field]: value });
  };

  return (
    <aside className="w-80 bg-white dark:bg-[#131622]/90 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full select-none z-20 overflow-y-auto">
      {/* Element Header & Quick Actions */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{element.name}</h4>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400">{element.id}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleLock(element.id)}
            className={`h-8 w-8 rounded-lg ${element.locked ? "text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            title="تأمين العنصر"
          >
            <Lock size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleHide(element.id)}
            className={`h-8 w-8 rounded-lg ${element.hidden ? "text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            title="إخفاء العنصر"
          >
            {element.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDuplicate(element.id)}
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            title="تكرار"
          >
            <Copy size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(element.id)}
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            title="حذف"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Content Editor */}
        {(element.type === "text" || element.type === "variable" || element.type === "qrcode" || element.type === "barcode" || element.type === "signature" || element.type === "stamp") && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">المحتوى والنص</p>
            <Input
              type="text"
              value={element.content || ""}
              onChange={(e) => update("content", e.target.value)}
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold dark:text-white"
              placeholder="أدخل محتوى النص..."
            />
          </div>
        )}

        {/* Logo / Image source properties */}
        {(element.type === "logo" || element.type === "image") && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">صورة اللوجو (Logo Source)</p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">مسار / URL اللوجو</label>
              <Input
                value={element.src || ""}
                onChange={(e) => update("src", e.target.value)}
                className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold dark:text-white"
                placeholder="URL أو Base64..."
              />
              <label className="flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-black cursor-pointer transition">
                <Upload size={14} /> تحميل لوجو من الجهاز
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 3 * 1024 * 1024) {
                        toast.error("حجم اللوجو لا يجب أن يتجاوز 3 ميجابايت");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        update("src", reader.result as string);
                        toast.success("تم رفع وتحديث اللوجو بنجاح");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Position & Transform */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">الموقع والأبعاد (Position)</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">X (أفقي)</label>
              <Input
                type="number"
                value={element.x}
                onChange={(e) => update("x", parseInt(e.target.value) || 0)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Y (عمودي)</label>
              <Input
                type="number"
                value={element.y}
                onChange={(e) => update("y", parseInt(e.target.value) || 0)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">العرض (W)</label>
              <Input
                type="number"
                value={element.width}
                onChange={(e) => update("width", parseInt(e.target.value) || 10)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">الارتفاع (H)</label>
              <Input
                type="number"
                value={element.height}
                onChange={(e) => update("height", parseInt(e.target.value) || 10)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
          </div>

          {/* Quick Rotation Buttons */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">زاوية الدوران ({element.rotation || 0}°)</label>
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 45, 90, 180].map((angle) => (
                <button
                  key={angle}
                  onClick={() => update("rotation", angle)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                    element.rotation === angle ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Typography Settings */}
        {(element.type === "text" || element.type === "variable" || element.type === "date" || element.type === "pageNumber") && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">الخطوط والتنسيق (Typography)</p>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">نوع الخط (Font Family)</label>
              <Select value={element.fontFamily || "Times New Roman"} onValueChange={(v) => update("fontFamily", v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 dark:text-white">
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">حجم الخط (px)</label>
                <Input
                  type="number"
                  value={element.fontSize || 16}
                  onChange={(e) => update("fontSize", parseInt(e.target.value) || 12)}
                  className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">لون الخط</label>
                <input
                  type="color"
                  value={element.color || "#000000"}
                  onChange={(e) => update("color", e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Text Alignment & Weight */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => update("fontWeight", element.fontWeight === "bold" ? "normal" : "bold")}
                className={`p-2 rounded-lg border transition ${element.fontWeight === "bold" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                title="عريض Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => update("fontStyle", element.fontStyle === "italic" ? "normal" : "italic")}
                className={`p-2 rounded-lg border transition ${element.fontStyle === "italic" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                title="مائل Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => update("textDecoration", element.textDecoration === "underline" ? "none" : "underline")}
                className={`p-2 rounded-lg border transition ${element.textDecoration === "underline" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                title="سطر تحتي Underline"
              >
                <Underline size={14} />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <button
                onClick={() => update("textAlign", "left")}
                className={`p-2 rounded-lg border transition ${element.textAlign === "left" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => update("textAlign", "center")}
                className={`p-2 rounded-lg border transition ${element.textAlign === "center" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => update("textAlign", "right")}
                className={`p-2 rounded-lg border transition ${element.textAlign === "right" ? "bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <AlignRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Color & Styling */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">الألوان والحدود (Colors & Borders)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">خلفية العنصر</label>
              <input
                type="color"
                value={element.backgroundColor || "#ffffff"}
                onChange={(e) => update("backgroundColor", e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">لون الإطار</label>
              <input
                type="color"
                value={element.borderColor || "#000000"}
                onChange={(e) => update("borderColor", e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سمك الإطار (px)</label>
              <Input
                type="number"
                value={element.borderWidth || 0}
                onChange={(e) => update("borderWidth", parseInt(e.target.value) || 0)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">استدواره (Radius)</label>
              <Input
                type="number"
                value={element.borderRadius || 0}
                onChange={(e) => update("borderRadius", parseInt(e.target.value) || 0)}
                className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
