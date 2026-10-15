'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Printer, Download, Share2, ZoomIn, ZoomOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { PrintFormat, PrintOrientation } from '../types';

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  onPrint: (options: any) => void;
  onDownload: () => void;
  onShare: () => void;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  isOpen,
  onClose,
  previewUrl,
  onPrint,
  onDownload,
  onShare,
}) => {
  const [format, setFormat] = useState<PrintFormat>('A4');
  const [orientation, setOrientation] = useState<PrintOrientation>('Portrait');
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset zoom when dialog opens
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
    }
  }, [isOpen]);

  // Handle escape key for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Memoize handlers to prevent unnecessary re-renders
  const handlePrint = React.useCallback(() => {
    onPrint({ format, orientation, zoom });
  }, [format, orientation, zoom, onPrint]);

  // Cleanup iframe src when dialog closes to prevent memory leaks
  useEffect(() => {
    if (!isOpen && iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl"
      >
        <DialogHeader className="p-6 bg-white dark:bg-slate-800 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Printer size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">
                Aperçu avant impression
              </DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Personnalisez et validez votre document
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              aria-label="Zoom out"
            >
              <ZoomOut size={18} />
            </Button>
            <span className="text-sm font-medium w-12 text-center" aria-label={`${zoom}% zoom`}>
              {zoom}%
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setZoom(z => Math.min(200, z + 10))}
              aria-label="Zoom in"
            >
              <ZoomIn size={18} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="ml-2"
              aria-label="Close preview"
            >
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-72 bg-white dark:bg-slate-800 border-r p-6 space-y-6 hidden md:block">
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Format du papier
              </label>
              <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (Standard)</SelectItem>
                  <SelectItem value="A5">A5 (Reçu)</SelectItem>
                  <SelectItem value="Ticket">Ticket (80mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Orientation
              </label>
              <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir orientation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portrait">Portrait</SelectItem>
                  <SelectItem value="Landscape">Paysage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-6 border-t space-y-3">
              <Button 
                onClick={handlePrint} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
              >
                <Printer className="mr-2 h-4 w-4" /> Imprimer
              </Button>
              <Button variant="outline" onClick={onDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Télécharger PDF
              </Button>
              <Button variant="outline" onClick={onShare} className="w-full">
                <Share2 className="mr-2 h-4 w-4" /> Partager WhatsApp
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-slate-200 dark:bg-slate-950 overflow-auto p-8 flex justify-center items-start">
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white shadow-2xl origin-top"
                  style={{ 
                    width: format === 'A4' ? '210mm' : format === 'A5' ? '148mm' : '80mm',
                    height: format === 'A4' ? '297mm' : format === 'A5' ? '210mm' : 'auto',
                    minHeight: '297mm',
                    transform: `scale(${zoom / 100})`,
                  }}
                >
                  <iframe 
                    ref={iframeRef}
                    src={previewUrl} 
                    className="w-full h-full border-none"
                    title="Print Preview"
                    loading="lazy"
                    sandbox="allow-same-origin"
                  />
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p>Génération de l'aperçu...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Actions */}
        <DialogFooter className="p-4 bg-white dark:bg-slate-800 border-t md:hidden flex-row justify-around">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrint}
            aria-label="Imprimer"
          >
            <Printer size={24} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDownload}
            aria-label="Télécharger"
          >
            <Download size={24} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onShare}
            aria-label="Partager"
          >
            <Share2 size={24} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};