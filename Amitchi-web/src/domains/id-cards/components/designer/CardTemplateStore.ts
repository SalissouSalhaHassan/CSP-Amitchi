import { useState, useCallback, useRef, useEffect } from "react";
import { CardElement, CardElementType, CardSize, Orientation, CardSide, CARD_DIMENSIONS } from "./types";

export interface CardDesignerState {
  rectoElements: CardElement[];
  versoElements: CardElement[];
  activeSide: CardSide;
  cardType: CardSize;
  orientation: Orientation;
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  templateId?: number;
  templateName: string;
  templateDescription: string;
}

export function useCardTemplateStore(initialState?: Partial<CardDesignerState>) {
  const [cardType, setCardType] = useState<CardSize>(initialState?.cardType || "CR80");
  const [orientation, setOrientation] = useState<Orientation>(initialState?.orientation || "landscape");
  const [activeSide, setActiveSide] = useState<CardSide>(initialState?.activeSide || "recto");
  const [zoom, setZoom] = useState<number>(initialState?.zoom || 150); // 150% default zoom for cards
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [templateId, setTemplateId] = useState<number | undefined>(initialState?.templateId);
  const [templateName, setTemplateName] = useState<string>(initialState?.templateName || "Carte Élève CR80 Officielle");
  const [templateDescription, setTemplateDescription] = useState<string>(initialState?.templateDescription || "");

  const [rectoElements, setRectoElements] = useState<CardElement[]>(initialState?.rectoElements || []);
  const [versoElements, setVersoElements] = useState<CardElement[]>(initialState?.versoElements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Undo / Redo Stack for Recto & Verso
  const historyRef = useRef<{ recto: CardElement[]; verso: CardElement[] }[]>([
    { recto: initialState?.rectoElements || [], verso: initialState?.versoElements || [] }
  ]);
  const historyIndexRef = useRef<number>(0);
  const clipboardRef = useRef<CardElement | null>(null);

  const pushHistory = useCallback((r: CardElement[], v: CardElement[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({
      recto: JSON.parse(JSON.stringify(r)),
      verso: JSON.parse(JSON.stringify(v)),
    });
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const currentElements = activeSide === "recto" ? rectoElements : versoElements;

  const setCurrentElementsWithHistory = useCallback((updater: (prev: CardElement[]) => CardElement[]) => {
    if (activeSide === "recto") {
      setRectoElements(prev => {
        const next = updater(prev);
        pushHistory(next, versoElements);
        return next;
      });
    } else {
      setVersoElements(prev => {
        const next = updater(prev);
        pushHistory(rectoElements, next);
        return next;
      });
    }
  }, [activeSide, rectoElements, versoElements, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setRectoElements(JSON.parse(JSON.stringify(state.recto)));
      setVersoElements(JSON.parse(JSON.stringify(state.verso)));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setRectoElements(JSON.parse(JSON.stringify(state.recto)));
      setVersoElements(JSON.parse(JSON.stringify(state.verso)));
    }
  }, []);

  const addElement = useCallback((type: CardElementType, customProps?: Partial<CardElement>) => {
    const id = `card_el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dim = CARD_DIMENSIONS[cardType];
    const width = orientation === "landscape" ? dim.width : dim.height;

    const baseZIndex = currentElements.length ? Math.max(...currentElements.map(e => e.zIndex)) + 1 : 1;

    let defaultElement: CardElement = {
      id,
      name: `${type.toUpperCase()} ${currentElements.length + 1}`,
      type,
      x: Math.round(width / 2 - 50),
      y: 20 + currentElements.length * 15,
      width: 100,
      height: 25,
      rotation: 0,
      zIndex: baseZIndex,
      color: "#111827",
      fontFamily: "Poppins",
      fontSize: 12,
      textAlign: "left",
      fontWeight: "normal",
      opacity: 1,
      ...customProps,
    };

    if (type === "text" || type === "variable") {
      defaultElement.content = customProps?.content || (type === "variable" ? customProps?.variableKey || "{{student_name}}" : "Nouveau Texte");
    } else if (type === "studentPhoto") {
      defaultElement.width = 65;
      defaultElement.height = 75;
      defaultElement.borderRadius = 8;
      defaultElement.src = "/placeholder-student.png";
      defaultElement.variableKey = "{{student_photo}}";
    } else if (type === "schoolLogo") {
      defaultElement.width = 40;
      defaultElement.height = 40;
      defaultElement.src = "/placeholder-logo.png";
      defaultElement.variableKey = "{{school_logo}}";
    } else if (type === "shape") {
      defaultElement.width = 80;
      defaultElement.height = 80;
      defaultElement.backgroundColor = "#4338ca";
      defaultElement.shapeType = customProps?.shapeType || "rectangle";
    } else if (type === "qrcode") {
      defaultElement.width = 45;
      defaultElement.height = 45;
      defaultElement.variableKey = "{{qr_code}}";
      defaultElement.content = "EDUT-CARD-VERIFIED";
    } else if (type === "barcode") {
      defaultElement.width = 120;
      defaultElement.height = 30;
      defaultElement.variableKey = "{{barcode}}";
      defaultElement.barcodeType = "Code128";
      defaultElement.content = "EDUT-100284";
    } else if (type === "signature" || type === "stamp") {
      defaultElement.width = 60;
      defaultElement.height = 30;
      defaultElement.content = type === "signature" ? "Le Directeur" : "CACHET EDUT";
    }

    setCurrentElementsWithHistory(prev => [...prev, defaultElement]);
    setSelectedId(id);
  }, [cardType, orientation, currentElements, setCurrentElementsWithHistory]);

  const updateElement = useCallback((id: string, updates: Partial<CardElement>) => {
    setCurrentElementsWithHistory(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  }, [setCurrentElementsWithHistory]);

  const deleteElement = useCallback((id: string) => {
    setCurrentElementsWithHistory(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, setCurrentElementsWithHistory]);

  const duplicateElement = useCallback((id: string) => {
    const target = currentElements.find(e => e.id === id);
    if (!target) return;
    const newId = `card_el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copy: CardElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} Copy`,
      x: target.x + 10,
      y: target.y + 10,
      zIndex: Math.max(...currentElements.map(e => e.zIndex)) + 1,
    };
    setCurrentElementsWithHistory(prev => [...prev, copy]);
    setSelectedId(newId);
  }, [currentElements, setCurrentElementsWithHistory]);

  const moveLayer = useCallback((id: string, direction: "up" | "down" | "top" | "bottom") => {
    setCurrentElementsWithHistory(prev => {
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
  }, [setCurrentElementsWithHistory]);

  const toggleLock = useCallback((id: string) => {
    setCurrentElementsWithHistory(prev =>
      prev.map(e => (e.id === id ? { ...e, locked: !e.locked } : e))
    );
  }, [setCurrentElementsWithHistory]);

  const toggleHide = useCallback((id: string) => {
    setCurrentElementsWithHistory(prev =>
      prev.map(e => (e.id === id ? { ...e, hidden: !e.hidden } : e))
    );
  }, [setCurrentElementsWithHistory]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
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
          const target = currentElements.find(el => el.id === selectedId);
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
        const target = currentElements.find(el => el.id === selectedId);
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
  }, [selectedId, currentElements, undo, redo, deleteElement, duplicateElement, updateElement]);

  const loadCardDesign = useCallback((design: { rectoElements: CardElement[]; versoElements?: CardElement[]; cardType?: CardSize; orientation?: Orientation; templateName?: string; templateId?: number }) => {
    if (design.cardType) setCardType(design.cardType);
    if (design.orientation) setOrientation(design.orientation);
    if (design.templateName) setTemplateName(design.templateName);
    if (design.templateId) setTemplateId(design.templateId);
    setRectoElements(design.rectoElements || []);
    setVersoElements(design.versoElements || []);
    historyRef.current = [{ recto: design.rectoElements || [], verso: design.versoElements || [] }];
    historyIndexRef.current = 0;
    setSelectedId(null);
  }, []);

  const selectedElement = currentElements.find(e => e.id === selectedId) || null;

  return {
    elements: currentElements,
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
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
  };
}
