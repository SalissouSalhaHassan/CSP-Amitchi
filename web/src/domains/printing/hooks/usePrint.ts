'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PrintJob, DocumentData, PrintOptions } from '../types';

// Keep track of object URLs to revoke them later
const objectUrlRegistry: Map<string, boolean> = new Map();

export const usePrint = () => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Cleanup function to revoke object URLs
  const revokeObjectUrl = useCallback((url: string | null) => {
    if (url && objectUrlRegistry.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlRegistry.delete(url);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        revokeObjectUrl(currentObjectUrlRef.current);
      }
      // Revoke all remaining URLs
      objectUrlRegistry.forEach((_, url) => URL.revokeObjectURL(url));
      objectUrlRegistry.clear();
    };
  }, [revokeObjectUrl]);

  const generatePreview = useCallback(async (data: DocumentData, options: PrintOptions) => {
    // Revoke previous URL before creating new one
    if (currentObjectUrlRef.current) {
      revokeObjectUrl(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }

    setIsPrinting(true);
    try {
      // Dynamic import to avoid SSR issues
      const { PDFGenerator } = await import('../services/pdfGenerator');
      const generator = new PDFGenerator(options);
      const dataUrl = await generator.generate(data);
      
      // Convert data URL to object URL for better memory management
      const byteCharacters = atob(dataUrl.split(',')[1]);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRegistry.set(objectUrl, true);
      currentObjectUrlRef.current = objectUrl;
      
      setPreviewUrl(objectUrl);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsPrinting(false);
    }
  }, [revokeObjectUrl]);

  const executePrint = useCallback(async (data: DocumentData, options: PrintOptions) => {
    setIsPrinting(true);
    try {
      const { PDFGenerator } = await import('../services/pdfGenerator');
      const generator = new PDFGenerator(options);
      const dataUrl = await generator.generate(data);
      
      const base64 = dataUrl.split(',')[1];
      const { default: printJS } = await import('print-js');
      
      printJS({
        printable: base64,
        type: 'pdf',
        base64: true,
      });
    } catch (error) {
      console.error('Failed to print:', error);
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    // Clean up object URL when closing preview
    if (currentObjectUrlRef.current) {
      revokeObjectUrl(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, [revokeObjectUrl]);

  return {
    isPrinting,
    previewUrl,
    generatePreview,
    executePrint,
    closePreview,
  };
};