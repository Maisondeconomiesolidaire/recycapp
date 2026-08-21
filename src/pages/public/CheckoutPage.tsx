import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAction } from "convex/react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { getStripe } from "../../lib/stripe";
import { useCart } from "../../lib/useCart";
import { errorMessage } from "../../lib/convexError";
import { checkoutAppearance, BRAND, PICKUP_DEADLINE_DAYS } from "./checkoutTheme";

/** Panier transmis par la page précédente, pour afficher le récapitulatif. */
export type CheckoutHandoff = {
  draftId: string;
  clientSecret: string;
  /** Montant réellement dû, remise déduite. */
  total: number;
  /** Total avant remise, présent seulement quand un code promo est appliqué. */
  subtotal?: number;
  discountCode?: string;
  discountPercent?: number;
  discountAmount?: number;
  items: Array<{ id: string; title: string; price: number; imageUrl?: string }>;
};

export function CheckoutPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const handoff = (location.state ?? null) as CheckoutHandoff | null;

  // Retour d'une authentification 3-D Secure : Stripe renvoie sur cette page
  // avec le PaymentIntent en paramètre, sans l'état de navigation.
  const returnedPaymentIntent = searchParams.get("payment_intent");
  const returnedDraftId = searchParams.get("draft_id");

  if (returnedPaymentIntent && returnedDraftId) {
    return (
      <RedirectReturn
        draftId={returnedDraftId as Id<"publicStripeCheckoutDrafts">}
        paymentIntentId={returnedPaymentIntent}
      />
    );
  }

  if (!handoff) return <Navigate to="/boutique/panier" replace />;

  return (
    <Elements
      stripe={getStripe()}
      options={{ clientSecret: handoff.clientSecret, appearance: checkoutAppearance, locale: "fr" }}
    >
      <CheckoutLayout handoff={handoff} />
    </Elements>
  );
}

/** Reprise après redirection 3-D Secure : on confirme la commande côté serveur. */
function RedirectReturn({
  draftId,
  paymentIntentId,
}: {
  draftId: Id<"publicStripeCheckoutDrafts">;
  paymentIntentId: string;
}) {
  const confirmPayment = useAction(api.stripe.confirmPublicCartPayment);
  const navigate = useNavigate();
  const cart = useCart();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await confirmPayment({ draftId, paymentIntentId });
        if (cancelled) return;
        cart.clear();
        navigate("/merci?type=achat", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Confirmation du paiement impossible."));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, paymentIntentId]);

  if (error) return <PaymentTakenError message={error} />;
  return <FullSpinner label="Confirmation de votre paiement…" />;
}

/**
 * Le paiement a abouti chez Stripe mais l'enregistrement de la commande a
 * échoué (article vendu entre-temps, par exemple). On ne masque surtout pas :
 * le client doit savoir qu'il a été débité et qui contacter.
 */
function PaymentTakenError({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-20">
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-xl font-bold text-amber-900">
          Votre commande n'a pas pu être finalisée
        </h1>
        <p className="mt-3 text-sm leading-6 text-amber-800">{message}</p>
        <p className="mt-3 text-sm leading-6 text-amber-800">
          Si votre carte a été débitée, contactez-nous : nous régularisons la
          situation (remboursement ou mise de côté de l'article).
        </p>
        <Link
          to="/boutique"
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: BRAND }}
        >
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
}

function CheckoutLayout({ handoff }: { handoff: CheckoutHandoff }) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmPayment = useAction(api.stripe.confirmPublicCartPayment);
  const navigate = useNavigate();
  const cart = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [settling, setSettling] = useState(false);

  const returnUrl = useMemo(
    () =>
      `${window.location.origin}/boutique/paiement?draft_id=${encodeURIComponent(
        handoff.draftId,
      )}`,
    [handoff.draftId],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        // Les moyens de paiement qui l'exigent (3-D Secure) redirigent ;
        // les autres restent sur la page.
        redirect: "if_required",
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Le paiement n'a pas abouti. Aucun montant n'a été débité.",
        );
        return;
      }

      if (result.paymentIntent?.status !== "succeeded") {
        setError(
          "Le paiement est en attente de confirmation par votre banque. Vous recevrez un email dès qu'il sera validé.",
        );
        return;
      }

      // Encaissement confirmé : on enregistre la commande côté serveur.
      setSettling(true);
      await confirmPayment({
        draftId: handoff.draftId as Id<"publicStripeCheckoutDrafts">,
        paymentIntentId: result.paymentIntent.id,
      });
      cart.clear();
      navigate("/merci?type=achat", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Une erreur est survenue pendant le paiement."));
    } finally {
      setSubmitting(false);
      setSettling(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
      <Link
        to="/boutique/panier"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/82 px-4 py-2.5 text-sm font-medium text-zinc-500 shadow-sm backdrop-blur transition hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au panier
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_440px] lg:items-start">
        {/* ── Paiement ── */}
        <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(24,24,27,0.1)] sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: BRAND }}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: BRAND }}
              >
                Paiement sécurisé
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                Régler ma commande
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{ layout: "tabs" }} />

            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm leading-6 text-amber-900">
                <strong>
                  Vous avez {PICKUP_DEADLINE_DAYS} jours pour venir retirer votre
                  article en boutique.
                </strong>{" "}
                Passé ce délai, votre commande est remboursée et l'article remis
                en vente. Prévenez-nous si vous ne pouvez pas venir à temps.
              </p>
            </div>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!stripe || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ backgroundColor: BRAND }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {settling ? "Enregistrement de la commande…" : "Paiement en cours…"}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Payer {formatPrice(handoff.total)}
                </>
              )}
            </button>

            <div className="grid gap-2 rounded-2xl bg-zinc-50 p-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, text: "Paiement chiffré par Stripe" },
                { icon: BadgeCheck, text: "Aucune donnée bancaire stockée" },
                { icon: PackageOpen, text: `Retrait sous ${PICKUP_DEADLINE_DAYS} jours` },
                { icon: Lock, text: "3-D Secure pris en charge" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </form>
        </div>

        {/* ── Récapitulatif ── */}
        <div className="space-y-5">
          <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(24,24,27,0.1)]">
            <h2 className="text-lg font-bold tracking-tight text-zinc-950">
              Votre commande
            </h2>
            <div className="mt-5 space-y-3">
              {handoff.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <PackageOpen className="h-5 w-5 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <p className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-zinc-950">
                    {item.title}
                  </p>
                  <span className="shrink-0 text-sm font-bold text-zinc-950">
                    {formatPrice(item.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[22px] px-6 py-5 text-white shadow-[0_12px_40px_rgba(241,16,79,0.28)]"
            style={{ backgroundColor: BRAND }}
          >
            {handoff.discountPercent !== undefined && (
              <div className="mb-3 space-y-1 border-b border-white/25 pb-3 text-sm text-white/85">
                <div className="flex items-center justify-between">
                  <span>Sous-total</span>
                  <span>{formatPrice(handoff.subtotal ?? handoff.total)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>
                    Remise {handoff.discountPercent} %
                    {handoff.discountCode ? ` · ${handoff.discountCode}` : ""}
                  </span>
                  <span>−{formatPrice(handoff.discountAmount ?? 0)}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
                Total à payer
              </p>
              <span className="text-3xl font-extrabold">{formatPrice(handoff.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
