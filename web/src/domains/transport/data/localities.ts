/**
 * Localities, Villages, Quartiers & Geocoding Helper for African Schools Network (Niger & Sahel)
 */

export interface Locality {
  id: string;
  name: string;
  nameAr?: string;
  region: string;
  department?: string;
  type: "Village" | "Quartier" | "Commune" | "Carrefour" | "Campus";
  lat: number;
  lng: number;
  keywords?: string[];
}

export const REGIONAL_CENTROIDS: Record<string, { lat: number; lng: number; label: string }> = {
  maradi: { lat: 13.5000, lng: 7.1017, label: "Région de Maradi" },
  niamey: { lat: 13.5126, lng: 2.1126, label: "Communauté Urbaine de Niamey" },
  zinder: { lat: 13.8072, lng: 8.9883, label: "Région de Zinder (Damagaram)" },
  tahoua: { lat: 14.8888, lng: 5.2692, label: "Région de Tahoua (Ader)" },
  agadez: { lat: 16.9744, lng: 7.9904, label: "Région d'Agadez (Aïr)" },
  dosso: { lat: 13.0490, lng: 3.1937, label: "Région de Dosso" },
  tillaberi: { lat: 14.2071, lng: 1.4542, label: "Région de Tillabéri" },
  diffa: { lat: 13.3154, lng: 12.6113, label: "Région de Diffa (Manga)" },
};

