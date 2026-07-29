/**
 * Source de vérité unique pour les parcelles (catalogue browse, page détail
 * et « parcelles à la une » de l'accueil). Les données proviennent du design
 * de référence (Parcelles.dc.html). Les coordonnées SVG (`points`, `cx`, `cy`,
 * `plan`) servent au plan cadastral interactif.
 */

export type Statut = "disponible" | "reserve" | "vendu";

export interface Parcelle {
  ref: string;
  ville: string;
  quartier: string;
  surf: number;
  price: number;
  rawPrice?: number;
  statut: Statut;
  verifie: boolean;
  paiement: "Échelonné" | "Comptant" | "—";
  coord: string;
  /** points du polygone sur le plan cadastral 800×620 */
  points: string;
  cx: number;
  cy: number;
  /** points du polygone sur le mini plan 200×200 (page détail) */
  plan: string;
  desc: string;
  minDuration?: number;
  maxDuration?: number;
  images?: string[];
  tauxSansRisque?: number | null;
  volatilite?: number | null;
  fraisMutation?: number | null;
  tauxActuariel?: number | null;
  fraisGestion?: number | null;
  fraisAcquisition?: number | null;
}

export interface StatutMeta {
  label: string;
  /** couleur (token CSS) du pin / de la pastille */
  color: string;
  avail: boolean;
  badgeBg: string;
  badgeFg: string;
}

export const STATUT_META: Record<Statut, StatutMeta> = {
  disponible: {
    label: "Disponible",
    color: "var(--secondary)",
    avail: true,
    badgeBg: "var(--secondary)",
    badgeFg: "#FFFDF9",
  },
  reserve: {
    label: "Réservé",
    color: "var(--gold)",
    avail: false,
    badgeBg: "var(--gold)",
    badgeFg: "#22201D",
  },
  vendu: {
    label: "Vendu",
    color: "var(--alert)",
    avail: false,
    badgeBg: "var(--alert)",
    badgeFg: "#FFFDF9",
  },
};

export const PARCELLES: Parcelle[] = [
  {
    ref: "AC-0142",
    ville: "Abomey-Calavi",
    quartier: "Zopah",
    surf: 500,
    price: 4500000,
    statut: "disponible",
    verifie: true,
    paiement: "Échelonné",
    coord: "6.4489° N · 2.3556° E",
    points: "70,70 232,64 246,250 78,262",
    cx: 156,
    cy: 162,
    plan: "55,50 150,44 158,150 60,158",
    desc: "Belle parcelle d'angle viabilisée, à 5 min du campus d'Abomey-Calavi. Terrain plat, sol de latérite stable, idéal pour une construction résidentielle. Accès par voie pavée.",
  },
  {
    ref: "CT-0288",
    ville: "Cotonou",
    quartier: "Fidjrossè",
    surf: 300,
    price: 12000000,
    statut: "reserve",
    verifie: true,
    paiement: "Comptant",
    coord: "6.3560° N · 2.3800° E",
    points: "256,64 420,66 428,252 250,250",
    cx: 338,
    cy: 158,
    plan: "60,55 150,55 148,150 58,148",
    desc: "Parcelle premium proche du bord de mer de Fidjrossè, dans un quartier en forte valorisation. Environnement calme et résidentiel, réseaux disponibles à proximité immédiate.",
  },
  {
    ref: "OU-0076",
    ville: "Ouidah",
    quartier: "Pahou",
    surf: 600,
    price: 3800000,
    statut: "disponible",
    verifie: true,
    paiement: "Échelonné",
    coord: "6.4100° N · 2.0850° E",
    points: "448,66 616,60 630,246 442,252",
    cx: 534,
    cy: 156,
    plan: "50,52 152,48 156,152 54,156",
    desc: "Grand terrain le long de l'axe Cotonou–Ouidah, parfait pour un projet familial ou locatif. Zone en plein développement, à proximité des écoles et marchés de Pahou.",
  },
  {
    ref: "PN-0311",
    ville: "Porto-Novo",
    quartier: "Ouando",
    surf: 450,
    price: 5200000,
    statut: "disponible",
    verifie: true,
    paiement: "Échelonné",
    coord: "6.4969° N · 2.6289° E",
    points: "648,62 762,72 766,246 640,248",
    cx: 704,
    cy: 157,
    plan: "58,50 150,56 152,152 56,150",
    desc: "Parcelle bien orientée dans le quartier d'Ouando, à proximité des axes administratifs de la capitale. Titre foncier individuel, bornage récent.",
  },
  {
    ref: "SK-0205",
    ville: "Sèmè-Kpodji",
    quartier: "Djeffa",
    surf: 800,
    price: 6900000,
    statut: "vendu",
    verifie: true,
    paiement: "—",
    coord: "6.4200° N · 2.4800° E",
    points: "78,352 246,346 250,544 88,552",
    cx: 165,
    cy: 448,
    plan: "52,48 152,52 150,152 54,150",
    desc: "Vaste terrain de 800 m² à Djeffa, désormais vendu. Consultez nos parcelles similaires disponibles dans la même zone.",
  },
  {
    ref: "AL-0119",
    ville: "Allada",
    quartier: "Sékou",
    surf: 1000,
    price: 4200000,
    statut: "disponible",
    verifie: false,
    paiement: "Échelonné",
    coord: "6.6656° N · 2.1514° E",
    points: "262,346 428,350 424,548 254,544",
    cx: 342,
    cy: 447,
    plan: "48,50 154,46 156,156 52,154",
    desc: "Grand terrain de 1000 m² à prix accessible, idéal pour un projet agricole ou une résidence spacieuse. Vérification du titre foncier en cours de finalisation.",
  },
  {
    ref: "BH-0233",
    ville: "Bohicon",
    quartier: "Agongointo",
    surf: 700,
    price: 3500000,
    statut: "disponible",
    verifie: true,
    paiement: "Échelonné",
    coord: "7.1782° N · 2.0667° E",
    points: "446,350 618,344 630,546 440,548",
    cx: 534,
    cy: 447,
    plan: "54,52 150,50 152,150 56,152",
    desc: "Parcelle bien située au carrefour commercial de Bohicon, sur un axe passant. Excellent potentiel pour commerce ou habitation. Sol ferme et bien drainé.",
  },
  {
    ref: "GP-0188",
    ville: "Grand-Popo",
    quartier: "Gbécon",
    surf: 500,
    price: 4800000,
    statut: "reserve",
    verifie: true,
    paiement: "Comptant",
    coord: "6.2811° N · 1.8236° E",
    points: "648,348 762,354 758,548 642,548",
    cx: 704,
    cy: 449,
    plan: "58,54 150,50 148,152 56,150",
    desc: "Terrain proche du littoral de Grand-Popo, cadre naturel et paisible, très recherché pour une résidence secondaire. Actuellement réservé — liste d'attente ouverte.",
  },
];

