import type { CSSProperties } from "react";

export type RequestType = "aerogommage" | "collecte" | "article" | "velo";
export type RequestStage = "nouveau" | "validation" | "planifie";
export type RequestOutcome = "open" | "gagnee" | "perdue";
export type RequestOrigin = "internal" | "external";

export const TYPE_LABELS: Record<RequestType, string> = {
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  article: "Boutique",
  velo: "Cycle en Bray",
};

/** Couleur officielle (hex) de chaque type de demande — charte Cycle en Bray. */
export const TYPE_COLORS: Record<RequestType, string> = {
  aerogommage: "#782170",
  collecte: "#317fa0",
  article: "#a0315a",
  velo: "#196b24",
};

export const REQUEST_TYPES: RequestType[] = [
  "aerogommage",
  "collecte",
  "article",
  "velo",
];

/** Styles inline pour un badge teinté à la couleur du type. */
export function typeBadgeStyle(type: RequestType): CSSProperties {
  const c = TYPE_COLORS[type];
  return {
    backgroundColor: `${c}22`,
    color: c,
    boxShadow: `inset 0 0 0 1px ${c}55`,
  };
}

/** Variante claire (texte blanc sur fond plein) pour pastilles fortes. */
export function typeSolidStyle(type: RequestType): CSSProperties {
  return { backgroundColor: TYPE_COLORS[type], color: "#fff" };
}

export const STAGES: { key: RequestStage; label: string }[] = [
  { key: "nouveau", label: "Nouveau" },
  { key: "validation", label: "Validation client" },
  { key: "planifie", label: "Prestation planifiée" },
];

export const STAGE_LABELS: Record<RequestStage, string> = {
  nouveau: "Nouveau",
  validation: "Validation client",
  planifie: "Prestation planifiée",
};

export const OUTCOME_LABELS: Record<RequestOutcome, string> = {
  open: "En cours",
  gagnee: "Gagnée",
  perdue: "Perdue",
};

export const REQUEST_ORIGIN_LABELS: Record<RequestOrigin, string> = {
  internal: "Interne",
  external: "Externe",
};

export function requestTypeDisplayLabel(request: {
  type: RequestType;
  collecteType?: CollecteType | undefined;
}): string {
  if (
    request.type === "collecte" &&
    request.collecteType &&
    request.collecteType !== "indefini"
  ) {
    return `Collecte ${request.collecteType}`;
  }
  return TYPE_LABELS[request.type];
}

// --- Gestion interne --------------------------------------------------------

export type Site = "60" | "76";

export const SITE_LABELS: Record<Site, string> = {
  "60": "Recyclerie 60",
  "76": "Recyclerie 76",
};

// --- Process & sous-types de collecte ---------------------------------------

export const STEP_PRESTATION_PLANIFIEE = "Prestation planifiée";

export type CollecteType = "indefini" | "C1" | "C2" | "C3";

export const COLLECTE_TYPE_LABELS: Record<CollecteType, string> = {
  indefini: "Collecte à définir",
  C1: "Collecte C1",
  C2: "Collecte C2",
  C3: "Collecte C3",
};

export const COLLECTE_TYPE_OPTIONS: { value: CollecteType; label: string }[] = [
  { value: "C1", label: "Collecte C1" },
  { value: "C2", label: "Collecte C2" },
  { value: "C3", label: "Collecte C3" },
];

/** Colonne Kanban (Nouveau / Validation / Planifié) déduite du process. */
export function deriveStage(r: {
  completedSteps: number;
  processSteps: string[];
}): RequestStage {
  if (r.completedSteps === 0) return "nouveau";
  const done = r.processSteps.slice(0, r.completedSteps);
  if (done.includes(STEP_PRESTATION_PLANIFIEE)) return "planifie";
  return "validation";
}

/** Étape visible dans l'UI: dernière étape cochée, pas la suivante. */
export function getDisplayedProcessStep(r: {
  completedSteps: number;
  processSteps: string[];
}): string | null {
  if (r.processSteps.length === 0) return null;
  if (r.completedSteps <= 0) return "Nouvelle demande";
  return r.processSteps[Math.min(r.completedSteps, r.processSteps.length) - 1] ?? null;
}

// --- Options des formulaires ------------------------------------------------

export const AERO_OBJECT_TYPES = [
  "Armoire",
  "Buffet",
  "Bureau",
  "Chaise",
  "Bahut",
  "Vaisselier",
  "Buffet 2 corps",
  "Fauteuil",
  "Commode",
  "Table",
  "Table de chevet",
  "Table gigogne",
  "Table basse",
  "Meuble bas",
  "Banc",
  "Bibliothèque",
  "Autre (veuillez préciser)",
];

export const WOOD_TYPES = ["Bois dur", "Bois tendre", "Je ne sais pas"];

export const STRIPPING_OPTIONS = [
  "Décapage intérieur seulement",
  "Décapage extérieur seulement",
  "Décapage intérieur / extérieur",
];

export const COATING_OPTIONS = [
  "Lasure / Teinte",
  "Peinture",
  "Vernis",
  "Autre (précisez)",
];

export const ARTICLE_CATEGORIES = [
  "Maison et Jardin",
  "Électronique",
  "Loisirs",
];

export const ARTICLE_CATEGORY_SLUGS: Record<string, string> = {
  "Maison et Jardin": "maison-et-jardin",
  "Électronique": "electronique",
  Loisirs: "loisirs",
};

export const ARTICLE_SLUG_TO_CATEGORY = Object.fromEntries(
  Object.entries(ARTICLE_CATEGORY_SLUGS).map(([label, slug]) => [slug, label]),
) as Record<string, string>;

/** Sous-catégories par catégorie de la boutique. */
export const ARTICLE_SUBCATEGORIES: Record<string, string[]> = {
  "Maison et Jardin": [
    "Ameublement",
    "Électroménager",
    "Décoration",
    "Bricolage",
    "Vaisselle",
  ],
  "Électronique": [
    "Ordinateurs",
    "Téléphones",
    "Tablettes",
    "Photo, audio et vidéo",
    "Accessoires informatique",
  ],
  Loisirs: [
    "Jeux et Jouets",
    "Vélos",
    "CD - Musique",
    "DVD - Films",
    "Instruments de musique",
    "Livres",
  ],
};

// --- Collecte ---------------------------------------------------------------

/** Familles d'objets sélectionnables (gros et petits objets). */
export const COLLECTE_ITEM_OPTIONS = [
  "Meubles",
  "Petit appareil électroménager",
  "Gros appareil électroménager",
  "Écran",
  "Sports et Loisirs",
  "Jouets",
  "Vaisselle",
  "Déco/Bibelots",
  "Puériculture",
  "Textile",
  "Bricolage et Jardin",
  "Autres (précisez)",
];

export const HOUSING_TYPES = ["Maison", "Appartement", "Studio", "Autre"];

export const ARTICLE_CONDITIONS = [
  "Neuf",
  "Très bon état",
  "Bon état",
  "État correct",
  "À rénover",
];

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
  attente: "En attente",
  lot: "En attente",
};

// --- Options du formulaire Vélo (Cycle en Bray) -----------------------------

export const BIKE_TYPES = [
  "Vélo de ville",
  "VTT",
  "Vélo de route",
  "Vélo enfant",
  "Vélo électrique",
  "BMX",
  "Autre",
];

export const BIKE_SERVICES = [
  "Réparation",
  "Révision / entretien",
  "Don d'un vélo",
  "Recherche d'un vélo",
  "Atelier participatif",
  "Autre",
];

export const BIKE_CONDITIONS = ["Roulant", "En panne", "Pour pièces"];