export const LOCALITIES_DATABASE: Locality[] = [
  // ── MARADI (Villages & Quartiers) ──
  {
    id: "maradi-bagalam",
    name: "Bagalam",
    nameAr: "باغالام",
    region: "Maradi",
    type: "Quartier",
    lat: 13.4862,
    lng: 7.1085,
    keywords: ["bagalam", "maradi", "sud", "poste", "terminus"],
  },
  {
    id: "maradi-alidan-sofo",
    name: "Ali Dan Sofo",
    nameAr: "علي دان صوفو",
    region: "Maradi",
    type: "Quartier",
    lat: 13.4920,
    lng: 7.1150,
    keywords: ["ali dan sofo", "alidan", "sofo", "maradi"],
  },
  {
    id: "maradi-zaria",
    name: "Zaria",
    nameAr: "زاريا",
    region: "Maradi",
    type: "Quartier",
    lat: 13.5100,
    lng: 7.1000,
    keywords: ["zaria", "maradi", "nord"],
  },
  {
    id: "maradi-tibiri",
    name: "Tibiri (Gobir)",
    nameAr: "تطبيري غوبير",
    region: "Maradi",
    type: "Commune",
    lat: 13.5627,
    lng: 7.0485,
    keywords: ["tibiri", "gobir", "maradi", "route"],
  },
  {
    id: "maradi-dan-goulbi",
    name: "Dan Goulbi",
    nameAr: "دان غولبي",
    region: "Maradi",
    type: "Village",
    lat: 13.4800,
    lng: 6.9500,
    keywords: ["dan goulbi", "dangoulbi", "village"],
  },
  {
    id: "maradi-madarounfa",
    name: "Madarounfa",
    nameAr: "مادارونفا",
    region: "Maradi",
    type: "Commune",
    lat: 13.3087,
    lng: 7.1560,
    keywords: ["madarounfa", "lac", "frontiere"],
  },
  {
    id: "maradi-tessaoua",
    name: "Tessaoua",
    nameAr: "تساوة",
    region: "Maradi",
    type: "Commune",
    lat: 13.7572,
    lng: 7.9874,
    keywords: ["tessaoua", "est"],
  },
  {
    id: "maradi-guidan-roumdji",
    name: "Guidan Roumdji",
    nameAr: "غيدان رومجي",
    region: "Maradi",
    type: "Commune",
    lat: 13.8500,
    lng: 6.9667,
    keywords: ["guidan roumdji", "roumdji"],
  },
  {
    id: "maradi-aguie",
    name: "Aguié",
    nameAr: "أغيي",
    region: "Maradi",
    type: "Commune",
    lat: 13.5060,
    lng: 7.7710,
    keywords: ["aguie", "aguié"],
  },
  {
    id: "maradi-gazaoua",
    name: "Gazaoua",
    nameAr: "غازاوة",
    region: "Maradi",
    type: "Village",
    lat: 13.5480,
    lng: 7.9250,
    keywords: ["gazaoua", "village"],
  },
  {
    id: "maradi-soumarana",
    name: "Soumarana",
    nameAr: "سومارانا",
    region: "Maradi",
    type: "Quartier",
    lat: 13.4980,
    lng: 7.0950,
    keywords: ["soumarana", "maradi"],
  },
  {
    id: "maradi-djiratawa",
    name: "Djiratawa",
    nameAr: "جيراتاوا",
    region: "Maradi",
    type: "Village",
    lat: 13.3900,
    lng: 7.1300,
    keywords: ["djiratawa", "barrage", "agricole"],
  },

  // ── NIAMEY (Quartiers & Périphérie) ──
  {
    id: "niamey-plateau",
    name: "Plateau",
    nameAr: "بلاتو",
    region: "Niamey",
    type: "Quartier",
    lat: 13.5240,
    lng: 2.1060,
    keywords: ["plateau", "centre", "administratif"],
  },
  {
    id: "niamey-yantala",
    name: "Yantala",
    nameAr: "يانتالا",
    region: "Niamey",
    type: "Quartier",
    lat: 13.5350,
    lng: 2.0800,
    keywords: ["yantala", "corniche", "bas", "haut"],
  },
  {
    id: "niamey-harobanda",
    name: "Harobanda (Rive Droite)",
    nameAr: "هاروباندا (الضفة اليمنى)",
    region: "Niamey",
    type: "Quartier",
    lat: 13.4980,
    lng: 2.1050,
    keywords: ["harobanda", "rive droite", "pont", "uam"],
  },
  {
    id: "niamey-goudel",
    name: "Goudel",
    nameAr: "غودل",
    region: "Niamey",
    type: "Village",
    lat: 13.5450,
    lng: 2.0650,
    keywords: ["goudel", "fleuve", "ouest"],
  },
  {
    id: "niamey-banifandou",
    name: "Banifandou",
    nameAr: "بانيفاندو",
    region: "Niamey",
    type: "Quartier",
    lat: 13.5380,
    lng: 2.1380,
    keywords: ["banifandou", "ceinture"],
  },
  {
    id: "niamey-kirkissoye",
    name: "Kirkissoye",
    nameAr: "كيركيسوي",
    region: "Niamey",
    type: "Village",
    lat: 13.4800,
    lng: 2.1200,
    keywords: ["kirkissoye", "rive droite", "sud"],
  },
  {
    id: "niamey-saga",
    name: "Saga",
    nameAr: "ساغا",
    region: "Niamey",
    type: "Village",
    lat: 13.4750,
    lng: 2.1550,
    keywords: ["saga", "fleuve", "est"],
  },
  {
    id: "niamey-lazaret",
    name: "Lazaret",
    nameAr: "لازاريت",
    region: "Niamey",
    type: "Quartier",
    lat: 13.5320,
    lng: 2.1480,
    keywords: ["lazaret", "ceinture verte"],
  },
  {
    id: "niamey-aeroport",
    name: "Aéroport / Pays-Bas",
    nameAr: "المطار / بي با",
    region: "Niamey",
    type: "Quartier",
    lat: 13.4850,
    lng: 2.1650,
    keywords: ["aeroport", "pays bas", "diori hamani"],
  },
  {
    id: "niamey-francophonie",
    name: "Francophonie",
    nameAr: "الفرنكوفونية",
    region: "Niamey",
    type: "Quartier",
    lat: 13.5500,
    lng: 2.1100,
    keywords: ["francophonie", "nord"],
  },

  // ── ZINDER (Damagaram) ──
  {
    id: "zinder-birni",
    name: "Birni Zinder",
    nameAr: "بيرني زندر",
    region: "Zinder",
    type: "Quartier",
    lat: 13.7990,
    lng: 8.9950,
    keywords: ["birni", "palais", "sultanat", "vieux"],
  },
  {
    id: "zinder-zengou",
    name: "Zengou",
    nameAr: "زنغو",
    region: "Zinder",
    type: "Quartier",
    lat: 13.8150,
    lng: 8.9820,
    keywords: ["zengou", "commerce", "grand marche"],
  },
  {
    id: "zinder-mirriah",
    name: "Mirriah",
    nameAr: "ميريا",
    region: "Zinder",
    type: "Commune",
    lat: 13.7073,
    lng: 9.1502,
    keywords: ["mirriah", "sud est"],
  },
  {
    id: "zinder-magaria",
    name: "Magaria",
    nameAr: "ماغاريا",
    region: "Zinder",
    type: "Commune",
    lat: 12.9983,
    lng: 8.9099,
    keywords: ["magaria", "frontiere nigeria"],
  },

  // ── TAHOUA (Ader) ──
  {
    id: "tahoua-centre",
    name: "Tahoua Ville",
    nameAr: "مدينة طاوة",
    region: "Tahoua",
    type: "Commune",
    lat: 14.8888,
    lng: 5.2692,
    keywords: ["tahoua", "centre"],
  },
  {
    id: "tahoua-konni",
    name: "Birni N'Konni",
    nameAr: "بيرني نكوني",
    region: "Tahoua",
    type: "Commune",
    lat: 13.7956,
    lng: 5.2503,
    keywords: ["konni", "birni nkonni"],
  },
];

