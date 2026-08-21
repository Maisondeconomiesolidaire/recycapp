import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Lock,
  PackageOpen,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { getStripe, stripeEnabled } from "../../lib/stripe";
import { errorMessage } from "../../lib/convexError";
import { checkoutAppearance, BRAND, PICKUP_DEADLINE_DAYS } from "./checkoutTheme";

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const EMPTY: Customer = { firstName: "", lastName: "", email: "", phone: "" };

/**
 * Achat d'un article depuis la vitrine (mode kiosque).
 *
 * Le client est devant la boutique : on ne lui demande ni compte, ni adresse
 * postale — seulement de quoi le rappeler et lui envoyer son justificatif. Le
 * paiement passe par le même flux que la boutique en ligne, donc le montant est
 * verrouillé côté serveur et l'article est bien marqué vendu à l'encaissement.
 */
export function KioskCheckout() {
  const { id } = useParams<{ id: string }>();
  const articleId = id as Id<"articles"> | undefined;
  const article = useQuery(
    api.articles.getPublic,
    articleId ? { id: articleId } : "skip",
  );
  const createPaymentIntent = useAction(api.stripe.createPublicCartPaymentIntent);

  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<{
    draftId: Id<"publicStripeCheckoutDrafts">;
    clientSecret: string;
    total: number;
  } | null>(null);

  if (!articleId) return <KioskShell><p>Article inconnu.</p></KioskShell>;
  if (article === undefined) return <FullSpinner label="Chargement de l'article…" />;
  if (article === null) {
    return (
      <KioskShell>
        <EmptyMessage
          title="Article introuvable"
          description="Il a peut-être été vendu. Revenez à la vitrine pour en choisir un autre."
        />
      </KioskShell>
    );
  }

  const available = article.status === "disponible";

  async function handleStart() {
    if (preparing || !articleId) return;
    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      setError("Indiquez votre prénom et votre nom.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) {
      setError("Indiquez une adresse email valide pour recevoir votre reçu.");
      return;
    }
    setPreparing(true);
    setError("");
    try {
      const intent = await createPaymentIntent({
        articleIds: [articleId],
        customer: {
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
        },
        comment: "Achat depuis la vitrine (kiosque).",
      });
      setHandoff({
        draftId: intent.draftId as Id<"publicStripeCheckoutDrafts">,
        clientSecret: intent.clientSecret,
        total: intent.total,
      });
    } catch (err) {
      setError(errorMessage(err, "Impossible de démarrer le paiement."));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <KioskShell>
      <div className="grid gap-8 lg:grid-cols-[1fr_460px] lg:items-start">
        {/* Article */}
        <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
          {article.imageUrls[0] ? (
            <img
              src={article.imageUrls[0]}
              alt={article.title}
              className="max-h-[46vh] w-full object-contain bg-[#f2eee7]"
            />
          ) : (
            <div className="flex h-64 items-center justify-center bg-[#f2eee7] text-zinc-300">
              <PackageOpen className="h-16 w-16" />
            </div>
          )}
          <div className="p-7">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {article.title}
            </h1>
            <p className="mt-2 text-zinc-500">
              {article.category} · {article.condition}
              {article.caisseCode ? ` · Caisse ${article.caisseCode}` : ""}
            </p>
            <p className="mt-4 text-4xl font-extrabold" style={{ color: BRAND }}>
              {formatPrice(article.price)}
            </p>
            {article.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-600">
                {article.description}
              </p>
            )}
          </div>
        </div>

        {/* Achat */}
        <div className="rounded-[28px] border border-zinc-200 bg-white p-7">
          {!available ? (
            <EmptyMessage
              title="Cet article n'est plus disponible"
              description="Il vient d'être réservé ou vendu. Revenez à la vitrine pour en choisir un autre."
            />
          ) : !stripeEnabled ? (
            <EmptyMessage
              title="Paiement indisponible"
              description="Le paiement par carte n'est pas configuré sur cette borne. Adressez-vous à l'accueil."
            />
          ) : !handoff ? (
            <>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                Vos coordonnées
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pour votre reçu et le retrait de votre article.
              </p>

              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <KioskInput
                    label="Prénom"
                    value={customer.firstName}
                    onChange={(firstName) =>
                      setCustomer((c) => ({ ...c, firstName }))
                    }
                  />
                  <KioskInput
                    label="Nom"
                    value={customer.lastName}
                    onChange={(lastName) => setCustomer((c) => ({ ...c, lastName }))}
                  />
                </div>
                <KioskInput
                  label="Email"
                  type="email"
                  value={customer.email}
                  onChange={(email) => setCustomer((c) => ({ ...c, email }))}
                />
                <KioskInput
                  label="Téléphone (facultatif)"
                  type="tel"
                  value={customer.phone}
                  onChange={(phone) => setCustomer((c) => ({ ...c, phone }))}
                />
              </div>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={preparing}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition disabled:opacity-60"
                style={{ backgroundColor: BRAND }}
              >
                {preparing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Préparation du paiement…
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Payer {formatPrice(article.price)}
                  </>
                )}
              </button>
            </>
          ) : (
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret: handoff.clientSecret,
                appearance: checkoutAppearance,
                locale: "fr",
              }}
            >
              <KioskPaymentForm
                draftId={handoff.draftId}
                total={handoff.total}
                caisseCode={article.caisseCode}
              />
            </Elements>
          )}
        </div>
      </div>
    </KioskShell>
  );
}

