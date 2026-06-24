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

/**
 * Catégories d'objets à collecter, illustrées par les pictogrammes
 * (`public/icones-collecte/<key>.png`). La clé sert de valeur stockée.
 */
export const COLLECTE_CATEGORIES: { key: string; label: string; image: string }[] = [
  { key: "mobilier", label: "Mobilier", image: "/icones-collecte/mobilier.png" },
  {
    key: "gros-appareils-electromenagers",
    label: "Gros électroménager",
    image: "/icones-collecte/gros-appareils-electromenagers.png",
  },
  {
    key: "objets-electriques",
    label: "Objets électriques",
    image: "/icones-collecte/objets-electriques.png",
  },
  {
    key: "outils-thermiques",
    label: "Outils thermiques",
    image: "/icones-collecte/outils-thermiques.png",
  },
  {
    key: "bricolage-jardin",
    label: "Bricolage & jardin",
    image: "/icones-collecte/bricolage-jardin.png",
  },
  { key: "sport-loisirs", label: "Sport & loisirs", image: "/icones-collecte/sport-loisirs.png" },
  { key: "jeux-jouets", label: "Jeux & jouets", image: "/icones-collecte/jeux-jouets.png" },
  { key: "livres", label: "Livres", image: "/icones-collecte/livres.png" },
  {
    key: "vinyles-cd-dvd-jeux-videos",
    label: "Vinyles, CD, DVD & jeux vidéo",
    image: "/icones-collecte/vinyles-cd-dvd-jeux-videos.png",
  },
  {
    key: "vaiselle-decoration",
    label: "Vaisselle & décoration",
    image: "/icones-collecte/vaiselle-decoration.png",
  },
  { key: "deco-textile", label: "Déco & textile", image: "/icones-collecte/deco-textile.png" },
  { key: "textile", label: "Textile", image: "/icones-collecte/textile.png" },
];

export const COLLECTE_CATEGORY_BY_KEY: Record<
  string,
  { key: string; label: string; image: string }
> = Object.fromEntries(COLLECTE_CATEGORIES.map((c) => [c.key, c]));

/**
 * Sous-catégories rattachées à chacune de nos 12 catégories principales
 * (clé = clé de COLLECTE_CATEGORIES). Curation grand public des désignations,
 * utilisée par les pages Arrivages / Sorties.
 */
export const COLLECTE_SUBCATEGORIES: Record<string, string[]> = {
  mobilier: [
    "Canapé",
    "Fauteuil",
    "Chaise / Tabouret",
    "Petit meuble",
    "Buffet / Armoire",
    "Table",
    "Bureau",
    "Matelas",
    "Lit / Sommier",
    "Étagère / Bibliothèque",
    "Autre",
  ],
  "gros-appareils-electromenagers": [
    "Gros électroménager froid",
    "Gros électroménager hors froid",
    "Cuisinière / Four",
    "Lave-linge",
    "Lave-vaisselle",
    "Hotte",
    "Écran",
    "Autre",
  ],
  "objets-electriques": [
    "Aspirateur",
    "Cafetière",
    "Bouilloire",
    "Grille-pain",
    "Micro-ondes",
    "Mixeur / Blender",
    "Robot de cuisine",
    "Friteuse",
    "Fer à repasser / Centrale vapeur",
    "Sèche-cheveux",
    "Ventilateur",
    "Radiateur",
    "Machine à coudre",
    "Machine à pain",
    "Ampli / Hifi",
    "Enceinte",
    "Home cinéma",
    "Lecteur CD / DVD",
    "Platine vinyle",
    "Radio",
    "Téléphone",
    "Ordinateur",
    "Imprimante",
    "Appareil photo / Caméra",
    "Console de jeux",
    "Autre",
  ],
  "outils-thermiques": [
    "Tronçonneuse",
    "Débroussailleuse",
    "Coupe-haie",
    "Tondeuse",
    "Souffleur",
    "Motoculteur",
    "Compresseur",
    "Groupe électrogène",
    "Autre",
  ],
  "bricolage-jardin": [
    "Outillage manuel",
    "Outillage électrique",
    "Jardinage",
    "Bricolage",
    "Matériaux",
    "Quincaillerie",
    "Autre",
  ],
  "sport-loisirs": [
    "Sport",
    "Instruments de musique",
    "Animaux / Chasse / Pêche",
    "Mercerie / Couture",
    "Vélo adulte",
    "Vélo enfant",
    "Accessoires & pièces cycle",
    "Plein air",
    "Autre",
  ],
  "jeux-jouets": [
    "Jouet électrique",
    "Jouet 1er âge",
    "Jeux",
    "Jeux de société",
    "Jeux de construction",
    "Puériculture",
    "Jouets vrac",
    "Autre",
  ],
  livres: [
    "Livres vrac",
    "Livre poche",
    "Livre jeunesse",
    "Livre grand format",
    "BD",
    "Autre",
  ],
  "vinyles-cd-dvd-jeux-videos": [
    "Vinyle",
    "CD / Musique",
    "DVD / Film",
    "Jeux vidéo",
    "K7 / Cassette",
    "Culture vrac",
    "Autre",
  ],
  "vaiselle-decoration": [
    "Vaisselle",
    "Verres",
    "Couverts",
    "Ustensiles",
    "Cuisson",
    "Vaisselle vrac",
    "Autre",
  ],
  "deco-textile": [
    "Bibelots",
    "Cadres / Tableaux",
    "Objets déco",
    "Luminaires",
    "Miroirs",
    "Linge de maison décoratif",
    "Déco vrac",
    "Autre",
  ],
  textile: [
    "Textile vrac",
    "Vêtements Homme",
    "Vêtements Femme",
    "Vêtements Enfant",
    "Chaussures",
    "Linge de maison",
    "Maroquinerie / Accessoires",
    "Bijoux",
    "Textile au kilo",
    "Autre",
  ],
};

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
