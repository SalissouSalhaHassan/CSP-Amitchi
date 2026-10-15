'use client';

import React from 'react';
import { usePrintSystem } from '@/domains/printing/components/PrintManager';
import { Button } from '@/components/ui/button';
import { 
  Printer, CreditCard, FileText, Receipt, 
  Layout, Smartphone, Globe, ShieldCheck 
} from 'lucide-react';

export default function PrintDemoPage() {
  const { openPrintPreview } = usePrintSystem();

  const demoReceipt = () => {
    openPrintPreview({
      type: 'PaymentReceipt',
      payload: {
        school: { name: 'Campus Edut Pro', phone: '+221 77 123 45 67', email: 'contact@edut.pro' },
        student: { name: 'Moussa Diop', class: 'CM2' },
        payment: { reference: 'REC-2024-001', date: '04/05/2026', amount: 50000, reduction: 5000 }
      }
    }, { format: 'A5' });
  };

  const demoStudentCard = () => {
    openPrintPreview({
      type: 'StudentCard',
      payload: {
        school: { name: 'Lycée Excellence' },
        student: { name: 'Fatou Sow', id: 'STUD-882', class: 'Terminale S1' },
        year: '2025-2026',
        primaryColor: '#4f46e5'
      }
    });
  };

  const demoReport = () => {
    openPrintPreview({
      type: 'SchoolReport',
      payload: {
        school: { name: 'Groupe Scolaire Horizon' },
        student: { name: 'Ibrahima Fall', class: '6ème A' },
        term: '1er Semestre',
        results: [
          { subject: 'Mathématiques', moy: 15.5, coef: 4, rank: 2, appreciation: 'Très bien' },
          { subject: 'Français', moy: 14, coef: 3, rank: 5, appreciation: 'Bien' },
          { subject: 'Anglais', moy: 16, coef: 2, rank: 1, appreciation: 'Excellent' },
        ],
        stats: { average: 15.1, rank: 3, total: 32, decision: 'Passage' }
      }
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Système d'Impression Professionnel
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
          Découvrez notre nouveau module d'impression centralisé : prévisualisation HD, 
          formats multiples (A4, A5, Ticket) et partage intelligent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={<FileText className="text-indigo-500" />}
          title="Bulletins & Rapports"
          description="Générez des relevés de notes complexes avec calculs automatiques et mise en page A4 premium."
          onClick={demoReport}
        />
        <FeatureCard 
          icon={<CreditCard className="text-emerald-500" />}
          title="Cartes Scolaires"
          description="Design moderne pour cartes d'identité avec support QR Code et portrait/paysage."
          onClick={demoStudentCard}
        />
        <FeatureCard 
          icon={<Receipt className="text-amber-500" />}
          title="Reçus & Factures"
          description="Format A5 optimisé pour la comptabilité avec historique des versements intégré."
          onClick={demoReceipt}
        />
      </div>

      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" /> Sécurité & Archivage
            </h2>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Filigranes de sécurité "OFFICIEL"</li>
              <li>• QR Code de vérification unique par document</li>
              <li>• Signature numérique et cachet administratif</li>
              <li>• Archivage automatique de chaque impression</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <Layout size={32} className="text-indigo-400 mb-2" />
              <span className="text-xs font-semibold uppercase tracking-tighter">Responsive</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <Smartphone size={32} className="text-emerald-400 mb-2" />
              <span className="text-xs font-semibold uppercase tracking-tighter">WhatsApp</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <Globe size={32} className="text-amber-400 mb-2" />
              <span className="text-xs font-semibold uppercase tracking-tighter">Multi-langue</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <Printer size={32} className="text-rose-400 mb-2" />
              <span className="text-xs font-semibold uppercase tracking-tighter">Thermique</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="group bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer hover:-translate-y-1"
    >
      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
        {description}
      </p>
      <Button variant="ghost" className="p-0 text-indigo-600 hover:text-indigo-700 font-semibold group-hover:translate-x-1 transition-transform">
        Tester l'aperçu →
      </Button>
    </div>
  );
}
