import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { UserIdentity } from "convex/server";

/**
 * Met en forme un nom/prénom : première lettre de chaque mot en majuscule,
 * le reste en minuscules. Gère les composés ("jean-pierre" → "Jean-Pierre",
 * "marie dupont" → "Marie Dupont", "DE LA TOUR" → "De La Tour").
 */
export function titleCaseName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, ch: string) =>
      sep + ch.toLocaleUpperCase("fr-FR"),
    );
}

/** Normalise les prénom/nom d'un objet client. */
export function normalizeCustomer<T extends { firstName: string; lastName: string }>(
  customer: T,
): T {
  return {
    ...customer,
    firstName: titleCaseName(customer.firstName),
    lastName: titleCaseName(customer.lastName),
  };
}

/** Formate un nom complet client de manière homogène. */
export function customerFullName(customer: {
  firstName?: string;
  lastName?: string;
}): string {
  return [customer.firstName, customer.lastName]
    .filter(Boolean)
    .map((part) => titleCaseName(part!))
    .join(" ")
    .trim();
}

/** Toute identité Clerk authentifiée (client ou staff). */
export async function requireUser(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Non authentifié.");
  }
  return identity;
}

/**
 * Détermine si une identité Clerk correspond à un membre du staff.
 *
 * Mécanisme principal : le rôle exposé par Clerk (`publicMetadata.role`),
 * disponible dans le token Convex si le template JWT « convex » inclut
 *   "role": "{{user.public_metadata.role}}".
 *
 * Filet de sécurité (« break-glass ») : la variable d'environnement Convex
 * STAFF_EMAILS (emails séparés par des virgules) évite que le staff soit
 * verrouillé hors du CRM tant que le claim de rôle n'est pas configuré.
 */
export function isStaffIdentity(identity: UserIdentity): boolean {
  const role = (identity as { role?: unknown }).role;
  if (role === "staff" || role === "admin") return true;

  const allow = (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const email = identity.email?.toLowerCase();
  return Boolean(email && allow.includes(email));
}

/** Vérifie qu'une session Clerk *staff* est présente (CRM). */
export async function requireStaff(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await requireUser(ctx);
  if (!isStaffIdentity(identity)) {
    throw new Error("Accès réservé au personnel.");
  }
  return identity;
}

type AerogommageItemInput = {
  objectType?: string;
  label?: string;
  height?: number;
  width?: number;
  depth?: number;
  quantity?: number;
  woodType?: string;
  stripping?: string;
  coating?: string;
  coatingOther?: string;
  delivery?: boolean;
  retrieval?: boolean;
  comment?: string;
};

type CollecteInput = {
  dismountable?: boolean;
  reusableGoodCondition?: boolean;
  sorted?: boolean;
  noWaste?: boolean;
  grosObjets?: string[];
  grosObjetsAutre?: string;
  petitsObjets?: string[];
  petitsObjetsAutre?: string;
  housingType?: string;
  floors?: number;
  dedicatedParking?: boolean;
  parkingDistance?: number;
  parkingUnknown?: boolean;
  largeItems?: string;
  furniture?: string;
  smallItems?: string;
  collectAddress?: {
    address?: string;
    postalCode?: string;
    city?: string;
  };
};

type CustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
};

function customerComplete(c: CustomerInput): boolean {
  return Boolean(
    c.firstName?.trim() &&
      c.lastName?.trim() &&
      c.email?.trim() &&
      c.phone?.trim(),
  );
}

/**
 * Une demande est « complète » quand le client a renseigné tous les champs
 * requis selon son type. Calculé côté serveur au moment de l'envoi.
 */
export function isAerogommageComplete(
  customer: CustomerInput,
  items: AerogommageItemInput[],
): boolean {
  if (!customerComplete(customer)) return false;
  if (items.length === 0) return false;
  return items.every(
    (d) =>
      Boolean(d.objectType?.trim()) &&
      typeof d.height === "number" &&
      typeof d.width === "number" &&
      typeof d.depth === "number" &&
      Boolean(d.woodType?.trim()) &&
      Boolean(d.stripping?.trim()) &&
      Boolean(d.coating?.trim()),
  );
}

export function isCollecteComplete(
  customer: CustomerInput,
  d: CollecteInput,
): boolean {
  const hasItems = Boolean(
    (d.grosObjets && d.grosObjets.length > 0) ||
      (d.petitsObjets && d.petitsObjets.length > 0) ||
      d.grosObjetsAutre?.trim() ||
      d.petitsObjetsAutre?.trim() ||
      // compat anciennes demandes
      d.largeItems?.trim() ||
      d.furniture?.trim() ||
      d.smallItems?.trim(),
  );
  const ca = d.collectAddress;
  const hasCollectAddress = Boolean(
    ca?.address?.trim() && ca?.postalCode?.trim() && ca?.city?.trim(),
  );
  return (
    customerComplete(customer) &&
    Boolean(customer.address?.trim()) &&
    Boolean(customer.postalCode?.trim()) &&
    Boolean(customer.city?.trim()) &&
    hasCollectAddress &&
    hasItems
  );
}

export function isArticleComplete(customer: CustomerInput): boolean {
  return customerComplete(customer);
}

type VeloInput = {
  bikeType?: string;
  service?: string;
  brand?: string;
  condition?: string;
  description?: string;
};

export function isVeloComplete(customer: CustomerInput, d: VeloInput): boolean {
  return (
    customerComplete(customer) &&
    Boolean(d.bikeType?.trim()) &&
    Boolean(d.service?.trim())
  );
}
