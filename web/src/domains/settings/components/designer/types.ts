export type ElementType =
  | "text"
  | "image"
  | "logo"
  | "shape"
  | "table"
  | "qrcode"
  | "barcode"
  | "signature"
  | "stamp"
  | "watermark"
  | "date"
  | "pageNumber"
  | "variable";

export type PageSize = "A4" | "A5" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";

export interface DesignerElement {
  id: string;
  name: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;

  // Typography & Text
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textTransform?: "none" | "uppercase" | "lowercase";
  textAlign?: "left" | "center" | "right" | "justify";
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;

  // Styling & Appearance
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;

  // Shadow
  boxShadowEnabled?: boolean;
  boxShadowColor?: string;
  boxShadowBlur?: number;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;

  // Padding
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Shapes
  shapeType?: "rectangle" | "circle" | "line";
  strokeColor?: string;
  strokeWidth?: number;

  // Media & Assets
  src?: string;
  alt?: string;
  fit?: "contain" | "cover" | "fill";

  // Table
  rows?: number;
  cols?: number;
  tableData?: string[][];

  // Dynamic Variable
  variableKey?: string;
}

export const DYNAMIC_VARIABLES = [
  { key: "{{school_name}}", label: "Nom Établissement (FR)", category: "École" },
  { key: "{{school_name_ar}}", label: "Nom Établissement (AR)", category: "École" },
  { key: "{{country}}", label: "République / Pays", category: "École" },
  { key: "{{ministry}}", label: "Ministère de l'Éducation", category: "École" },
  { key: "{{student_name}}", label: "Nom et Prénom Élève", category: "Élève" },
  { key: "{{student_number}}", label: "Matricule Élève", category: "Élève" },
  { key: "{{class}}", label: "Classe (ex: 6ème A)", category: "Classe" },
  { key: "{{section}}", label: "Section / Série", category: "Classe" },
  { key: "{{academic_year}}", label: "Année Scolaire", category: "Session" },
  { key: "{{term}}", label: "Période / Semestre", category: "Session" },
  { key: "{{teacher_name}}", label: "Professeur Principal", category: "Personnel" },
  { key: "{{director}}", label: "Directeur / Proviseur", category: "Personnel" },
  { key: "{{average}}", label: "Moyenne Générale", category: "Notes" },
  { key: "{{rank}}", label: "Rang / Classement", category: "Notes" },
  { key: "{{decision}}", label: "Décision du Conseil", category: "Notes" },
  { key: "{{date}}", label: "Date du Jour", category: "Général" },
  { key: "{{phone}}", label: "Téléphone Établissement", category: "École" },
  { key: "{{email}}", label: "Email Établissement", category: "École" },
  { key: "{{address}}", label: "Adresse Établissement", category: "École" },
];

export const FONT_FAMILIES = [
  { name: "Times New Roman", label: "Times New Roman (Classique)" },
  { name: "Arial", label: "Arial (Standard)" },
  { name: "Calibri", label: "Calibri" },
  { name: "Amiri", label: "Amiri (العربي الأصيل)" },
  { name: "Cairo", label: "Cairo (خط كايرو الحديث)" },
  { name: "Noto Sans Arabic", label: "Noto Sans Arabic (عربي واضح)" },
  { name: "IBM Plex Arabic", label: "IBM Plex Arabic" },
  { name: "Roboto", label: "Roboto" },
  { name: "Inter", label: "Inter (Moderne)" },
  { name: "Tahoma", label: "Tahoma" },
  { name: "Verdana", label: "Verdana" },
];

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },      // 210mm x 297mm at 96 DPI
  A5: { width: 559, height: 794 },       // 148mm x 210mm at 96 DPI
  Letter: { width: 816, height: 1056 },  // 8.5in x 11in
  Legal: { width: 816, height: 1344 },   // 8.5in x 14in
};
