import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { Field, Input } from "../../components/ui/Field";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { formatPrice } from "../../lib/format";
import { getStripe, stripeEnabled } from "../../lib/stripe";
import { checkoutAppearance, BRAND, PICKUP_DEADLINE_DAYS } from "./checkoutTheme";

type Contact = { firstName: string; lastName: string; email: string; phone: string };

/**
 * Page publique d'un lien de paiement envoyé depuis le CRM. Même habillage que
 * le checkout de la boutique : le client règle sa commande sans compte et sans
 * repasser par le panier.
 */
export function PaymentLinkPage() {
  const { token = "" } = useParams();
  const [searchParams] = useSearchParams();
  const link = useQuery(api.paymentLinks.getPublic, { token });

  const returnedPaymentIntent = searchParams.get("payment_intent");

  if (link === undefined) return <FullSpinner label="Chargement de votre commande…" />;

  if (link === null) {
    return (
      <Centered title="Lien introuvable">
        Ce lien de paiement n'existe pas ou a été supprimé. Contactez la
        recyclerie pour en obtenir un nouveau.
      </Centered>
    );
  }

  if (link.status === "paid") {
    return (
      <Centered title="Commande déjà réglée" icon="success">
        Cette commande a bien été payée. Vous avez {PICKUP_DEADLINE_DAYS} jours à
        compter du paiement pour retirer votre article en boutique.
      </Centered>
    );
  }

  if (link.status === "cancelled") {
    return (
      <Centered title="Lien annulé">
        Ce lien de paiement a été annulé par la recyclerie.
      </Centered>
    );
  }

  if (!stripeEnabled) {
    return (
      <Centered title="Paiement indisponible">
        Le paiement en ligne est momentanément indisponible. Contactez la
        recyclerie pour régler votre commande.
      </Centered>
    );
  }

  return (
    <PaymentLinkForm
      token={token}
      link={link}
      resumedPaymentIntent={returnedPaymentIntent}
    />
  );
}

type PublicLink = NonNullable<
  ReturnType<typeof useQuery<typeof api.paymentLinks.getPublic>>
>;

function PaymentLinkForm({
  token,
  link,
  resumedPaymentIntent,
}: {
  token: string;
  link: PublicLink;
  resumedPaymentIntent: string | null;
}) {
  const createIntent = useAction(api.stripe.createPaymentIntentForLink);
  const confirmLink = useAction(api.stripe.confirmPaymentLink);
  const navigate = useNavigate();

  const knownCustomer = Boolean(link.customerEmail);
  const [contact, setContact] = useState<Contact>({
    firstName: link.customerFirstName ?? "",
    lastName: "",
    email: link.customerEmail ?? "",
    phone: "",
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Retour d'une authentification 3-D Secure.
  const [resuming, setResuming] = useState(Boolean(resumedPaymentIntent));
  useMemo(() => {
    if (!resumedPaymentIntent) return;
    void (async () => {
      try {
        await confirmLink({ token, paymentIntentId: resumedPaymentIntent });
        navigate("/merci?type=achat", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Confirmation impossible.");
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumedPaymentIntent]);

  async function start() {
    if (!knownCustomer) {
      if (!contact.firstName.trim() || !contact.lastName.trim()) {
        setError("Renseignez votre nom et votre prénom.");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
        setError("Renseignez une adresse email valide.");
        return;
      }
    }
    setStarting(true);
    setError("");
    try {
      const intent = await createIntent({
        token,
        customer: knownCustomer ? undefined : contact,
      });
      setClientSecret(intent.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paiement indisponible.");
    } finally {
      setStarting(false);
    }
  }

  if (resuming) return <FullSpinner label="Confirmation de votre paiement…" />;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_440px] lg:items-start">
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
                {link.customerFirstName
                  ? `Bonjour ${link.customerFirstName}, réglez votre commande`
                  : "Régler ma commande"}
              </h1>
            </div>
          </div>

          {clientSecret ? (
            <Elements
              stripe={getStripe()}
              options={{ clientSecret, appearance: checkoutAppearance, locale: "fr" }}
            >
              <LinkPaymentForm
                token={token}
                amount={link.amount}
                customer={knownCustomer ? undefined : contact}
              />
            </Elements>
          ) : (
            <div className="space-y-6">
              {!knownCustomer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Prénom" required>
                      <Input
                        value={contact.firstName}
                        onChange={(e) =>
                          setContact({ ...contact, firstName: e.target.value })
                        }
                        placeholder="Marie"
                      />
                    </Field>
                    <Field label="Nom" required>
                      <Input
                        value={contact.lastName}
                        onChange={(e) =>
                          setContact({ ...contact, lastName: e.target.value })
                        }
                        placeholder="Dupont"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Email" required>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          setContact({ ...contact, email: e.target.value })
                        }
                        placeholder="marie@email.fr"
                      />
                    </Field>
                    <Field label="Téléphone">
                      <PhoneInput
                        value={contact.phone}
                        onChange={(e) =>
                          setContact({ ...contact, phone: e.target.value })
                        }
                        placeholder="06 12 34 56 78"
                      />
                    </Field>
                  </div>
                </div>
              )}

              <PickupNotice />

              {error && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={start}
                disabled={starting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5 disabled:opacity-60"
                style={{ backgroundColor: BRAND }}
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Payer {formatPrice(link.amount)}
              </button>
            </div>
          )}
        </div>

        <OrderSummary articles={link.articles} amount={link.amount} />
      </div>
    </div>
  );
}

function LinkPaymentForm({
  token,
  amount,
  customer,
}: {
  token: string;
  amount: number;
  customer?: Contact;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmLink = useAction(api.stripe.confirmPaymentLink);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/paiement/${token}` },
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
      await confirmLink({
        token,
        paymentIntentId: result.paymentIntent.id,
        customer,
      });
      navigate("/merci?type=achat", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: "tabs" }} />
      <PickupNotice />
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ backgroundColor: BRAND }}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Payer {formatPrice(amount)}
      </button>
      <TrustRow />
    </form>
  );
}

export function PickupNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-sm leading-6 text-amber-900">
        <strong>
          Vous avez {PICKUP_DEADLINE_DAYS} jours pour venir retirer votre article
          en boutique.
        </strong>{" "}
        Passé ce délai, votre commande est remboursée et l'article remis en vente.
      </p>
    </div>
  );
}

export function TrustRow() {
  return (
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
  );
}

function OrderSummary({
  articles,
  amount,
}: {
  articles: PublicLink["articles"];
  amount: number;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(24,24,27,0.1)]">
        <h2 className="text-lg font-bold tracking-tight text-zinc-950">
          Votre commande
        </h2>
        <div className="mt-5 space-y-3">
          {articles.map((article) => (
            <div key={article.id} className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
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
                {article.title}
              </p>
              <span className="shrink-0 text-sm font-bold text-zinc-950">
                {formatPrice(article.price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-between rounded-[22px] px-6 py-5 text-white shadow-[0_12px_40px_rgba(241,16,79,0.28)]"
        style={{ backgroundColor: BRAND }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Total à payer
        </p>
        <span className="text-3xl font-extrabold">{formatPrice(amount)}</span>
      </div>
    </div>
  );
}

function Centered({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: "success";
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-20">
      <div className="rounded-[28px] bg-white p-9 text-center shadow-[0_24px_70px_rgba(24,24,27,0.1)]">
        {icon === "success" && (
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{children}</p>
        <Link
          to="/boutique"
          className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: BRAND }}
        >
          Voir la boutique
        </Link>
      </div>
    </div>
  );
}
