"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import TopToolbar from "./TopToolbar";
import LeftSidebar from "./LeftSidebar";
import Canvas from "./Canvas";
import RightPropertiesPanel from "./RightPropertiesPanel";
import LayersPanel from "./LayersPanel";
import { useDesignerStore } from "./useDesignerStore";
import { exportDesignToPDF, exportDesignToImage, exportDesignToJSON } from "./exportEngine";
import { saveOfficialTemplate, getOfficialTemplates, deleteOfficialTemplate } from "@/domains/settings/actions/settings.actions";
import { DesignerElement } from "./types";
import { FolderOpen, Plus, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const INITIAL_DEFAULT_HEADER_ELEMENTS: DesignerElement[] = [
  {
    id: "header_country_fr",
    name: "République (FR)",
    type: "text",
    content: "RÉPUBLIQUE DU NIGER",
    x: 40,
    y: 30,
    width: 250,
    height: 25,
    rotation: 0,
    zIndex: 1,
    fontFamily: "Times New Roman",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "left",
    color: "#0f172a",
  },
  {
    id: "header_motto",
    name: "Devise",
    type: "text",
    content: "Unité - Travail - Progrès",
    x: 40,
    y: 55,
    width: 250,
    height: 20,
    rotation: 0,
    zIndex: 2,
    fontFamily: "Times New Roman",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "left",
    color: "#64748b",
  },
  {
    id: "header_ministry",
    name: "Ministère",
    type: "text",
    content: "MINISTÈRE DE L'ÉDUCATION NATIONALE",
    x: 40,
    y: 75,
    width: 300,
    height: 25,
    rotation: 0,
    zIndex: 3,
    fontFamily: "Times New Roman",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "left",
    color: "#334155",
  },
  {
    id: "header_logo_left",
    name: "Logo Établissement",
    type: "logo",
    src: "/placeholder-logo.png",
    x: 350,
    y: 25,
    width: 80,
    height: 80,
    rotation: 0,
    zIndex: 4,
  },
  {
    id: "header_school_name",
    name: "Nom Établissement",
    type: "variable",
    variableKey: "{{school_name}}",
    content: "ÉCOLE GESTION PRO",
    x: 460,
    y: 35,
    width: 300,
    height: 35,
    rotation: 0,
    zIndex: 5,
    fontFamily: "Times New Roman",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
    color: "#1e1b4b",
  },
  {
    id: "header_academic_year",
    name: "Année Scolaire",
    type: "variable",
    variableKey: "{{academic_year}}",
    content: "Année Scolaire: 2025-2026",
    x: 460,
    y: 75,
    width: 300,
    height: 25,
    rotation: 0,
    zIndex: 6,
    fontFamily: "Times New Roman",
    fontSize: 12,
    textAlign: "right",
    color: "#475569",
  },
  {
    id: "header_divider_line",
    name: "Ligne Séparatrice",
    type: "shape",
    shapeType: "line",
    x: 30,
    y: 115,
    width: 734,
    height: 3,
    rotation: 0,
    zIndex: 7,
    backgroundColor: "#312e81",
  }
];

export default function TemplateDesigner() {
  const [saving, setSaving] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const {
    elements,
    selectedId,
    selectedElement,
    setSelectedId,
    pageSize,
    setPageSize,
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
    loadDesign,
    canUndo,
    canRedo,
  } = useDesignerStore({
    elements: INITIAL_DEFAULT_HEADER_ELEMENTS,
    pageSize: "A4",
    orientation: "portrait",
    templateName: "En-tête Officiel Ministère & École",
  });

  // Load saved templates list on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const res = await getOfficialTemplates();
    const list = (res as any)?.data;
    if (Array.isArray(list)) {
      setSavedTemplates(list);
    } else if (Array.isArray((list as any)?.data)) {
      setSavedTemplates((list as any).data);
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle");
      return;
    }

    setSaving(true);
    try {
      const res: any = await saveOfficialTemplate({
        id: templateId,
        name: templateName,
        description: templateDescription,
        pageSize,
        orientation,
        jsonDesign: elements,
        isDefault: true,
      });

      const outcome = res?.data || res;
      if (outcome?.success) {
        if (outcome?.id) setTemplateId(outcome.id);
        toast.success("تم حفظ القالب بنجاح وإدراجه كـ En-tête officiel!");
        fetchTemplates();
      } else {
        toast.error(outcome?.error || res?.error || "Erreur lors de la sauvegarde");
      }
    } catch (e: any) {
      toast.error("Erreur d'enregistrement", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: "pdf" | "png" | "jpeg" | "svg" | "json") => {
    if (format === "pdf") {
      exportDesignToPDF(elements, pageSize, orientation, templateName);
    } else if (format === "png" || format === "jpeg") {
      exportDesignToImage(format, templateName);
    } else if (format === "json") {
      exportDesignToJSON(elements, pageSize, orientation, templateName);
    }
  };

  const handleImportJSON = (json: any) => {
    if (json.elements && Array.isArray(json.elements)) {
      loadDesign({
        elements: json.elements,
        pageSize: json.pageSize || "A4",
        orientation: json.orientation || "portrait",
        templateName: json.templateName || "القالب المستورد",
      });
      toast.success("تم استيراد التصميم بنجاح!");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <TopToolbar
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        orientation={orientation}
        onOrientationChange={setOrientation}
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
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Component Library */}
        <LeftSidebar onAddElement={addElement} />

        {/* Center WYSIWYG Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Canvas
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateElement={updateElement}
            pageSize={pageSize}
            orientation={orientation}
            zoom={zoom}
            showGrid={showGrid}
            showRulers={showRulers}
            snapToGrid={snapToGrid}
          />

          {/* Bottom Layers Panel Drawer */}
          <LayersPanel
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

        {/* Right Property Inspector */}
        <RightPropertiesPanel
          element={selectedElement}
          onUpdate={updateElement}
          onDelete={deleteElement}
          onDuplicate={duplicateElement}
          onToggleLock={toggleLock}
          onToggleHide={toggleHide}
        />
      </div>
    </div>
  );
}