/** Nombre de mensualités par défaut pour le paiement échelonné. */
export const MENSUALITES = 24;

export function fmtFCFA(n: number): string {
  try {
    return new Intl.NumberFormat("fr-FR").format(n);
  } catch {
    return String(n);
  }
}

export function getParcelle(ref: string): Parcelle | undefined {
  return PARCELLES.find((p) => p.ref === ref);
}

export function pricePerM2(p: Parcelle): number {
  return Math.round(p.price / p.surf);
}

export function mensualite(p: Parcelle, months: number = MENSUALITES): number {
  return Math.round(p.price / months);
}

/** Libellé du CTA d'une carte selon le statut. */
export function ctaLabel(p: Parcelle): string {
  if (STATUT_META[p.statut].avail) return "Réserver";
  return p.statut === "reserve" ? "Liste d’attente" : "Voir";
}

/** Villes distinctes, pour les filtres. */
export function villes(): string[] {
  return Array.from(new Set(PARCELLES.map((p) => p.ville)));
}

/**
 * Coordonnées géographiques [lat, lng] extraites du champ `coord`
 * (ex. "6.4489° N · 2.3556° E"). Le Bénin étant en hémisphère N/E, les
 * valeurs sont positives. Utilisé pour positionner les parcelles sur la carte.
 */
export function parseCoord(p: Parcelle): [number, number] {
  const nums = p.coord.match(/[\d.]+/g);
  if (!nums || nums.length < 2) return [7.5, 2.3]; // centre Bénin par défaut
  return [parseFloat(nums[0]), parseFloat(nums[1])];
}

/** Plages de superficie pour le filtre (m²). */
export const SURFACE_RANGES = [
  { value: "all", label: "Superficie", min: 0, max: Infinity },
  { value: "0-400", label: "< 400 m²", min: 0, max: 400 },
  { value: "400-600", label: "400 – 600 m²", min: 400, max: 600 },
  { value: "600-1000", label: "600 – 1000 m²", min: 600, max: 1000 },
  { value: "1000+", label: "1000 m² et +", min: 1000, max: Infinity },
] as const;

/** Plages de prix pour le filtre (FCFA). */
export const PRICE_RANGES = [
  { value: "all", label: "Tout budget", min: 0, max: Infinity },
  { value: "0-5", label: "< 5 M FCFA", min: 0, max: 5_000_000 },
  { value: "5-10", label: "5 – 10 M FCFA", min: 5_000_000, max: 10_000_000 },
  { value: "10-20", label: "10 – 20 M FCFA", min: 10_000_000, max: 20_000_000 },
  { value: "20+", label: "20 M+ FCFA", min: 20_000_000, max: Infinity },
] as const;

export function inRange(
  ranges: readonly { value: string; min: number; max: number }[],
  value: string,
  n: number,
): boolean {
  const r = ranges.find((x) => x.value === value);
  if (!r || r.value === "all") return true;
  return n >= r.min && n < r.max;
}
