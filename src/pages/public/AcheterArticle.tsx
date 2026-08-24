import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAction, useConvex, useQuery } from "convex/react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  PackageOpen,
  UserRound,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { errorMessage } from "../../lib/convexError";
import { BRAND, PICKUP_DEADLINE_DAYS } from "./checkoutTheme";

type Mode = "choice" | "existing" | "new";

/**
 * Achat d'un article scanné en vitrine, sur le téléphone du client.
 *
 * Volontairement sans compte : devant une vitrine, un écran de connexion fait
 * abandonner. On demande le strict nécessaire — un client déjà connu n'a que
 * son adresse à donner, ses coordonnées sont reprises côté serveur — puis
 * Stripe encaisse. Le compte, lui, est créé après le paiement.
 */
export function AcheterArticle() {
  const { id } = useParams<{ id: string }>();
  const articleId = id as Id<"articles"> | undefined;
  const [searchParams] = useSearchParams();

  const status = searchParams.get("status");
  const draftId = searchParams.get("draft_id");
  const sessionId = searchParams.get("session_id");

  // Retour de Stripe : la commande se conclut ici, quel que soit l'article.
  if (status === "success" && draftId && sessionId) {
    return (
      <CheckoutReturn
        draftId={draftId as Id<"publicStripeCheckoutDrafts">}
        sessionId={sessionId}
      />
    );
  }

  if (!articleId) return <Shell><NotFound /></Shell>;
  return (
    <PurchaseForm
      articleId={articleId}
      cancelled={status === "cancelled"}
    />
  );
}

function PurchaseForm({
  articleId,
  cancelled,
}: {
  articleId: Id<"articles">;
  cancelled: boolean;
}) {
  const article = useQuery(api.kiosk.articleForPurchase, { articleId });
  const startCheckout = useAction(api.kiosk.startCheckout);
  const convex = useConvex();

  const [mode, setMode] = useState<Mode>("choice");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (article === undefined) return <FullSpinner label="Chargement de l'article…" />;
  if (article === null) return <Shell><NotFound /></Shell>;

  /** Client existant : on ne demande que l'adresse, le reste est déjà connu. */
  async function handleExisting() {
    if (checking) return;
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Indiquez une adresse email valide.");
      return;
    }
    setChecking(true);
    try {
      const result = await convex.query(api.kiosk.isKnownCustomer, {
        email: email.trim(),
      });
      if (!result.known) {
        setError(
          "Cette adresse ne correspond à aucun achat précédent. Choisissez « Je suis un nouveau client ».",
        );
        return;
      }
      await pay();
    } catch (err) {
      setError(errorMessage(err, "Vérification impossible."));
    } finally {
      setChecking(false);
    }
  }

  async function handleNew() {
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Indiquez votre prénom et votre nom.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Indiquez une adresse email valide.");
      return;
    }
    await pay();
  }

  async function pay() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const returnUrl = `${window.location.origin}/acheter/${articleId}`;
      const { checkoutUrl } = await startCheckout({
        articleId,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        returnUrl,
      });
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(errorMessage(err, "Impossible d'ouvrir le paiement."));
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt={article.title}
            className="h-52 w-full bg-[#f2eee7] object-contain"
          />
        ) : (
          <div className="flex h-52 items-center justify-center bg-[#f2eee7] text-zinc-300">
            <PackageOpen className="h-14 w-14" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {article.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {article.category} · {article.condition}
          </p>
          <p className="mt-3 text-3xl font-extrabold" style={{ color: BRAND }}>
            {formatPrice(article.price)}
          </p>
        </div>
      </div>

      {!article.available ? (
        <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-bold text-amber-900">Cet article n'est plus disponible</p>
          <p className="mt-1 text-sm text-amber-800">
            Il vient d'être réservé ou vendu. Demandez à un membre de l'équipe.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
          {cancelled && (
            <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Paiement annulé. Aucun montant n'a été débité.
            </p>
          )}

          {mode === "choice" && (
            <>
              <h2 className="text-lg font-bold text-zinc-950">
                Pour finaliser votre achat
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Quelques informations, puis le paiement sécurisé.
              </p>
              <div className="mt-5 space-y-3">
                <ChoiceButton
                  label="Je suis déjà client"
                  hint="Votre adresse email suffit"
                  onClick={() => setMode("existing")}
                />
                <ChoiceButton
                  label="Je suis un nouveau client"
                  hint="Prénom, nom et email"
                  onClick={() => setMode("new")}
                />
              </div>
            </>
          )}

          {mode === "existing" && (
            <>
              <h2 className="text-lg font-bold text-zinc-950">Votre adresse email</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Celle utilisée lors de vos achats précédents.
              </p>
              <Input label="Email" type="email" value={email} onChange={setEmail} autoFocus />
              {error && <ErrorText>{error}</ErrorText>}
              <PayButton
                busy={checking || submitting}
                label={`Payer ${formatPrice(article.price)}`}
                onClick={handleExisting}
              />
              <BackButton onClick={() => { setMode("choice"); setError(""); }} />
            </>
          )}

          {mode === "new" && (
            <>
              <h2 className="text-lg font-bold text-zinc-950">Vos coordonnées</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pour votre reçu et le retrait de votre article.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" value={firstName} onChange={setFirstName} autoFocus />
                <Input label="Nom" value={lastName} onChange={setLastName} />
              </div>
              <Input label="Email" type="email" value={email} onChange={setEmail} />
              <Input
                label="Téléphone (facultatif)"
                type="tel"
                value={phone}
                onChange={setPhone}
              />
              {error && <ErrorText>{error}</ErrorText>}
              <PayButton
                busy={submitting}
                label={`Payer ${formatPrice(article.price)}`}
                onClick={handleNew}
              />
              <BackButton onClick={() => { setMode("choice"); setError(""); }} />
            </>
          )}

          <p className="mt-4 text-center text-xs text-zinc-400">
            Retrait en boutique sous {PICKUP_DEADLINE_DAYS} jours.
          </p>
        </div>
      )}
    </Shell>
  );
}

