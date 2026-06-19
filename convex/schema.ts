import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Type de demande géré par la recyclerie. */
export const requestType = v.union(
  v.literal("aerogommage"),
  v.literal("collecte"),
  v.literal("article"),
  v.literal("velo"),
);

/** Étape du pipeline (uniquement pour les demandes ouvertes). */
export const requestStage = v.union(
  v.literal("nouveau"),
  v.literal("validation"),
  v.literal("planifie"),
);

/** Sous-type de collecte (défini dans le CRM après réception). */
export const collecteType = v.union(
  v.literal("indefini"),
  v.literal("C1"),
  v.literal("C2"),
  v.literal("C3"),
);

/** Résultat d'une demande. `open` = encore dans le pipeline. */
export const requestOutcome = v.union(
  v.literal("open"),
  v.literal("gagnee"),
  v.literal("perdue"),
);

export const requestLostReason = v.union(
  v.literal("devis_refuse"),
  v.literal("pas_de_retour_client"),
  v.literal("autre"),
);

export const requestOrigin = v.union(
  v.literal("internal"),
  v.literal("external"),
);

const customer = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.string(),
  address: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  city: v.optional(v.string()),
});

/** Un objet à aérogommer (une demande peut en contenir plusieurs). */
export const aerogommageItem = v.object({
  objectType: v.optional(v.string()),
  label: v.optional(v.string()), // précision si « Autre »
  height: v.optional(v.number()),
  width: v.optional(v.number()),
  depth: v.optional(v.number()),
  quantity: v.optional(v.number()),
  woodType: v.optional(v.string()),
  stripping: v.optional(v.string()),
  coating: v.optional(v.string()),
  coatingOther: v.optional(v.string()), // précision si « Autre »
  delivery: v.optional(v.boolean()),
  retrieval: v.optional(v.boolean()),
  comment: v.optional(v.string()),
  // Photos rattachées à cet objet précis.
  photos: v.optional(v.array(v.id("_storage"))),
});

const address = v.object({
  address: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  city: v.optional(v.string()),
});

const collecteDetails = v.object({
  // Forfaits / conditions (Oui/Non).
  dismountable: v.optional(v.boolean()),
  reusableGoodCondition: v.optional(v.boolean()),
  sorted: v.optional(v.boolean()),
  noWaste: v.optional(v.boolean()),
  // Objets à collecter (multi-sélection par famille).
  grosObjets: v.optional(v.array(v.string())),
  grosObjetsAutre: v.optional(v.string()),
  petitsObjets: v.optional(v.array(v.string())),
  petitsObjetsAutre: v.optional(v.string()),
  // Logement.
  housingType: v.optional(v.string()),
  floors: v.optional(v.number()),
  // Stationnement.
  dedicatedParking: v.optional(v.boolean()),
  parkingDistance: v.optional(v.number()),
  parkingUnknown: v.optional(v.boolean()),
  // Champs hérités (anciennes demandes).
  parkingNearby: v.optional(v.boolean()),
  largeItems: v.optional(v.string()),
  furniture: v.optional(v.string()),
  smallItems: v.optional(v.string()),
  // L'adresse de collecte peut différer de l'adresse de facturation (client).
  collectAddress: v.optional(address),
});

const articleDetails = v.object({
  articleId: v.id("articles"),
  articleTitle: v.string(),
});

const reservedArticleDetails = v.object({
  articleId: v.id("articles"),
  articleTitle: v.string(),
});

const veloDetails = v.object({
  bikeType: v.optional(v.string()),
  service: v.optional(v.string()),
  brand: v.optional(v.string()),
  condition: v.optional(v.string()),
  description: v.optional(v.string()),
});

export default defineSchema({
  articles: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    internalReference: v.optional(v.string()),
    gdrReference: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    condition: v.string(),
    keywords: v.optional(v.array(v.string())),
    themeKey: v.optional(v.string()),
    images: v.array(v.id("_storage")),
    status: v.union(
      v.literal("disponible"),
      v.literal("reserve"),
      v.literal("vendu"),
      v.literal("attente"),
      // Ancien statut conservé pour compatibilité avec les articles déjà créés.
      v.literal("lot"),
    ),
    isLot: v.optional(v.boolean()),
    bundledArticleIds: v.optional(v.array(v.id("articles"))),
    bundleKey: v.optional(v.string()),
    bundleReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  requests: defineTable({
    type: requestType,
    stage: requestStage,
    outcome: requestOutcome,
    lostReason: v.optional(requestLostReason),
    lostReasonDetails: v.optional(v.string()),
    requestOrigin: v.optional(requestOrigin),
    complete: v.boolean(),
    // Process séquentiel : liste ordonnée des étapes + nombre d'étapes cochées.
    processSteps: v.array(v.string()),
    completedSteps: v.number(),
    // Journal : qui a coché chaque étape et quand.
    processLog: v.optional(
      v.array(
        v.object({ step: v.number(), by: v.string(), at: v.number() }),
      ),
    ),
    collecteType: v.optional(collecteType),
    // --- Gestion interne (onglet Gestion du CRM) ---
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
    assignedTo: v.optional(v.id("teamMembers")),
    estimatedHours: v.optional(v.number()),
    actualHours: v.optional(v.number()),
    quoteAmount: v.optional(v.number()),
    quoteDetails: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    customer,
    comment: v.optional(v.string()),
    photos: v.array(v.id("_storage")),
    beforePhotos: v.optional(v.array(v.id("_storage"))),
    afterPhotos: v.optional(v.array(v.id("_storage"))),
    aerogommage: v.optional(v.array(aerogommageItem)),
    collecte: v.optional(collecteDetails),
    article: v.optional(articleDetails),
    articles: v.optional(v.array(reservedArticleDetails)),
    velo: v.optional(veloDetails),
    createdAt: v.number(),
    updatedAt: v.number(),
    reference: v.optional(v.string()),
    visitNeeded: v.optional(v.boolean()),
  })
    .index("by_type", ["type"])
    .index("by_outcome", ["outcome"])
    .index("by_scheduledDate", ["scheduledDate"]),

  notifications: defineTable({
    kind: v.literal("new_request"),
    title: v.string(),
    requestId: v.id("requests"),
    requestType,
    customerName: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_read_and_createdAt", ["read", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
    active: v.boolean(),
    createdAt: v.number(),
  }),

  bgJobs: defineTable({
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    storageIds: v.array(v.id("_storage")),
    backgroundPrompt: v.string(),
    articleTitle: v.optional(v.string()),
    results: v.optional(
      v.array(v.object({ originalStorageId: v.id("_storage"), newStorageId: v.id("_storage"), url: v.string() })),
    ),
    error: v.optional(v.string()),
  }),
});
