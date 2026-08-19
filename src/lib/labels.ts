/**
 * Références imprimées sur les QR codes.
 *
 * Une étiquette ne porte que le QR code et sa référence en clair. Deux familles
 * de codes circulent dans la recyclerie :
 *   - les articles, identifiés par leur référence interne à 6 chiffres ;
 *   - les caisses de rangement, préfixées « CA- » pour être reconnues au scan.
 */

/** Préfixe des codes de caisse — doit rester aligné sur `convex/caisses.ts`. */
export const CAISSE_CODE_PREFIX = "CA-";

const CAISSE_CODE_PATTERN = /^CA-\d{4,}$/;

/** Normalise un code lu par la caméra ou la douchette (casse, espaces). */
export function normalizeScanCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Vrai si le code scanné désigne une caisse plutôt qu'un article. */
export function isCaisseCode(raw: string): boolean {
  return CAISSE_CODE_PATTERN.test(normalizeScanCode(raw));
}

/** Référence imprimée sur l'étiquette d'un article. */
export function articleLabelReference(article: {
  _id: string;
  internalReference?: string;
  gdrReference?: string;
}): string {
  return article.internalReference ?? article.gdrReference ?? article._id.slice(-8);
}

/**
 * Numéro imprimé en gros sur l'étiquette d'une caisse : les 2 derniers chiffres
 * du code, sans le préfixe. `CA-0007` → « 07 ». C'est ce que l'équipe lit de
 * loin pour repérer une caisse sans la scanner ; le code complet reste dans le
 * QR code et à l'écran.
 */
export function caisseLabelCaption(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.slice(-2) || code;
}
