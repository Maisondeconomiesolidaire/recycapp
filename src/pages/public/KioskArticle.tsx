import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Loader2, PackageOpen, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { Lightbox } from "../../components/ui/Lightbox";
import { formatPrice } from "../../lib/format";
import { PRICE_BG, PRICE_SHADOW } from "../../lib/publicColors";
import { QrCode } from "../../components/ui/QrCode";
import {
  KIOSK_SCAN_LABEL,
  purchaseUrl,
} from "../../components/public/ArticleCard";

/**
 * Fiche article en vitrine.
 *
 * Reprend la fiche de la boutique en ligne — galerie, badges, prix,
 * description — en remplaçant les actions d'achat par l'invitation à appeler
 * un membre de l'équipe : sur place, la vente se conclut au comptoir.
 */
export function KioskArticle() {
  const { id } = useParams<{ id: string }>();
  const articleId = id as Id<"articles"> | undefined;
  const article = useQuery(
    api.articles.getPublic,
    articleId ? { id: articleId } : "skip",
  );
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Le lecteur est entre les mains de l'équipe : l'écran suit l'encaissement
  // en direct pour que le client sache où il en est.
  const payment = useQuery(
    api.terminal.kioskPaymentStatus,
    articleId ? { articleId } : "skip",
  );

  if (!articleId) return <KioskShell><NotFound /></KioskShell>;
  if (article === undefined) return <FullSpinner label="Chargement de l'article…" />;
  if (article === null) return <KioskShell><NotFound /></KioskShell>;

  const available = article.status === "disponible";
  const displayImage = article.imageUrls[activeImage] ?? article.imageUrls[0];
  const hasDiscount =
    article.originalPrice !== undefined && article.originalPrice > article.price;

  if (payment && payment.status !== "en_cours") {
    return <PaymentOutcome articleId={articleId} payment={payment} />;
  }

  return (
    <KioskShell>
      {payment?.status === "en_cours" ? (
        <div className="mb-6 flex items-center gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-4">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-700" />
          <p className="text-lg font-semibold text-amber-900">
            Paiement en cours sur le terminal…
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section>
          <div className="relative overflow-hidden rounded-[24px] bg-[#f2eee7]">
            {displayImage ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block w-full cursor-zoom-in"
                aria-label="Agrandir la photo"
              >
                <img
                  src={displayImage}
                  alt={article.title}
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-zinc-300">
                <PackageOpen className="h-16 w-16" />
              </div>
            )}
          </div>

          {lightboxOpen && (
            <Lightbox
              images={article.imageUrls}
              startIndex={activeImage}
              onClose={() => setLightboxOpen(false)}
            />
          )}

          {article.imageUrls.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {article.imageUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-2xl border-2 bg-white transition ${
                    index === activeImage
                      ? "border-brand-500 shadow-[0_10px_28px_rgba(255,119,0,0.18)]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {article.isLot ? "Lot" : article.category}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {article.condition}
              </span>
              {article.caisseCode && (
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                  {article.caisseCode}
                </span>
              )}
              {!available && (
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  Réservé
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              {article.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {hasDiscount ? (
                <>
                  <span className="rounded-2xl px-4 py-3 text-3xl font-extrabold leading-none text-white sm:text-4xl"
                      style={{ backgroundColor: PRICE_BG, boxShadow: PRICE_SHADOW }}>
                    {formatPrice(article.price)}
                  </span>
                  <span className="text-xl font-semibold text-zinc-400 line-through sm:text-2xl">
                    {formatPrice(article.originalPrice!)}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    Bonne affaire
                  </span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-brand-600 sm:text-4xl">
                  {formatPrice(article.price)}
                </span>
              )}
            </div>
          </div>

          {/* Le client achète depuis SON téléphone : il scanne, il paie. */}
          {available && (
            <div className="flex items-center gap-5 rounded-[28px] border border-brand-200 bg-white p-6 shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
              <span className="shrink-0 rounded-2xl bg-white p-2 text-black ring-1 ring-zinc-200">
                <QrCode value={purchaseUrl(article._id)} size={140} />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-7 text-zinc-950">
                  {KIOSK_SCAN_LABEL}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Ouvrez l'appareil photo de votre téléphone et visez le code :
                  le paiement se fait en ligne, le retrait à l'accueil.
                </p>
              </div>
            </div>
          )}

          {article.description && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Description
              </h2>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-zinc-700">
                {article.description}
              </p>
            </div>
          )}
        </section>
      </div>
    </KioskShell>
  );
}

function KioskShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Même fond animé que la fiche article de la boutique, voilé pour que
          le texte reste lisible par-dessus. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video autoPlay muted loop playsInline className="h-full w-full object-cover">
          <source src="/Beautiful%20Wallpaper%20Video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,244,239,0.48)_0%,rgba(246,244,239,0.64)_16%,rgba(246,244,239,0.78)_34%,rgba(246,244,239,0.88)_100%)]" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 sm:py-10 lg:px-8">
        <Link
          to="/kiosk"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la vitrine
        </Link>
        {children}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="rounded-[32px] border border-white/35 bg-white/70 p-12 text-center">
      <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
      <p className="mt-3 text-xl font-bold text-zinc-900">Article introuvable</p>
      <p className="mt-1 text-sm text-zinc-500">
        Il a peut-être été vendu. Revenez à la vitrine pour en choisir un autre.
      </p>
    </div>
  );
}

/**
 * Résultat de l'encaissement, en plein écran.
 *
 * Le client vient de présenter sa carte : il doit lire le verdict sans avoir à
 * le demander, et savoir quoi faire ensuite.
 */
function PaymentOutcome({
  articleId,
  payment,
}: {
  articleId: Id<"articles">;
  payment: { status: string; message: string | null };
}) {
  const navigate = useNavigate();
  const clear = useMutation(api.terminal.clearKioskPayment);
  const paid = payment.status === "payee";

  async function dismiss(destination: string) {
    // La trace est effacée avant de partir : sans quoi le client suivant
    // tomberait sur le verdict du précédent.
    await clear({ articleId }).catch(() => undefined);
    navigate(destination);
  }

  return (
    <KioskShell>
      <div className="mx-auto flex max-w-2xl flex-col items-center py-20 text-center">
        <span
          className={`flex h-24 w-24 items-center justify-center rounded-full ${
            paid ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          {paid ? (
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          ) : (
            <XCircle className="h-14 w-14 text-red-600" />
          )}
        </span>

        <h1 className="mt-8 text-4xl font-black tracking-tight text-zinc-950">
          {paid ? "Paiement effectué avec succès" : "Paiement refusé"}
        </h1>
        <p className="mt-4 text-xl text-zinc-600">
          {paid
            ? "Merci de votre achat. Un reçu vous a été envoyé par email."
            : payment.message || "La carte a été refusée par le terminal."}
        </p>

        <div className="mt-10 w-full max-w-sm">
          {paid ? (
            <button
              type="button"
              onClick={() => void dismiss("/kiosk")}
              className="w-full rounded-2xl px-6 py-5 text-xl font-bold text-white"
              style={{ background: PRICE_BG }}
            >
              Retour à l'accueil
            </button>
          ) : (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => void dismiss(`/kiosk/${articleId}`)}
                className="w-full rounded-2xl px-6 py-5 text-xl font-bold text-white"
                style={{ background: PRICE_BG }}
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={() => void dismiss("/kiosk")}
                className="w-full rounded-2xl border border-zinc-300 px-6 py-4 text-lg font-semibold text-zinc-700"
              >
                Retour à l'accueil
              </button>
            </div>
          )}
        </div>
      </div>
    </KioskShell>
  );
}
