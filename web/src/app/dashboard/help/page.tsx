"use client";

import React, { useState } from "react";
import { HelpCircle, Mail, MessageSquare, Phone, BookOpen, Key, Users, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

const FAQS = [
  {
    question: "Comment ajouter un nouvel utilisateur et lui attribuer un rôle ?",
    answer: "Allez dans Système > Utilisateurs & équipes, puis cliquez sur 'Ajouter un utilisateur'. Remplissez ses informations et choisissez son rôle (Élève, Enseignant, etc.). Si le rôle requiert une liaison (ex: Élève ou Parent), un champ dédié apparaîtra pour associer le compte à la bonne identité.",
    category: "security",
    icon: Users
  },
  {
    question: "Comment configurer ou modifier les permissions d'un rôle ?",
    answer: "Rendez-vous dans Système > Sécurité (ou Rôles Utilisateurs). Sélectionnez le rôle dans la liste de gauche, puis activez ou désactivez les permissions (Voir, Éditer, Supprimer) pour chaque module avant de cliquer sur 'Enregistrer' en haut à droite.",
    category: "security",
    icon: Key
  },
  {
    question: "Où puis-je consulter le cahier de textes et valider les cours ?",
    answer: "Pour les directeurs et responsables pédagogiques, accédez à Pédagogie > Cahier de textes. Vous y trouverez la liste de toutes les leçons renseignées par les enseignants, avec la possibilité de les valider, de les rejeter ou de laisser des observations.",
    category: "pedagogy",
    icon: BookOpen
  },
  {
    question: "Comment gérer le transport ou la cantine scolaire ?",
    answer: "Ces modules sont accessibles dans le menu Ressources (Transport, Cantine, Internat). Vous pouvez y inscrire des élèves, configurer des trajets ou des formules de repas, et suivre les abonnements actifs.",
    category: "resources",
    icon: Settings
  }
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState(false);

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200">
          <HelpCircle size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centre d'aide & Support</h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">Trouvez des réponses à vos questions ou contactez notre support technique</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQs list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Foire Aux Questions (FAQ)</h3>
            
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Rechercher une réponse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-4 h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-medium text-sm focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Accordion */}
            <div className="space-y-3">
              {filteredFaqs.map((faq, i) => {
                const Icon = faq.icon;
                const isOpen = openIndex === i;
                return (
                  <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden transition-all duration-200">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/30 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{faq.question}</span>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-5 bg-white border-t border-slate-100 text-xs font-medium leading-relaxed text-slate-500">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredFaqs.length === 0 && (
                <p className="text-xs font-bold text-slate-400 text-center py-6">Aucun résultat trouvé pour votre recherche.</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Support & ID Card */}
        <div className="space-y-6">
          {/* Card Contact Support */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-1 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-[22px] p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/50 overflow-hidden shrink-0 bg-indigo-950 flex items-center justify-center">
                  <img 
                    src="/salissou.jpg" 
                    alt="Salissou Salha Hassan" 
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white leading-tight">Salissou Salha Hassan</h4>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-0.5">Admin & Support</p>
                  <p className="text-indigo-200 text-[11px] font-medium mt-1">À votre écoute 24/7</p>
                </div>
              </div>

              <div className="space-y-4">
                <a href="mailto:salissousalhahasan@gmail.com" className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">Email</p>
                    <p className="text-sm font-bold mt-1 text-white">salissousalhahasan@gmail.com</p>
                  </div>
                </a>

                <a href="https://wa.me/22799425298" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">WhatsApp Support</p>
                    <p className="text-sm font-bold mt-1 text-white">+227 99 42 52 98</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">Téléphone Direct</p>
                    <p className="text-sm font-bold mt-1 text-white">+227 99 42 52 98</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-indigo-300 font-bold">
                <span>Lun - Ven : 8h - 18h</span>
                <span>Sam : 9h - 13h</span>
              </div>
            </div>
          </div>

          {/* Large Visible ID Card Container */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document d'identité officiel</h4>
            <div 
              onClick={() => setZoomImage(true)}
              className="relative rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 group cursor-zoom-in bg-slate-50 flex items-center justify-center"
            >
              <img 
                src="/salissou.jpg" 
                alt="Document Officiel" 
                className="w-full h-auto max-h-[220px] object-contain group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm transition-all duration-300 scale-95 group-hover:scale-100">
                  Cliquez pour zoomer
                </span>
              </div>
            </div>
            <div className="text-center text-[10px] font-bold text-slate-400">
              Cliquer sur l'image pour agrandir et lire les détails
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setZoomImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden flex flex-col items-center justify-center">
            <button 
              onClick={() => setZoomImage(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            >
              ✕
            </button>
            <img 
              src="/salissou.jpg" 
              alt="Carte d'identité en grand" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