/**
 * Calculates distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Formats distance in km or meters
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Search localities by name or keywords, prioritizing the school's region
 */
export function searchLocalities(
  query: string,
  preferredRegion?: string
): Locality[] {
  const q = query.trim().toLowerCase();
  const pref = preferredRegion?.toLowerCase().trim();

  let matches = LOCALITIES_DATABASE;

  if (q) {
    matches = matches.filter((loc) => {
      const matchName = loc.name.toLowerCase().includes(q);
      const matchAr = loc.nameAr ? loc.nameAr.includes(q) : false;
      const matchRegion = loc.region.toLowerCase().includes(q);
      const matchKeywords = loc.keywords?.some((k) => k.includes(q));
      return matchName || matchAr || matchRegion || matchKeywords;
    });
  }

  // Sort prioritizing preferred region
  if (pref) {
    matches.sort((a, b) => {
      const aInRegion = a.region.toLowerCase().includes(pref) ? 1 : 0;
      const bInRegion = b.region.toLowerCase().includes(pref) ? 1 : 0;
      return bInRegion - aInRegion;
    });
  }

  return matches;
}

/**
 * Smart resolver for school geographical coordinates based on branch, region, or route names
 */
export function resolveSchoolCoordinates(
  schoolData?: any,
  branchData?: any,
  fallbackRouteName?: string
): { lat: number; lng: number; label: string; region: string } {
  const candidateText = [
    branchData?.region,
    branchData?.department,
    branchData?.commune,
    branchData?.address,
    branchData?.branchName,
    schoolData?.name,
    fallbackRouteName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 1. Check for explicit Maradi mention (e.g. "Bagalam maradi", "AIIU Maradi")
  if (candidateText.includes("maradi") || candidateText.includes("bagalam") || candidateText.includes("tibiri")) {
    return {
      lat: 13.5000,
      lng: 7.1017,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Maradi)",
      region: "Maradi",
    };
  }

  // 2. Check for Zinder
  if (candidateText.includes("zinder") || candidateText.includes("damagaram") || candidateText.includes("mirriah")) {
    return {
      lat: 13.8072,
      lng: 8.9883,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Zinder)",
      region: "Zinder",
    };
  }

  // 3. Check for Tahoua
  if (candidateText.includes("tahoua") || candidateText.includes("konni")) {
    return {
      lat: 14.8888,
      lng: 5.2692,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Tahoua)",
      region: "Tahoua",
    };
  }

  // 4. Check for Agadez
  if (candidateText.includes("agadez") || candidateText.includes("arlit")) {
    return {
      lat: 16.9744,
      lng: 7.9904,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Agadez)",
      region: "Agadez",
    };
  }

  // 5. Check for Dosso
  if (candidateText.includes("dosso") || candidateText.includes("gaya")) {
    return {
      lat: 13.0490,
      lng: 3.1937,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Dosso)",
      region: "Dosso",
    };
  }

  // 6. Check for Tillabéri
  if (candidateText.includes("tillaberi") || candidateText.includes("tillabéri") || candidateText.includes("say")) {
    return {
      lat: 14.2071,
      lng: 1.4542,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Tillabéri)",
      region: "Tillabéri",
    };
  }

  // 7. Check for Diffa
  if (candidateText.includes("diffa") || candidateText.includes("maine")) {
    return {
      lat: 13.3154,
      lng: 12.6113,
      label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Diffa)",
      region: "Diffa",
    };
  }

  // Default: Niamey
  return {
    lat: 13.5126,
    lng: 2.1126,
    label: branchData?.branchName || schoolData?.name || "Campus Scolaire (Niamey)",
    region: "Niamey",
  };
}
