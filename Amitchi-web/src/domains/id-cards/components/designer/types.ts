export type CardElementType =
  | "text"
  | "studentPhoto"
  | "schoolLogo"
  | "image"
  | "shape"
  | "table"
  | "qrcode"
  | "barcode"
  | "signature"
  | "stamp"
  | "icon"
  | "divider"
  | "variable"
  | "watermark"
  | "badge";

export type CardSize = "CR80" | "CR100" | "Badge" | "Custom";
export type Orientation = "portrait" | "landscape";
export type CardSide = "recto" | "verso";
export type BarcodeType = "Code128" | "EAN13" | "QR" | "PDF417";

export interface CardElement {
  id: string;
  name: string;
  type: CardElementType;
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

  // Styling & Backgrounds
  backgroundColor?: string;
  bgGradient?: string;
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

  // Shapes & Icons
  shapeType?: "rectangle" | "circle" | "line" | "triangle" | "star" | "banner";
  iconName?: string;

  // Media
  src?: string;
  fit?: "contain" | "cover" | "fill";
  circularCrop?: boolean;

  // Barcode
  barcodeType?: BarcodeType;

  // Table
  rows?: number;
  cols?: number;
  tableData?: string[][];

  // Dynamic Variable Key
  variableKey?: string;
}

export const DYNAMIC_CARD_FIELDS = [
  { key: "{{student_name}}", label: "Nom & Prénom Élève", category: "Élève" },
  { key: "{{student_photo}}", label: "Photo Élève (Image dynamique)", category: "Élève" },
  { key: "{{student_id}}", label: "Matricule Élève", category: "Élève" },
  { key: "{{class}}", label: "Classe de l'élève", category: "Élève" },
  { key: "{{section}}", label: "Section / Filière", category: "Élève" },
  { key: "{{gender}}", label: "Sexe / Genre (M/F)", category: "Élève" },
  { key: "{{birth_date}}", label: "Date de naissance", category: "Élève" },
  { key: "{{birth_place}}", label: "Lieu de naissance", category: "Élève" },
  { key: "{{blood_type}}", label: "Groupe sanguin (ex: O+)", category: "Élève" },
  { key: "{{phone}}", label: "Tél. Urgence / Tuteur", category: "Élève" },
  { key: "{{guardian}}", label: "Nom du tuteur légal", category: "Élève" },
  { key: "{{address}}", label: "Adresse de résidence", category: "Élève" },

  { key: "{{school_name}}", label: "Nom de l'établissement", category: "École" },
  { key: "{{school_logo}}", label: "Logo établissement", category: "École" },
  { key: "{{academic_year}}", label: "Année scolaire en cours", category: "École" },
  { key: "{{director}}", label: "Nom du Directeur / Proviseur", category: "École" },
  { key: "{{school_phone}}", label: "Téléphone établissement", category: "École" },
  { key: "{{school_email}}", label: "Email officiel établissement", category: "École" },

  { key: "{{issue_date}}", label: "Date d'émission de la carte", category: "Document" },
  { key: "{{expiry_date}}", label: "Date d'expiration de la carte", category: "Document" },
  { key: "{{status_badge}}", label: "Statut (Actif / Inscrit)", category: "Document" },

  { key: "{{qr_code}}", label: "Code QR d'authenticité", category: "Sécurité" },
  { key: "{{barcode}}", label: "Code-barres matricule", category: "Sécurité" },
];

export const FONT_FAMILIES = [
  { name: "Poppins", label: "Poppins (Moderne)" },
  { name: "Inter", label: "Inter (Épuré)" },
  { name: "Roboto", label: "Roboto" },
  { name: "Amiri", label: "Amiri (خط عربي أنيق)" },
  { name: "Cairo", label: "Cairo (خط كايرو)" },
  { name: "Noto Sans Arabic", label: "Noto Sans Arabic" },
  { name: "IBM Plex Arabic", label: "IBM Plex Arabic" },
  { name: "Arial", label: "Arial Standard" },
  { name: "Times New Roman", label: "Times New Roman" },
];

export const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number; label: string }> = {
  CR80: { width: 324, height: 204, label: "PVC CR80 (85.6 × 54 mm)" },
  CR100: { width: 378, height: 265, label: "CR100 (100 × 70 mm)" },
  Badge: { width: 340, height: 227, label: "Badge Événement (90 × 60 mm)" },
  Custom: { width: 324, height: 204, label: "Taille Personnalisée" },
};
