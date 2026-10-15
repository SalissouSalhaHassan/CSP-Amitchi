"use client";

import { useState } from "react";
import { CardElementType, DYNAMIC_CARD_FIELDS } from "./types";
import {
  Type, UserCheck, Sparkles, Image as ImageIcon, QrCode, Barcode,
  Stamp, Square, Circle, Minus, Plus, Search, Variable,
  Phone, Mail, MapPin, Building2, Calendar, User, ShieldCheck,
  Globe, Smartphone, Send, GraduationCap, BookOpen, LibraryBig, Award, Bookmark, Medal,
  ShieldAlert, Fingerprint, Lock, Key, BadgeCheck, CheckCircle2, Clock, History, Star, Heart,
  AlertCircle, Info, Hash, Layout, Tag, Shield
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface CardLeftSidebarProps {
  onAddElement: (type: CardElementType, customProps?: any) => void;
}

const ICON_CATALOG = [
  { category: "Contacts & Réseaux", items: [
    { name: "Phone", icon: Phone, label: "Téléphone" },
    { name: "Mail", icon: Mail, label: "Email" },
    { name: "Address", icon: MapPin, label: "Adresse" },
    { name: "Globe", icon: Globe, label: "Site Web" },
    { name: "Smartphone", icon: Smartphone, label: "Mobile" },
    { name: "Send", icon: Send, label: "Envoi / Contact" },
  ]},
  { category: "Académique & École", items: [
    { name: "School", icon: Building2, label: "Établissement" },
    { name: "GraduationCap", icon: GraduationCap, label: "Diplôme / Élève" },
    { name: "BookOpen", icon: BookOpen, label: "Livre / Cours" },
    { name: "LibraryBig", icon: LibraryBig, label: "Bibliothèque" },
    { name: "Award", icon: Award, label: "Prix / Distinction" },
    { name: "Bookmark", icon: Bookmark, label: "Filière / Section" },
    { name: "Medal", icon: Medal, label: "Médaille" },
  ]},
  { category: "Sécurité & Contrôle", items: [
    { name: "User", icon: User, label: "Utilisateur" },
    { name: "ShieldCheck", icon: ShieldCheck, label: "Sécurité Valide" },
    { name: "ShieldAlert", icon: ShieldAlert, label: "Alerte Sécurité" },
    { name: "Fingerprint", icon: Fingerprint, label: "Empreinte Digitale" },
    { name: "Lock", icon: Lock, label: "Verrou" },
    { name: "Key", icon: Key, label: "Clé d'Accès" },
    { name: "BadgeCheck", icon: BadgeCheck, label: "Badge Officiel" },
    { name: "QrCode", icon: QrCode, label: "Code QR" },
    { name: "CheckCircle2", icon: CheckCircle2, label: "Validé" },
  ]},
  { category: "Dates & Temps", items: [
    { name: "Calendar", icon: Calendar, label: "Calendrier" },
    { name: "Clock", icon: Clock, label: "Horloge" },
    { name: "History", icon: History, label: "Historique" },
  ]},
  { category: "Symboles & Badges", items: [
    { name: "Star", icon: Star, label: "Étoile" },
    { name: "Heart", icon: Heart, label: "Cœur" },
    { name: "Sparkles", icon: Sparkles, label: "Brillance / Premium" },
    { name: "AlertCircle", icon: AlertCircle, label: "Information Urgence" },
    { name: "Info", icon: Info, label: "Info Carte" },
    { name: "Hash", icon: Hash, label: "Numéro / Matricule" },
  ]},
];

export default function CardLeftSidebar({ onAddElement }: CardLeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<"library" | "tokens" | "icons">("library");
  const [searchToken, setSearchToken] = useState("");
  const [searchIcon, setSearchIcon] = useState("");

  const filteredTokens = DYNAMIC_CARD_FIELDS.filter(t =>
    t.key.toLowerCase().includes(searchToken.toLowerCase()) ||
    t.label.toLowerCase().includes(searchToken.toLowerCase()) ||
    t.category.toLowerCase().includes(searchToken.toLowerCase())
  );

  return (
    <aside className="w-72 bg-white dark:bg-[#131622] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-20 shadow-sm text-slate-900 dark:text-slate-100 select-none">
      {/* Tab Switcher */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "library" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <Sparkles size={13} /> Éléments
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "tokens" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <Variable size={13} /> Variables
        </button>
        <button
          onClick={() => setActiveTab("icons")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "icons" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <User size={13} /> Icônes
        </button>
      </div>

      {/* Main Library Elements */}
      {activeTab === "library" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section: Photos & Logos */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2.5">Photos & Médias</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("studentPhoto")}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <UserCheck size={20} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Photo de l'élève</span>
              </button>
              <button
                onClick={() => onAddElement("schoolLogo")}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <Sparkles size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Logo école</span>
              </button>
              <button
                onClick={() => onAddElement("studentPhoto", { name: "Photo Tuteur", variableKey: "{{guardian}}", borderRadius: 50 })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 transition group"
              >
                <User size={18} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Photo Tuteur</span>
              </button>
              <button
                onClick={() => onAddElement("watermark", { content: "EDUT SCOLAIRE", opacity: 0.1, fontSize: 32, fontWeight: "bold", rotation: -30, width: 280, height: 80 })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 transition group"
              >
                <Shield size={18} className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Filigrane Sécurité</span>
              </button>
            </div>
          </div>

          {/* Section: Text */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2.5">Titres & Textes</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("text", { content: "CARTE D'IDENTITÉ SCOLAIRE", fontSize: 13, fontWeight: "bold", color: "#312e81" })}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <Type size={18} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Titre principal</span>
              </button>
              <button
                onClick={() => onAddElement("text", { content: "Discipline - Travail - Succès", fontSize: 10, fontStyle: "italic", color: "#64748b" })}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <Type size={16} className="text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Sous-titre / Slogan</span>
              </button>
              <button
                onClick={() => onAddElement("text", { content: "Matricule : {{student_id}}", fontSize: 11, fontWeight: "bold", color: "#0f172a" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 transition group"
              >
                <Tag size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] font-bold">Champ Étiquette</span>
              </button>
              <button
                onClick={() => onAddElement("text", { content: "BP 1024, Niamey - Tél: +227 20 00 00 00", fontSize: 8, color: "#475569" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 transition group"
              >
                <MapPin size={16} className="text-rose-500" />
                <span className="text-[11px] font-bold">Bloc Contact</span>
              </button>
            </div>
          </div>

          {/* Section: Barcode & Security */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2.5">Codes & Sécurité</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("qrcode")}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <QrCode size={20} className="text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Code QR Sécurité</span>
              </button>
              <button
                onClick={() => onAddElement("barcode", { barcodeType: "Code128" })}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <Barcode size={20} className="text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Code-barres Code128</span>
              </button>
              <button
                onClick={() => onAddElement("stamp")}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <Stamp size={20} className="text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Cachet officiel</span>
              </button>
              <button
                onClick={() => onAddElement("signature")}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex flex-col items-center gap-2 text-slate-800 dark:text-slate-200 transition group"
              >
                <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Signature direction</span>
              </button>
            </div>
          </div>

          {/* Section: Shapes & Badges */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2.5">Formes, Badges & Cadres</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAddElement("shape", { shapeType: "rectangle" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <Square size={16} />
                <span className="text-[10px] font-bold">Rectangle</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "circle" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <Circle size={16} />
                <span className="text-[10px] font-bold">Cercle</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "line", height: 2, backgroundColor: "#4338ca" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <Minus size={16} />
                <span className="text-[10px] font-bold">Séparateur</span>
              </button>
              <button
                onClick={() => onAddElement("badge", { content: "ÉLÈVE ACTIF", backgroundColor: "#10b981", color: "#ffffff", borderRadius: 12, fontSize: 9, fontWeight: "bold", width: 80, height: 20 })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <BadgeCheck size={16} className="text-emerald-600" />
                <span className="text-[10px] font-bold">Badge Statut</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "rectangle", width: 324, height: 40, x: 0, y: 0, bgGradient: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <Layout size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-bold">Bandeau</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "circle", width: 40, height: 40, backgroundColor: "#fbbf24" })}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition"
              >
                <Star size={16} className="text-amber-500" />
                <span className="text-[10px] font-bold">Pastille</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "tokens" ? (
        /* Dynamic Tokens Library */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <Input
              type="text"
              placeholder="Rechercher une variable..."
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              className="pl-8 h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            {filteredTokens.map((item) => (
              <button
                key={item.key}
                onClick={() => onAddElement(
                  item.key === "{{student_photo}}" ? "studentPhoto" : item.key === "{{school_logo}}" ? "schoolLogo" : "variable",
                  { variableKey: item.key, content: item.key, fontSize: 11, fontWeight: "bold", color: "#1e1b4b" }
                )}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl flex items-center justify-between text-left transition group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-900 dark:group-hover:text-indigo-300">{item.label}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-semibold">{item.category}</span>
                  </div>
                  <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400">{item.key}</span>
                </div>
                <Plus size={14} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Icons Library (Categorized & Searchable) */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <Input
              type="text"
              placeholder="Filtrer les icônes..."
              value={searchIcon}
              onChange={(e) => setSearchIcon(e.target.value)}
              className="pl-8 h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {ICON_CATALOG.map((cat) => {
            const items = cat.items.filter(i => i.label.toLowerCase().includes(searchIcon.toLowerCase()) || i.name.toLowerCase().includes(searchIcon.toLowerCase()));
            if (items.length === 0) return null;

            return (
              <div key={cat.category} className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">{cat.category}</p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((ic) => {
                    const IconComp = ic.icon;
                    return (
                      <button
                        key={ic.name}
                        onClick={() => onAddElement("icon", { iconName: ic.name, width: 22, height: 22 })}
                        className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-1 text-slate-700 dark:text-slate-200 transition group"
                      >
                        <IconComp size={18} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-center truncate w-full">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