/** Retour de Stripe : la commande est enregistrée puis confirmée à l'écran. */
function CheckoutReturn({
  draftId,
  sessionId,
}: {
  draftId: Id<"publicStripeCheckoutDrafts">;
  sessionId: string;
}) {
  const confirmCheckout = useAction(api.kiosk.confirmCheckout);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void confirmCheckout({ draftId, sessionId })
      .then(() => {
        if (!cancelled) setDone(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Confirmation impossible."));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, sessionId]);

  if (error) {
    return (
      <Shell>
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-lg font-bold text-amber-900">
            Votre commande n'a pas pu être finalisée
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">{error}</p>
          <p className="mt-3 text-sm text-amber-800">
            Présentez cet écran à un membre de l'équipe.
          </p>
        </div>
      </Shell>
    );
  }

  if (!done) return <FullSpinner label="Confirmation de votre paiement…" />;

  return (
    <Shell>
      <div className="rounded-[28px] border border-emerald-200 bg-white p-8 text-center shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-950">
          Merci, c'est payé !
        </h1>
        <p className="mt-2 text-zinc-600">
          Présentez-vous à l'accueil pour retirer votre article.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Un email de confirmation vient de vous être envoyé. Retrait sous{" "}
          {PICKUP_DEADLINE_DAYS} jours.
        </p>
      </div>
    </Shell>
  );
}

/* ─── Habillage ──────────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f4ef] px-4 py-8">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-10 text-center">
      <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
      <p className="mt-3 text-xl font-bold text-zinc-900">Article introuvable</p>
      <p className="mt-1 text-sm text-zinc-500">
        Il a peut-être été vendu. Demandez à un membre de l'équipe.
      </p>
    </div>
  );
}

function ChoiceButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200 px-5 py-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <UserRound className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-zinc-950">{label}</span>
        <span className="block text-sm text-zinc-500">{hint}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-zinc-400" />
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-zinc-200 px-4 text-base text-zinc-900 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </p>
  );
}

function PayButton({
  busy,
  label,
  onClick,
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition disabled:opacity-60"
      style={{ backgroundColor: BRAND }}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
    >
      Retour
    </button>
  );
}
