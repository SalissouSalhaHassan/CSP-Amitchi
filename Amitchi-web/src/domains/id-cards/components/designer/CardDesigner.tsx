"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import CardTopToolbar from "./CardTopToolbar";
import CardLeftSidebar from "./CardLeftSidebar";
import CardCanvas from "./CardCanvas";
import CardRightProperties from "./CardRightProperties";
import CardLayersPanel from "./CardLayersPanel";
import { useCardTemplateStore } from "./CardTemplateStore";
import { exportCardToPDF, exportCardToImage, exportCardToJSON } from "./cardExportEngine";
import { saveCardTemplate, getCardTemplates, deleteCardTemplate } from "@/domains/academics/actions/academics.actions";
import { getBranches } from "@/domains/settings/actions/settings.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { CardElement } from "./types";
import { Users, Search, Printer, Check, X, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_RECTO_CARD_ELEMENTS: CardElement[] = [
  {
    id: "card_bg_header",
    name: "Fond d'en-tête",
    type: "shape",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: 324,
    height: 48,
    rotation: 0,
    zIndex: 1,
    bgGradient: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  },
  {
    id: "card_school_logo",
    name: "Logo école",
    type: "schoolLogo",
    variableKey: "{{school_logo}}",
    src: "/placeholder-logo.png",
    x: 10,
    y: 6,
    width: 36,
    height: 36,
    rotation: 0,
    zIndex: 2,
  },
  {
    id: "card_school_name",
    name: "Nom école",
    type: "variable",
    variableKey: "{{school_name}}",
    content: "ÉCOLE GESTION PRO",
    x: 52,
    y: 8,
    width: 260,
    height: 20,
    rotation: 0,
    zIndex: 3,
    fontFamily: "Poppins",
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "left",
  },
  {
    id: "card_doc_title",
    name: "Titre du document",
    type: "text",
    content: "CARTE D'IDENTITÉ SCOLAIRE",
    x: 52,
    y: 28,
    width: 260,
    height: 15,
    rotation: 0,
    zIndex: 4,
    fontFamily: "Poppins",
    fontSize: 9,
    fontWeight: "bold",
    color: "#fbbf24",
    letterSpacing: 1,
    textAlign: "left",
  },
  {
    id: "card_student_photo",
    name: "Photo élève",
    type: "studentPhoto",
    variableKey: "{{student_photo}}",
    src: "/placeholder-student.png",
    x: 12,
    y: 58,
    width: 70,
    height: 85,
    rotation: 0,
    zIndex: 5,
    borderRadius: 10,
    borderColor: "#4338ca",
    borderWidth: 2,
  },
  {
    id: "card_student_name",
    name: "Nom élève",
    type: "variable",
    variableKey: "{{student_name}}",
    content: "MAMADOU SOW",
    x: 92,
    y: 58,
    width: 220,
    height: 22,
    rotation: 0,
    zIndex: 6,
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  {
    id: "card_student_id",
    name: "Matricule",
    type: "variable",
    variableKey: "{{student_id}}",
    content: "Matricule: EDUT-100482",
    x: 92,
    y: 82,
    width: 220,
    height: 16,
    rotation: 0,
    zIndex: 7,
    fontFamily: "Poppins",
    fontSize: 10,
    fontWeight: "bold",
    color: "#4338ca",
  },
  {
    id: "card_student_class",
    name: "Classe",
    type: "variable",
    variableKey: "{{class}}",
    content: "Classe: 6ème A",
    x: 92,
    y: 100,
    width: 220,
    height: 16,
    rotation: 0,
    zIndex: 8,
    fontFamily: "Poppins",
    fontSize: 10,
    color: "#334155",
  },
  {
    id: "card_academic_year",
    name: "Année scolaire",
    type: "variable",
    variableKey: "{{academic_year}}",
    content: "Année: 2025-2026",
    x: 92,
    y: 118,
    width: 220,
    height: 16,
    rotation: 0,
    zIndex: 9,
    fontFamily: "Poppins",
    fontSize: 10,
    color: "#64748b",
  },
  {
    id: "card_qrcode",
    name: "Code QR sécurité",
    type: "qrcode",
    variableKey: "{{qr_code}}",
    content: "EDUT-CARD-VERIFIED",
    x: 265,
    y: 145,
    width: 48,
    height: 48,
    rotation: 0,
    zIndex: 10,
  },
  {
    id: "card_barcode",
    name: "Code-barres",
    type: "barcode",
    variableKey: "{{barcode}}",
    content: "EDUT-100482",
    x: 12,
    y: 152,
    width: 130,
    height: 38,
    rotation: 0,
    zIndex: 11,
  }
];

interface CardDesignerProps {
  externalStudents?: any[];
  externalPreviewStudentId?: number | null;
  onExternalPreviewStudentChange?: (id: number) => void;
  externalActiveBranch?: any;
}

export default function CardDesigner({
  externalStudents,
  externalPreviewStudentId,
  onExternalPreviewStudentChange,
  externalActiveBranch,
}: CardDesignerProps = {}) {
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [showBatchModal, setShowBatchModal] = useState(false);

  const {
    elements,
    rectoElements,
    versoElements,
    activeSide,
    setActiveSide,
    selectedId,
    selectedElement,
    setSelectedId,
    cardType,
    setCardType,
    orientation,
    setOrientation,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    snapToGrid,
    setSnapToGrid,
    templateId,
    setTemplateId,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveLayer,
    toggleLock,
    toggleHide,
    undo,
    redo,
    loadCardDesign,
    canUndo,
    canRedo,
  } = useCardTemplateStore({
    rectoElements: DEFAULT_RECTO_CARD_ELEMENTS,
    versoElements: [],
    cardType: "CR80",
    orientation: "landscape",
    templateName: "Carte Élève CR80 Officielle",
  });

  useEffect(() => {
    getStudents().then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setStudents(data);
        if (!externalPreviewStudentId) setPreviewStudentId(data[0].id);
      }
    });
    getBranches().then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) setBranches(data);
    });
  }, []);

  const effectiveStudents = externalStudents && externalStudents.length > 0 ? externalStudents : students;
  const effectivePreviewId = externalPreviewStudentId !== undefined && externalPreviewStudentId !== null ? externalPreviewStudentId : previewStudentId;
  const handlePreviewStudentChange = onExternalPreviewStudentChange || setPreviewStudentId;

  const activeStudent = useMemo(() => {
    if (effectivePreviewId) {
      return effectiveStudents.find(s => s.id === effectivePreviewId) || effectiveStudents[0] || null;
    }
    return effectiveStudents[0] || null;
  }, [effectiveStudents, effectivePreviewId]);

  const activeBranch = useMemo(() => {
    return externalActiveBranch || branches[0] || null;
  }, [externalActiveBranch, branches]);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.nomEtudiant?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.numAdmission?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.classe?.toLowerCase().includes(searchStudent.toLowerCase())
    );
  }, [students, searchStudent]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle de carte");
      return;
    }

    setSaving(true);
    try {
      const res: any = await saveCardTemplate({
        id: templateId,
        name: templateName,
        description: templateDescription,
        cardType,
        orientation,
        rectoDesign: rectoElements,
        versoDesign: versoElements,
        isDefault: true,
      });

      const outcome = res?.data || res;
      if (outcome?.success) {
        if (outcome?.id) setTemplateId(outcome.id);
        toast.success("Modèle de carte enregistré avec succès !");
      } else {
        toast.error(outcome?.error || "Erreur lors de l'enregistrement du modèle");
      }
    } catch (e: any) {
      toast.error("Erreur d'enregistrement", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: "pdf" | "png" | "jpeg" | "json") => {
    if (format === "pdf") {
      exportCardToPDF(cardType, orientation, templateName);
    } else if (format === "png" || format === "jpeg") {
      exportCardToImage(format, templateName);
    } else if (format === "json") {
      exportCardToJSON(rectoElements, versoElements, cardType, orientation, templateName);
    }
  };

  const handleImportJSON = (json: any) => {
    if (json.rectoElements && Array.isArray(json.rectoElements)) {
      loadCardDesign({
        rectoElements: json.rectoElements,
        versoElements: json.versoElements || [],
        cardType: json.cardType || "CR80",
        orientation: json.orientation || "landscape",
        templateName: json.templateName || "Modèle de carte importé",
      });
      toast.success("Modèle de carte importé avec succès !");
    }
  };

  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] rounded-[2.5rem] border border-slate-200 bg-slate-100 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <CardTopToolbar
        cardType={cardType}
        onCardTypeChange={setCardType}
        orientation={orientation}
        onOrientationChange={setOrientation}
        activeSide={activeSide}
        onSideChange={setActiveSide}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers(!showRulers)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onImportJSON={handleImportJSON}
        onSave={handleSave}
        saving={saving}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        onBatchPrintClick={() => setShowBatchModal(true)}
        students={effectiveStudents}
        previewStudentId={effectivePreviewId}
        onPreviewStudentChange={handlePreviewStudentChange}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <CardLeftSidebar onAddElement={addElement} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <CardCanvas
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateElement={updateElement}
            cardType={cardType}
            orientation={orientation}
            zoom={zoom}
            showGrid={showGrid}
            showRulers={showRulers}
            snapToGrid={snapToGrid}
            activeStudent={activeStudent}
            activeBranch={activeBranch}
          />

          <CardLayersPanel
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveLayer={moveLayer}
            onToggleLock={toggleLock}
            onToggleHide={toggleHide}
            onDuplicate={duplicateElement}
            onDelete={deleteElement}
          />
        </div>

        <CardRightProperties
          element={selectedElement}
          onUpdate={updateElement}
          onDelete={deleteElement}
          onDuplicate={duplicateElement}
          onToggleLock={toggleLock}
          onToggleHide={toggleHide}
        />
      </div>

      {/* Batch Student Selection Printing Modal */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-900 dark:bg-indigo-950 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl">
                    <Printer size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Impression par lots des cartes d'identité élèves</h3>
                    <p className="text-xs text-indigo-200 dark:text-indigo-300">Sélectionnez les élèves pour générer et imprimer leurs cartes automatiquement avec ce modèle</p>
                  </div>
                </div>
                <button onClick={() => setShowBatchModal(false)} className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-white dark:bg-[#131622]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, matricule ou classe..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="pl-10 h-11 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-sm"
                  />
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStudentSelection(st.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 shadow-sm" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                            {isSelected && <Check size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{st.nomEtudiant} {st.prenomEtudiant}</p>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Matricule: {st.numAdmission || "N/A"} | Classe: {st.classe || "Non assignée"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{selectedStudentIds.length} élève(s) sélectionné(s)</span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setShowBatchModal(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    Annuler
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success(`Impression de ${selectedStudentIds.length || 1} carte(s) en cours...`);
                      window.print();
                    }}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6"
                  >
                    <Printer size={16} className="mr-2" /> Imprimer les cartes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
