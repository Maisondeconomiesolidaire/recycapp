import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Clé publiable Stripe de la boutique. Elle est publique par nature (elle ne
 * permet que de créer des moyens de paiement côté navigateur) ; la clé secrète
 * vit uniquement dans les variables d'environnement du déploiement Convex.
 */
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;

/**
 * Paiement en ligne suspendu : la boutique est une vitrine, la vente se fait
 * avec un encadrant. Le panier ne propose plus que la réservation, et les liens
 * de paiement sont désactivés. Repasser à `Boolean(PUBLISHABLE_KEY)` pour le
 * réactiver.
 */
const ONLINE_PAYMENT_SUSPENDED = true;
export const stripeEnabled = !ONLINE_PAYMENT_SUSPENDED && Boolean(PUBLISHABLE_KEY);

let stripePromise: Promise<Stripe | null> | null = null;

/** `loadStripe` n'est appelé qu'une fois pour toute l'application. */
export function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}
