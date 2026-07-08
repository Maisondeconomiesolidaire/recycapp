import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Eye,
  Heart,
  PackageOpen,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Lightbox } from "../../components/ui/Lightbox";
import { EmptyState } from "../../components/ui/EmptyState";
import { redirectToCentralAuth } from "../../lib/centralAuth";
import { useCart } from "../../lib/useCart";

function createViewSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `view_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const article = useQuery(api.articles.getPublic, {
    id: id as Id<"articles">,
  });
  const cart = useCart();
  const navigate = useNavigate();
  const viewerCount = useQuery(
    api.articles.viewerCount,
    id ? { articleId: id as Id<"articles"> } : "skip",
  );
  const heartbeatView = useMutation(api.articles.heartbeatView);
  const leaveView = useMutation(api.articles.leaveView);
  const { isSignedIn } = useUser();
  const wishlistIds = useQuery(api.articles.myWishlistIds, isSignedIn ? {} : "skip");
  const toggleWishlist = useMutation(api.articles.toggleWishlist);
  const wishlisted = Boolean(wishlistIds?.some((wid) => String(wid) === id));
  function handleToggleWishlist() {
    if (!isSignedIn) {
      redirectToCentralAuth("sign-in");
      return;
    }
    if (id) void toggleWishlist({ articleId: id as Id<"articles"> });
  }
  const [activeImage, setActiveImage] = useState(0);
  const [selectedBundledId, setSelectedBundledId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const storageKey = "recycapp_article_view_session";
    let sessionId = window.sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = createViewSessionId();
      window.sessionStorage.setItem(storageKey, sessionId);
    }

    const articleId = id as Id<"articles">;
    const pulse = () =>
      heartbeatView({
        articleId,
        sessionId,
      }).catch(() => null);

    void pulse();
    const interval = window.setInterval(() => {
      void pulse();
    }, 15_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void pulse();
      }
    };
    const onPageShow = () => {
      void pulse();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      void leaveView({ articleId, sessionId }).catch(() => null);
    };
  }, [heartbeatView, id, leaveView]);

  if (article === undefined) return <FullSpinner label="Chargement…" />;
  if (article === null) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-5 py-16 sm:px-7 lg:px-8">
        <EmptyState
          icon={<PackageOpen className="h-10 w-10" />}
          title="Article introuvable"
          action={
            <Link to="/boutique" className="font-medium text-brand-600">
              Retour à la boutique
            </Link>
          }
        />
      </div>
    );
  }

  const currentArticle = article as NonNullable<typeof article> & {
    bundledArticles?: Array<{
      _id: string;
      title: string;
      price: number;
      condition: string;
      imageUrls: string[];
      category: string;
      subcategory?: string;
    }>;
    similarArticles?: Array<{
      _id: string;
      title: string;
      price: number;
      condition: string;
      imageUrls: string[];
      category: string;
      subcategory?: string;
    }>;
  };
  const available = currentArticle.status === "disponible";
  const bundledArticles = currentArticle.bundledArticles ?? [];
  const similarArticles = currentArticle.similarArticles ?? [];
  const selectedBundledArticle =
    bundledArticles.find((item) => item._id === selectedBundledId) ?? null;
  const displayImage =
    selectedBundledArticle?.imageUrls[0] ?? currentArticle.imageUrls[activeImage];
  const inCart = cart.has(currentArticle._id);

  function reserveNow() {
    if (!inCart) cart.add(currentArticle._id);
    navigate("/boutique/panier");
  }

  return (
    <div className="bg-[#f6f4ef]">
      <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 sm:py-10 lg:px-8">
        <Link
          to="/boutique"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la boutique
        </Link>

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
                    alt={selectedBundledArticle?.title ?? currentArticle.title}
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
                images={selectedBundledArticle?.imageUrls ?? currentArticle.imageUrls}
                startIndex={selectedBundledArticle ? 0 : activeImage}
                onClose={() => setLightboxOpen(false)}
              />
            )}

            {currentArticle.imageUrls.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {currentArticle.imageUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setSelectedBundledId(null);
                      setActiveImage(index);
                    }}
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
                  {currentArticle.isLot ? "Lot" : currentArticle.category}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {currentArticle.condition}
                </span>
                {!available && (
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Réservé
                  </span>
                )}
                {(viewerCount ?? 0) > 1 && (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    <Eye className="h-3.5 w-3.5" />
                    {(viewerCount ?? 1) - 1}{" "}
                    {(viewerCount ?? 1) - 1 > 1 ? "personnes regardent" : "personne regarde"}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  {currentArticle.title}
                </h1>
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  aria-label={wishlisted ? "Retirer des favoris" : "Sauvegarder l'article"}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 ${
                    wishlisted
                      ? "border-brand-200 bg-brand-50 text-brand-600"
                      : "border-zinc-200 bg-white text-zinc-400 hover:text-brand-600"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${wishlisted ? "fill-current" : ""}`} />
                </button>
              </div>
              {currentArticle.isLot && bundledArticles.length > 0 && (
                <p className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                  Lot de {bundledArticles.length} articles
                </p>
              )}
              {currentArticle.weightKg !== undefined && (
                <p className="mt-3 text-sm font-medium text-zinc-500">
                  Poids : {currentArticle.weightKg} kg
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {currentArticle.originalPrice && currentArticle.originalPrice > currentArticle.price ? (
                  <>
                    <span className="rounded-2xl bg-brand-500 px-4 py-3 text-3xl font-extrabold leading-none text-white shadow-[0_16px_34px_rgba(255,119,0,0.24)] sm:text-4xl">
                      {formatPrice(currentArticle.price)}
                    </span>
                    <span className="text-xl font-semibold text-zinc-400 line-through sm:text-2xl">
                      {formatPrice(currentArticle.originalPrice)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Bonne affaire
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-brand-600 sm:text-4xl">
                    {formatPrice(currentArticle.price)}
                  </span>
                )}
              </div>

              <p className="mt-6 whitespace-pre-line text-base leading-8 text-zinc-600">
                {currentArticle.description}
              </p>

              {currentArticle.isLot && bundledArticles.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                    Articles inclus dans le lot
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cliquez sur un article pour le visualiser dans la photo principale.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {bundledArticles.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedBundledId(item._id)}
                        className={`flex items-center gap-3 rounded-2xl border bg-white/80 p-2.5 text-left shadow-sm transition hover:border-brand-300 hover:bg-white ${
                          selectedBundledId === item._id
                            ? "border-brand-500 ring-2 ring-brand-500/15"
                            : "border-black/5"
                        }`}
                      >
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f2eee7]">
                          {item.imageUrls[0] ? (
                            <img
                              src={item.imageUrls[0]}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-zinc-300">
                              <PackageOpen className="h-5 w-5" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-semibold text-zinc-950">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {item.condition} · {formatPrice(item.price)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="p-1">
                  <ShieldCheck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Sélection contrôlée</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Objet choisi et préparé par l’équipe.</p>
                </div>
                <div className="p-1">
                  <Truck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Retrait accompagné</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Nous vous recontactons pour organiser le retrait.</p>
                </div>
                <div className="p-1">
                  <BadgeCheck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Réservation simple</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Laissez vos coordonnées, nous faisons le reste.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_22px_60px_rgba(24,24,27,0.08)]">
              {available ? (
                <>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                    Réserver cet article
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Ajoutez l’article à votre panier puis finalisez votre réservation. Un compte
                    est nécessaire pour réserver.
                  </p>
                  <button
                    type="button"
                    onClick={() => cart.add(currentArticle._id)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition hover:bg-orange-600"
                  >
                    {inCart ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    {inCart ? "Ajouté au panier" : "Ajouter au panier"}
                  </button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={reserveNow}
                    className="mt-3 w-full rounded-2xl"
                  >
                    Réserver maintenant
                  </Button>
                  <p className="mt-3 text-center text-xs text-zinc-400">
                    Article mis de côté 48 h après la réservation.
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3 text-zinc-600">
                  <Check className="h-5 w-5 text-amber-500" />
                  <p className="font-medium">
                    Cet article est actuellement réservé par un autre client.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {similarArticles.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Sélection liée
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                  Articles similaires
                </h2>
              </div>
              <Link
                to="/boutique"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Voir la boutique
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {similarArticles.map((item) => (
                <Link
                  key={item._id}
                  to={`/boutique/${item._id}`}
                  className="group overflow-hidden rounded-[24px] bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(24,24,27,0.14)]"
                >
                  <div className="aspect-square bg-[#f2eee7]">
                    {item.imageUrls[0] ? (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300">
                        <PackageOpen className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.condition}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-brand-600">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
