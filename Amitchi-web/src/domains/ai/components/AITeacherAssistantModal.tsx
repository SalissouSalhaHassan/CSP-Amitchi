"use client";

import { useState, useTransition } from "react";
import { Sparkles, BrainCircuit, Copy, Check, X, Wand2, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAIHomeworkAction } from "../actions/ai.actions";

export default function AITeacherAssistantModal({
  isOpen,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (generatedData: any) => void;
}) {
  const [subject, setSubject] = useState<string>("Mathématiques");
  const [level, setLevel] = useState<string>("3ème");
  const [topic, setTopic] = useState<string>("Résolution de problèmes et équations");
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Veuillez saisir le thème du devoir");
      return;
    }

    startTransition(async () => {
      const res = await generateAIHomeworkAction({
        subject,
        level,
        topic,
        difficulty,
      });

      if (res?.data) {
        setGeneratedResult(res.data);
        toast.success("تم توليد اقتراح الواجب المنزلي بنجاح بواسطة الذكاء الاصطناعي 🪄");
      } else {
        toast.error((res as any)?.error || "Erreur lors de la génération avec l'IA");
      }
    });
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    const text = `${generatedResult.title}\n\n[Version Français]\n${generatedResult.instructionsFr}\n\n[النسخة العربية]\n${generatedResult.instructionsAr}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("تم نسخ نص الواجب إلى الحافظة");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none">
              <BrainCircuit size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">المساعد الذكي للمدرس (AI Teacher Assistant)</h3>
                <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles size={12} /> IA Générative
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400">توليد مقترحات الفروض والواجبات المنزلية والخطط التربوية تلقائياً.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière / المادة</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Mathématiques">Mathématiques / الرياضيات</option>
              <option value="Français">Français / اللغة الفرنسية</option>
              <option value="Arabe">Arabe / اللغة العربية</option>
              <option value="Informatique">Informatique / الإعلام الآلي</option>
              <option value="Histoire-Géographie">Histoire-Géographie / التاريخ والجغرافيا</option>
              <option value="Physique-Chimie">Physique-Chimie / الفيزياء والكيمياء</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau / المستوى الدراسي</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="6ème">6ème</option>
              <option value="5ème">5ème</option>
              <option value="4ème">4ème</option>
              <option value="3ème">3ème</option>
              <option value="2nde">2nde</option>
              <option value="1ère">1ère</option>
              <option value="Terminal">Terminal</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thème / موضوع الدرس</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Équations du 2nd degré, Écosystèmes, Poésie..."
              className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau de difficulté / درجة الصعوبة</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "facile", label: "Facile / سهل" },
                { id: "moyen", label: "Moyen / متوسط" },
                { id: "difficile", label: "Difficile / صعب" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id as any)}
                  className={`h-11 rounded-xl text-xs font-black transition border ${
                    difficulty === d.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-black text-white shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 text-sm"
        >
          <Wand2 size={18} className={isPending ? "animate-spin" : ""} />
          {isPending ? "Génération IA en cours..." : "Générer le Devoir Structuré avec l'IA"}
        </Button>

        {/* Generated AI Content Output */}
        {generatedResult && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                {generatedResult.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={14} /> ~{generatedResult.estimatedDurationMinutes} min
                </span>
                <Button size="sm" variant="outline" onClick={handleCopy} className="rounded-xl font-bold gap-1 text-xs">
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Copié !" : "Copier"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Version Française</span>
                <pre className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {generatedResult.instructionsFr}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2 text-right">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">النسخة العربية</span>
                <pre className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                  {generatedResult.instructionsAr}
                </pre>
              </div>
            </div>

            {onApply && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    onApply(generatedResult);
                    onClose();
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white"
                >
                  Appliquer au Devoir de la classe
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
