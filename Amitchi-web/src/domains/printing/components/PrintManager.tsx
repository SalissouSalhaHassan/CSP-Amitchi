'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { usePrint } from '../hooks/usePrint';
import { DocumentData, PrintOptions } from '../types';
import dynamic from 'next/dynamic';

const PrintPreview = dynamic(() => import('./PrintPreview').then(mod => mod.PrintPreview), {
  ssr: false
});

interface PrintContextType {
  openPrintPreview: (data: DocumentData, options?: Partial<PrintOptions>) => void;
  directPrint: (data: DocumentData, options?: Partial<PrintOptions>) => void;
  isPrinting: boolean;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const usePrintSystem = () => {
  const context = useContext(PrintContext);
  if (!context) {
    throw new Error('usePrintSystem must be used within a PrintProvider');
  }
  return context;
};

const DEFAULT_OPTIONS: PrintOptions = {
  format: 'A4',
  orientation: 'Portrait',
  zoom: 100,
  showWatermark: true,
  qrVerification: true,
};

export const PrintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    isPrinting, 
    previewUrl, 
    generatePreview, 
    executePrint, 
    closePreview 
  } = usePrint();
  
  const [currentData, setCurrentData] = useState<DocumentData | null>(null);
  const [currentOptions, setCurrentOptions] = useState<PrintOptions>(DEFAULT_OPTIONS);

  const openPrintPreview = (data: DocumentData, options?: Partial<PrintOptions>) => {
    const combinedOptions = { ...DEFAULT_OPTIONS, ...options };
    setCurrentData(data);
    setCurrentOptions(combinedOptions);
    generatePreview(data, combinedOptions);
  };

  const directPrint = (data: DocumentData, options?: Partial<PrintOptions>) => {
    const combinedOptions = { ...DEFAULT_OPTIONS, ...options };
    executePrint(data, combinedOptions);
  };

  const handlePrint = (newOptions: Partial<PrintOptions>) => {
    if (currentData) {
      executePrint(currentData, { ...currentOptions, ...newOptions });
    }
  };

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `document_${Date.now()}.pdf`;
      link.click();
    }
  };

  const handleShare = () => {
    if (previewUrl) {
      // Basic WhatsApp share logic (can be expanded)
      const message = encodeURIComponent("Voici votre document Edut Pro");
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  return (
    <PrintContext.Provider value={{ openPrintPreview, directPrint, isPrinting }}>
      {children}
      <PrintPreview
        isOpen={!!previewUrl}
        onClose={closePreview}
        previewUrl={previewUrl}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </PrintContext.Provider>
  );
};
