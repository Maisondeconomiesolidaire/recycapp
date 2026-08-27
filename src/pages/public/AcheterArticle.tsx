import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, PackageOpen, UserRound } from "lucide-react";
import { errorMessage } from "../../lib/convexError";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { BRAND, PICKUP_DEADLINE_DAYS } from "./checkoutTheme";

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
    <ArticleSheet articleId={articleId} />
  );
}

/**
 * Fiche de l'article scanné en vitrine.
 *
 * L'encaissement ne se fait plus ici : le paiement passe par la caisse de
 * l'accueil, où l'équipe scanne le même QR code depuis la tablette et présente
 * le terminal au client. Cette page reste utile — elle confirme au visiteur
 * qu'il a bien scanné le bon objet, et affiche son prix.
 */
function ArticleSheet({ articleId }: { articleId: Id<"articles"> }) {
  const article = useQuery(api.kiosk.articleForPurchase, { articleId });

  if (article === undefined) return <FullSpinner label="Chargement de l'article…" />;
  if (article === null) return <Shell><NotFound /></Shell>;

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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{article.title}</h1>
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
        <div className="mt-6 rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: BRAND }}
          >
            <UserRound className="h-6 w-6" />
          </span>
          <p className="mt-4 text-lg font-bold text-zinc-950">Pour l'acheter, rendez-vous à l'accueil</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Un membre de l'équipe scanne ce même QR code depuis la caisse et vous présente le
            terminal de paiement. Réglez par carte, sans contact ou avec votre code.
          </p>
        </div>
      )}
    </Shell>
  );
}

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

