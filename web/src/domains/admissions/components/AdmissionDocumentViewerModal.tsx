"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  X,
  Download,
  Printer,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Award,
  GraduationCap,
  BadgeAlert,
  Calendar,
  Briefcase,
  Camera,
  Layers,
  FileCheck,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { updateAdmissionApplicationDocumentsAction } from "@/domains/admissions/actions/admissions.actions";

export interface AdmissionDocumentItem {
  key: string;
  title: string;
  shortLabel: string;
  url: string | null | undefined;
  type: "image" | "pdf" | "text" | "link";
  iconName: string;
}

interface AdmissionDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  initialDocKey?: string;
  onDocumentsUpdated?: (updatedApp: any) => void;
}

// Convert data URI to Blob
function dataUriToBlob(dataUri: string): Blob {
  const parts = dataUri.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

// Client-side image compression
function compressImage(file: File, maxDimension = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      if (!file.type.startsWith("image/")) {
        return resolve(originalDataUrl);
      }
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(originalDataUrl);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(originalDataUrl);
        }
      };
      img.onerror = () => resolve(originalDataUrl);
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdmissionDocumentViewerModal({
  isOpen,
  onClose,
  application,
  initialDocKey,
  onDocumentsUpdated,
}: AdmissionDocumentViewerModalProps) {
  const [activeDocKey, setActiveDocKey] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDocKey, setUploadDocKey] = useState<string>("bacTranscriptUrl");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available document definitions
  const docDefinitions = useMemo(() => [
    {
      key: "bacTranscriptUrl",
      title: "Relevé de Notes du Baccalauréat",
      shortLabel: "Relevé Bac",
      iconName: "award",
      url: application?.bacTranscriptUrl,
    },
    {
      key: "bacCertificateUrl",
      title: "Attestation / Diplôme du Bac",
      shortLabel: "Diplôme Bac",
      iconName: "grad",
      url: application?.bacCertificateUrl,
    },
    {
      key: "idCardPassportUrl",
      title: "Pièce d'Identité / Passeport",
      shortLabel: "Pièce d'Identité",
      iconName: "badge",
      url: application?.idCardPassportUrl,
    },
    {
      key: "birthCertificateUrl",
      title: "Extrait d'Acte de Naissance",
      shortLabel: "Acte de Naissance",
      iconName: "cal",
      url: application?.birthCertificateUrl,
    },
    {
      key: "cvUrl",
      title: "Curriculum Vitae (CV Candidat)",
      shortLabel: "CV Candidat",
      iconName: "briefcase",
      url: application?.cvUrl,
    },
    {
      key: "higherEdTranscriptUrl",
      title: "Relevés de Notes Universitaires Antérieurs",
      shortLabel: "Relevés Supérieur",
      iconName: "layers",
      url: application?.higherEdTranscriptUrl,
    },
    {
      key: "photoUrl",
      title: "Photographie d'Identité Officielle",
      shortLabel: "Photo d'Identité",
      iconName: "camera",
      url: application?.photoUrl,
    },
    {
      key: "reportCardUrl",
      title: "Bulletins Scolaires Antérieurs",
      shortLabel: "Bulletins",
      iconName: "check",
      url: application?.reportCardUrl,
    },
    {
      key: "coverLetter",
      title: "Lettre de Motivation",
      shortLabel: "Lettre Motivation",
      iconName: "file",
      url: application?.coverLetter,
    },
  ], [application]);

  // Filter existing docs
  const availableDocs = useMemo(() => {
    return docDefinitions.filter(d => Boolean(d.url && d.url.trim().length > 0));
  }, [docDefinitions]);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setRotation(0);
    if (initialDocKey && availableDocs.some(d => d.key === initialDocKey)) {
      setActiveDocKey(initialDocKey);
    } else if (availableDocs.length > 0) {
      setActiveDocKey(availableDocs[0].key);
    } else {
      setActiveDocKey("bacTranscriptUrl");
    }
  }, [isOpen, initialDocKey, availableDocs]);

  if (!isOpen || !application) return null;

  const activeDoc = docDefinitions.find(d => d.key === activeDocKey) || docDefinitions[0];
  const docUrl = activeDoc?.url || "";
  const isImage = Boolean(
    docUrl.startsWith("data:image/") ||
    docUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)
  );
  const isPdf = Boolean(
    docUrl.startsWith("data:application/pdf") ||
    docUrl.match(/\.pdf/i)
  );
  const isText = Boolean(!isImage && !isPdf && docUrl.length > 0 && !docUrl.startsWith("http"));

  const candidateName = `${application.studentLastName?.toUpperCase()} ${application.studentFirstName}`;
  const appNumber = application.applicationNumber || "DOSSIER";

  // Safe download handler
  const handleDownload = () => {
    if (!docUrl) return;
    try {
      const ext = isPdf ? "pdf" : isImage ? "jpg" : "txt";
      const cleanFileName = `${appNumber}_${activeDoc.shortLabel.replace(/\s+/g, "_")}.${ext}`;

      if (docUrl.startsWith("data:")) {
        const blob = dataUriToBlob(docUrl);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = cleanFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        const a = document.createElement("a");
        a.href = docUrl;
        a.download = cleanFileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      toast.success("Téléchargement du document initié !");
    } catch (e: any) {
      toast.error("Impossible de télécharger le document.");
    }
  };

  // Safe new tab opener (bypassing Chrome data: URL top-level restrictions)
  const handleOpenNewTab = () => {
    if (!docUrl) return;
    if (docUrl.startsWith("data:")) {
      const blob = dataUriToBlob(docUrl);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      window.open(docUrl, "_blank");
    }
  };

  // Clean printable document
  const handlePrint = () => {
    if (!docUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Veuillez autoriser les fenêtres pop-up pour imprimer.");
      return;
    }

    const title = `${activeDoc.title} • ${candidateName} (${appNumber})`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { margin: 15mm; size: auto; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; color: #1e293b; text-align: center; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; text-align: left; }
            .header h2 { margin: 0; font-size: 16px; color: #0f172a; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .doc-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
            img { max-width: 100%; max-height: 85vh; object-fit: contain; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
            pre { text-align: left; background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              img { max-height: 95vh; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${activeDoc.title}</h2>
            <p><strong>Candidat :</strong> ${candidateName} &bull; <strong>Dossier :</strong> ${appNumber}</p>
          </div>
          <div class="doc-container">
            ${isImage ? `<img src="${docUrl}" onload="window.print();" />` : isText ? `<pre>${docUrl}</pre><script>window.print();</script>` : `<iframe src="${docUrl}" style="width:100%;height:85vh;border:none;" onload="window.print();"></iframe>`}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Upload/replace document logic
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const isPdfFile = file.type === "application/pdf";
      let finalUrl = "";

      if (isPdfFile) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Le fichier PDF dépasse 5 Mo.");
          setIsUploading(false);
          return;
        }
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        finalUrl = await compressImage(file, 1400, 0.82);
      }

      const res = await updateAdmissionApplicationDocumentsAction({
        applicationId: application.id,
        documents: {
          [uploadDocKey]: finalUrl,
        },
      });

      if (res && res.success) {
        toast.success("Pièce numérisée et enregistrée avec succès !");
        const updatedApp = {
          ...application,
          [uploadDocKey]: finalUrl,
        };
        setActiveDocKey(uploadDocKey);
        onDocumentsUpdated?.(updatedApp);
      } else {
        toast.error(res?.error || "Erreur lors de l'enregistrement de la pièce.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Échec du téléversement de la pièce.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ─── 1. MODAL TOP HEADER ────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="size-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white truncate">
                  {activeDoc.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Numérisé
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Candidat : <strong className="text-slate-200">{candidateName}</strong> &bull; Dossier : <span className="font-mono text-emerald-400 font-bold">{appNumber}</span>
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {docUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
                  title="Télécharger le fichier original"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Télécharger</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
                  title="Imprimer le document"
                >
                  <Printer className="size-3.5" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Ouvrir en grand dans un nouvel onglet"
                >
                  <ExternalLink className="size-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition ml-1"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── 2. DOCUMENT SELECTOR TABS ───────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {docDefinitions.map((doc) => {
            const hasFile = Boolean(doc.url && doc.url.trim().length > 0);
            const isSelected = activeDocKey === doc.key;

            return (
              <button
                key={doc.key}
                type="button"
                onClick={() => {
                  setActiveDocKey(doc.key);
                  setZoom(1);
                  setRotation(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition border ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black"
                    : hasFile
                    ? "bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700"
                    : "bg-slate-950/40 text-slate-500 border-slate-800/60 hover:text-slate-400"
                }`}
              >
                <span>{doc.shortLabel}</span>
                {hasFile ? (
                  <span className={`size-1.5 rounded-full ${isSelected ? "bg-slate-950" : "bg-emerald-400"}`} />
                ) : (
                  <span className="text-[9px] opacity-60">(Absent)</span>
                )}
              </button>
            );
          })}

          {/* Quick upload trigger button */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setUploadDocKey(activeDocKey || "bacTranscriptUrl");
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Joindre / Numériser</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUploadFile}
              className="hidden"
            />
          </div>
        </div>

        {/* ─── 3. VIEWER TOOLBAR (Zoom, Rotate) ────────────────────────────── */}
        {docUrl && isImage && (
          <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px]">Zoom : {Math.round(zoom * 100)}%</span>
              {rotation !== 0 && (
                <span className="font-mono text-[11px] text-emerald-400">Rotation : {rotation}°</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Zoom Arrière"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
                title="Réinitialiser"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Zoom Avant"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1" />
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 text-[11px]"
                title="Pivoter de 90°"
              >
                <RotateCw className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 4. VIEWER DISPLAY AREA ──────────────────────────────────────── */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex items-center justify-center relative select-none">
          {!docUrl ? (
            /* Document Missing / Empty State */
            <div className="text-center space-y-4 max-w-md p-8 bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl">
              <div className="size-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                <BadgeAlert className="size-8 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">Cette pièce n&apos;est pas encore rattachée</h4>
                <p className="text-xs text-slate-400">
                  Le candidat n&apos;a pas téléversé &laquo; {activeDoc.title} &raquo; lors de son inscription en ligne.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadDocKey(activeDoc.key);
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 mx-auto shadow-lg shadow-emerald-500/20 transition"
              >
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Numériser / Téléverser cette pièce maintenant
              </button>
            </div>
          ) : isImage ? (
            /* Image Viewer with interactive pan/zoom */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={docUrl}
                alt={activeDoc.title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                  maxWidth: zoom <= 1 ? "100%" : "none",
                  maxHeight: zoom <= 1 ? "80vh" : "none",
                }}
                className="rounded-xl shadow-2xl object-contain border border-slate-800"
              />
            </div>
          ) : isPdf ? (
            /* PDF Viewer */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <iframe
                src={docUrl}
                title={activeDoc.title}
                className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              />
            </div>
          ) : isText ? (
            /* Plain Text (e.g. Motivation Letter) */
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-left">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{activeDoc.title}</h4>
                <p className="text-xs text-slate-400">Rédigée par {candidateName}</p>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-serif">
                {docUrl}
              </div>
            </div>
          ) : (
            /* External Link / File */
            <div className="text-center space-y-4">
              <FileText className="size-16 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-300">Fichier externe ou format non prévisualisable directement.</p>
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black shadow-md"
              >
                <ExternalLink className="size-4" />
                Ouvrir le document dans le navigateur
              </a>
            </div>
          )}
        </div>

        {/* ─── 5. FOOTER SUMMARY ──────────────────────────────────────────── */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="size-3.5" />
              {availableDocs.length} pièce(s) disponible(s) sur ce dossier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            >
              Fermer la visionneuse
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