function KioskPaymentForm({
  draftId,
  total,
  caisseCode,
}: {
  draftId: Id<"publicStripeCheckoutDrafts">;
  total: number;
  caisseCode?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmPayment = useAction(api.stripe.confirmPublicCartPayment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        // Une borne n'a pas de destination de retour : les moyens de paiement
        // qui exigeraient une redirection ne sont pas proposés ici.
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
          "Le paiement est en attente de confirmation. Adressez-vous à l'accueil.",
        );
        return;
      }
      await confirmPayment({ draftId, paymentIntentId: result.paymentIntent.id });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, "Une erreur est survenue pendant le paiement."));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <KioskSuccess caisseCode={caisseCode} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight text-zinc-950">Paiement</h2>
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition disabled:opacity-60"
        style={{ backgroundColor: BRAND }}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Paiement en cours…
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Payer {formatPrice(total)}
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <BadgeCheck className="h-3.5 w-3.5" />
        Paiement chiffré par Stripe · aucune donnée bancaire conservée
      </p>
    </form>
  );
}

/** Écran final : la borne repart d'elle-même vers la vitrine. */
function KioskSuccess({ caisseCode }: { caisseCode?: string }) {
  const navigate = useNavigate();
  return (
    <div className="py-6 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
      <h2 className="mt-4 text-2xl font-extrabold text-zinc-950">
        Merci, c'est payé !
      </h2>
      <p className="mt-2 text-zinc-600">
        Présentez-vous à l'accueil pour retirer votre article
        {caisseCode ? (
          <>
            {" "}
            — il est rangé dans la caisse{" "}
            <span className="font-bold">{caisseCode}</span>
          </>
        ) : null}
        .
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Un email de confirmation vient de vous être envoyé. Retrait sous{" "}
        {PICKUP_DEADLINE_DAYS} jours.
      </p>
      <button
        type="button"
        onClick={() => navigate("/kiosk", { replace: true })}
        className="mt-6 w-full rounded-2xl py-4 text-base font-bold text-white"
        style={{ backgroundColor: BRAND }}
      >
        Retour à la vitrine
      </button>
    </div>
  );
}

function KioskShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf7f3]">
      <div className="mx-auto w-full max-w-[100rem] px-6 py-6">
        <Link
          to="/kiosk"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la vitrine
        </Link>
        {children}
      </div>
    </div>
  );
}

function EmptyMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-8 text-center">
      <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
      <p className="mt-3 text-xl font-bold text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function KioskInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-zinc-200 px-4 text-lg text-zinc-900 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}
