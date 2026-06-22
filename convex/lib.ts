import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Vérifie qu'une session Clerk valide est présente.
 * Pour l'instant le CRM est accessible à tout compte connecté ; un filtre par
 * email/rôle pourra être ajouté ici plus tard.
 */
export async function requireStaff(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Non authentifié — accès réservé au personnel.");
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
