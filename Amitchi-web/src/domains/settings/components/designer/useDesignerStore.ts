import { useState, useCallback, useEffect, useRef } from "react";
import { DesignerElement, ElementType, PageSize, Orientation, PAGE_DIMENSIONS } from "./types";

export interface DesignerState {
  elements: DesignerElement[];
  selectedId: string | null;
  pageSize: PageSize;
  orientation: Orientation;
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  templateId?: number;
  templateName: string;
  templateDescription: string;
}

export function useDesignerStore(initialState?: Partial<DesignerState>) {
  const [pageSize, setPageSize] = useState<PageSize>(initialState?.pageSize || "A4");
  const [orientation, setOrientation] = useState<Orientation>(initialState?.orientation || "portrait");
  const [zoom, setZoom] = useState<number>(initialState?.zoom || 100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  
  const [templateId, setTemplateId] = useState<number | undefined>(initialState?.templateId);
  const [templateName, setTemplateName] = useState<string>(initialState?.templateName || "En-tête Officiel");
  const [templateDescription, setTemplateDescription] = useState<string>(initialState?.templateDescription || "");

  const [elements, setElements] = useState<DesignerElement[]>(initialState?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Undo / Redo History Stack
  const historyRef = useRef<DesignerElement[][]>([initialState?.elements || []]);
  const historyIndexRef = useRef<number>(0);
  const clipboardRef = useRef<DesignerElement | null>(null);

  const pushHistory = useCallback((newElements: DesignerElement[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(newElements)));
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const updateElementsWithHistory = useCallback((updater: (prev: DesignerElement[]) => DesignerElement[]) => {
    setElements(prev => {
      const next = updater(prev);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const previousState = historyRef.current[historyIndexRef.current];
      setElements(JSON.parse(JSON.stringify(previousState)));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];
      setElements(JSON.parse(JSON.stringify(nextState)));
    }
  }, []);

  const addElement = useCallback((type: ElementType, customProps?: Partial<DesignerElement>) => {
    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dim = PAGE_DIMENSIONS[pageSize];
    const width = orientation === "landscape" ? dim.height : dim.width;

    const baseZIndex = elements.length ? Math.max(...elements.map(e => e.zIndex)) + 1 : 1;

    let defaultElement: DesignerElement = {
      id,
      name: `${type.toUpperCase()} ${elements.length + 1}`,
      type,
      x: Math.round(width / 2 - 100),
      y: 50 + elements.length * 20,
      width: 200,
      height: 40,
      rotation: 0,
      zIndex: baseZIndex,
      color: "#000000",
      fontFamily: "Times New Roman",
      fontSize: 16,
      textAlign: "center",
      fontWeight: "normal",
      opacity: 1,
      ...customProps,
    };

    if (type === "text" || type === "variable") {
      defaultElement.content = customProps?.content || (type === "variable" ? customProps?.variableKey || "{{school_name}}" : "Nouveau Texte");
    } else if (type === "shape") {
      defaultElement.width = 150;
      defaultElement.height = 150;
      defaultElement.backgroundColor = "#e2e8f0";
      defaultElement.borderColor = "#94a3b8";
      defaultElement.borderWidth = 1;
      defaultElement.shapeType = customProps?.shapeType || "rectangle";
    } else if (type === "logo" || type === "image") {
      defaultElement.width = 100;
      defaultElement.height = 100;
      defaultElement.src = customProps?.src || "/placeholder-logo.png";
    } else if (type === "table") {
      defaultElement.width = 400;
      defaultElement.height = 120;
      defaultElement.rows = 3;
      defaultElement.cols = 3;
      defaultElement.tableData = [
        ["Matière", "Note", "Mention"],
        ["Mathématiques", "16.00", "Très Bien"],
        ["Français", "14.50", "Bien"]
      ];
    } else if (type === "qrcode" || type === "barcode") {
      defaultElement.width = 80;
      defaultElement.height = 80;
      defaultElement.content = customProps?.content || "EDUT-OFFICIAL-VERIFIED";
    } else if (type === "signature" || type === "stamp") {
      defaultElement.width = 120;
      defaultElement.height = 60;
      defaultElement.content = type === "signature" ? "Le Directeur" : "CACHET OFFICIEL";
    }

    updateElementsWithHistory(prev => [...prev, defaultElement]);
    setSelectedId(id);
  }, [pageSize, orientation, elements.length, updateElementsWithHistory]);

  const updateElement = useCallback((id: string, updates: Partial<DesignerElement>) => {
    updateElementsWithHistory(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  }, [updateElementsWithHistory]);

  const deleteElement = useCallback((id: string) => {
    updateElementsWithHistory(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, updateElementsWithHistory]);

  const duplicateElement = useCallback((id: string) => {
    const target = elements.find(e => e.id === id);
    if (!target) return;
    const newId = `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copy: DesignerElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} Copy`,
      x: target.x + 20,
      y: target.y + 20,
      zIndex: Math.max(...elements.map(e => e.zIndex)) + 1,
    };
    updateElementsWithHistory(prev => [...prev, copy]);
    setSelectedId(newId);
  }, [elements, updateElementsWithHistory]);

  const moveLayer = useCallback((id: string, direction: "up" | "down" | "top" | "bottom") => {
    updateElementsWithHistory(prev => {
      const copy = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = copy.findIndex(e => e.id === id);
      if (index === -1) return prev;

      if (direction === "up" && index < copy.length - 1) {
        const temp = copy[index].zIndex;
        copy[index].zIndex = copy[index + 1].zIndex;
        copy[index + 1].zIndex = temp;
      } else if (direction === "down" && index > 0) {
        const temp = copy[index].zIndex;
        copy[index].zIndex = copy[index - 1].zIndex;
        copy[index - 1].zIndex = temp;
      } else if (direction === "top") {
        const maxZ = Math.max(...copy.map(e => e.zIndex));
        copy[index].zIndex = maxZ + 1;
      } else if (direction === "bottom") {
        const minZ = Math.min(...copy.map(e => e.zIndex));
        copy[index].zIndex = Math.max(1, minZ - 1);
      }
      return copy;
    });
  }, [updateElementsWithHistory]);

  const toggleLock = useCallback((id: string) => {
    updateElementsWithHistory(prev =>
      prev.map(e => (e.id === id ? { ...e, locked: !e.locked } : e))
    );
  }, [updateElementsWithHistory]);

  const toggleHide = useCallback((id: string) => {
    updateElementsWithHistory(prev =>
      prev.map(e => (e.id === id ? { ...e, hidden: !e.hidden } : e))
    );
  }, [updateElementsWithHistory]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return; // Don't intercept when typing in form fields
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId) {
          const target = elements.find(el => el.id === selectedId);
          if (target) clipboardRef.current = JSON.parse(JSON.stringify(target));
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboardRef.current) {
          e.preventDefault();
          duplicateElement(clipboardRef.current.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) {
          e.preventDefault();
          duplicateElement(selectedId);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteElement(selectedId);
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const target = elements.find(el => el.id === selectedId);
        if (target && !target.locked) {
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowUp") dy = -step;
          if (e.key === "ArrowDown") dy = step;
          if (e.key === "ArrowLeft") dx = -step;
          if (e.key === "ArrowRight") dx = step;
          updateElement(selectedId, { x: target.x + dx, y: target.y + dy });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements, undo, redo, deleteElement, duplicateElement, updateElement]);

  const loadDesign = useCallback((design: { elements: DesignerElement[]; pageSize?: PageSize; orientation?: Orientation; templateName?: string; templateId?: number }) => {
    if (design.pageSize) setPageSize(design.pageSize);
    if (design.orientation) setOrientation(design.orientation);
    if (design.templateName) setTemplateName(design.templateName);
    if (design.templateId) setTemplateId(design.templateId);
    setElements(design.elements || []);
    historyRef.current = [design.elements || []];
    historyIndexRef.current = 0;
    setSelectedId(null);
  }, []);

  const selectedElement = elements.find(e => e.id === selectedId) || null;

  return {
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
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
  };
}
