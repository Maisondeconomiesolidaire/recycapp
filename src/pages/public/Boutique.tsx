import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { ArrowRight, Check, Flame, Heart, PackageOpen, ShoppingCart, Sparkles, X } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { HScroll } from "../../components/ui/HScroll";
import {
  ARTICLE_SLUG_TO_CATEGORY,
} from "../../lib/constants";
import { redirectToCentralAuth } from "../../lib/centralAuth";
import { useCart } from "../../lib/useCart";

const BRAND = "#f1104f";
const ORANGE = "#f97316";
const ORANGE_DARK = "#ea6a0c";

function truncateDescription(value: string, max = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/** État partagé des favoris : ids sauvegardés + bascule (avec connexion si besoin). */
function useWishlist() {
  const { isSignedIn } = useUser();
  const ids = useQuery(api.articles.myWishlistIds, isSignedIn ? {} : "skip");
  const toggleMutation = useMutation(api.articles.toggleWishlist);
  const idSet = useMemo(() => new Set((ids ?? []).map(String)), [ids]);

  const toggle = (articleId: string) => {
    if (!isSignedIn) {
      redirectToCentralAuth("sign-in");
      return;
    }
    void toggleMutation({ articleId: articleId as Id<"articles"> });
  };

  return { idSet, toggle, isSignedIn: Boolean(isSignedIn) };
}

export function Boutique() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const activeCategory = slug ? ARTICLE_SLUG_TO_CATEGORY[slug] : undefined;

  const articles = useQuery(api.articles.listPublic, {
    categories: activeCategory ? [activeCategory] : undefined,
  });
  const productOfDay = useQuery(api.articles.getProductOfDay, {});
  const { isSignedIn } = useUser();
  const recommendations = useQuery(
    api.articles.recommendations,
    isSignedIn ? {} : "skip",
  );
  const wishlist = useWishlist();
  // On masque le produit du jour quand on filtre par catégorie ou qu'on recherche.
  const showFeatured = !activeCategory && !search.trim();

  const filteredArticles = useMemo(() => {
    if (!articles) return articles;
    const query = search.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesSearch =
        !query ||
        [article.title, article.description, article.category, article.subcategory]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesSearch;
    });
  }, [articles, search]);

  return (
    <div className="relative bg-transparent">
      <section className="border-b border-black/5">
        <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 sm:py-10 lg:px-8">
          <div className="overflow-hidden rounded-[36px] border border-white/35 bg-white/8 shadow-[0_30px_90px_rgba(24,24,27,0.1)] backdrop-blur-[3px]">
            <img
              src="/hero.png"
              alt="Boutique Recyclerie"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      {showFeatured && productOfDay && (
        <ProductOfDayHero
          product={productOfDay}
          wishlisted={wishlist.idSet.has(String(productOfDay._id))}
          onToggleWishlist={() => wishlist.toggle(productOfDay._id)}
        />
      )}

      {showFeatured && recommendations && recommendations.length > 0 && (
        <RecommendationRow
          articles={recommendations}
          wishlist={wishlist}
        />
      )}

      <section className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
        <div>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Catalogue
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                  {activeCategory ?? "Tous les articles"}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {filteredArticles?.length ?? 0} article
                  {(filteredArticles?.length ?? 0) > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {articles === undefined ? (
              <FullSpinner label="Chargement des articles…" />
            ) : !filteredArticles || filteredArticles.length === 0 ? (
              <div className="rounded-[32px] border border-white/35 bg-white/54 p-6 shadow-[0_18px_45px_rgba(24,24,27,0.08)] backdrop-blur-md">
                <EmptyState
                  icon={<PackageOpen className="h-10 w-10" />}
                  title="Aucun article ne correspond"
                  description="Essayez une autre recherche ou un autre filtre."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article._id}
                    article={article}
                    wishlisted={wishlist.idSet.has(String(article._id))}
                    onToggleWishlist={() => wishlist.toggle(article._id)}
                  />
                ))}
              </div>
            )}
        </div>
      </section>
    </div>
  );
}

function ArticleCard({
  article,
  wishlisted = false,
  onToggleWishlist,
}: {
  article: {
    _id: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    condition: string;
    price: number;
    originalPrice?: number;
    status: string;
    isLot?: boolean;
    bundledArticleIds?: string[];
    imageUrls: string[];
    weightKg?: number;
  };
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
}) {
  const bundleCount = article.bundledArticleIds?.length ?? 0;
  const cart = useCart();
  const navigate = useNavigate();
  const viewerCount = useQuery(api.articles.viewerCount, {
    articleId: article._id as never,
  });
  const inCart = cart.has(article._id);
  const reserved = article.status === "reserve";
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
    <Link
      to={`/boutique/${article._id}`}
      className={`cv-auto group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(24,24,27,0.16)] ${
        article.isLot ? "ring-2 ring-brand-500/20" : ""
      }`}
    >
      {reserved && (
        <div className="absolute inset-x-0 top-0 z-20 bg-amber-500 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.22em] text-white shadow-lg">
          Réservé
        </div>
      )}
      <div className="relative aspect-[1/0.9] overflow-hidden bg-[#f2eee7]">
        {article.imageUrls[0] ? (
          <img
            src={article.imageUrls[0]}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.1] ${
              reserved ? "opacity-45 grayscale-[0.15]" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300">
            <PackageOpen className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm">
              {article.isLot ? "Lot" : article.category}
            </span>
            {article.isLot && bundleCount > 0 ? (
              <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                {bundleCount} articles
              </span>
            ) : null}
          </div>
          {onToggleWishlist && (
            <HeartButton
              active={wishlisted}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
            />
          )}
        </div>
      </div>

      <div className={`flex flex-1 flex-col bg-white p-4 ${reserved ? "opacity-55" : ""}`}>
        {viewerCount ? (
          <p className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#d9480f]">
            <Flame className="h-4 w-4" />
            {viewerCount} {viewerCount > 1 ? "personnes consultent" : "personne consulte"} cet article
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="line-clamp-2 text-base font-semibold leading-5 text-zinc-950">
            {article.title}
          </h3>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">
            {article.isLot ? "Lot" : article.condition}
          </span>
        </div>

        {article.isLot && bundleCount > 0 ? (
          <p className="mt-1.5 text-center text-[11px] font-semibold text-brand-600">
            Lot de {bundleCount} articles
          </p>
        ) : article.subcategory ? (
          <p className="mt-1.5 text-center text-[11px] font-medium text-zinc-500">
            {article.subcategory}
          </p>
        ) : null}

        <p className="mt-2.5 text-[13px] leading-5 text-zinc-600">
          {truncateDescription(article.description)}{" "}
          <span className="font-semibold text-brand-600">Lire plus...</span>
        </p>
        {article.weightKg !== undefined ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Poids : {article.weightKg} kg
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {article.originalPrice && article.originalPrice > article.price ? (
              <>
                <span
                  className="rounded-2xl px-2.5 py-2 text-xl font-extrabold leading-none text-white shadow-[0_12px_28px_rgba(241,16,79,0.22)]"
                  style={{ backgroundColor: BRAND }}
                >
                  {formatPrice(article.price)}
                </span>
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {formatPrice(article.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold" style={{ color: BRAND }}>
                {formatPrice(article.price)}
              </span>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-900">
            Voir
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {!reserved && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!inCart) cart.add(article._id);
              setShowPopup(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-[0_10px_26px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5"
            style={{ backgroundColor: inCart ? ORANGE_DARK : ORANGE }}
          >
            {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {inCart ? "Ajouté au panier" : "Ajouter au panier"}
          </button>
        )}
      </div>
    </Link>

    {/* Add to cart popup */}
    {showPopup && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => setShowPopup(false)}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_rgba(24,24,27,0.24)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Green check banner */}
          <div className="flex items-center gap-2.5 px-5 py-4" style={{ backgroundColor: BRAND }}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            <span className="text-sm font-bold text-white">Article ajouté au panier</span>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="ml-auto rounded-full p-0.5 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Product preview */}
          <div className="flex items-center gap-4 border-b border-zinc-100 p-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]">
              {article.imageUrls[0] && (
                <img
                  src={article.imageUrls[0]}
                  alt={article.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-950">{article.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{article.condition}</p>
              <p className="mt-1.5 text-lg font-extrabold" style={{ color: BRAND }}>
                {formatPrice(article.price)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 p-5">
            <button
              type="button"
              onClick={() => { setShowPopup(false); navigate("/boutique/panier"); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5"
              style={{ backgroundColor: BRAND }}
            >
              Réserver maintenant
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="flex w-full items-center justify-center rounded-2xl border border-zinc-200 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Poursuivre mes achats
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

// ─── Produit du jour & recommandations ────────────────────────────────────────

type ShopArticle = {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition: string;
  price: number;
  originalPrice?: number;
  status: string;
  imageUrls: string[];
};

function HeartButton({
  active,
  onClick,
  className = "",
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Retirer des favoris" : "Sauvegarder l'article"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm backdrop-blur transition hover:scale-105 ${
        active ? "bg-white text-brand-600" : "bg-white/90 text-zinc-500 hover:text-brand-600"
      } ${className}`}
    >
      <Heart className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
    </button>
  );
}

function ProductOfDayHero({
  product,
  wishlisted,
  onToggleWishlist,
}: {
  product: ShopArticle;
  wishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-[92rem] px-5 pt-8 sm:px-7 lg:px-8">
      <style>{`
        @keyframes podFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes podSheen {
          0% { transform: translateX(-120%) skewX(-12deg); }
          60%, 100% { transform: translateX(220%) skewX(-12deg); }
        }
      `}</style>
      <div className="relative overflow-hidden rounded-[36px] border border-brand-500/15 bg-gradient-to-br from-white via-[#fff7ef] to-[#ffe9d6] shadow-[0_36px_110px_rgba(241,16,79,0.16)]">
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative grid items-stretch md:grid-cols-2">
          <Link
            to={`/boutique/${product._id}`}
            className="group relative block aspect-[4/3] overflow-hidden bg-[#f2eee7] md:aspect-auto md:min-h-[460px]"
          >
            {product.imageUrls[0] ? (
              <img
                src={product.imageUrls[0]}
                alt={product.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-300">
                <PackageOpen className="h-16 w-16" />
              </div>
            )}
            {/* reflet animé */}
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animation: "podSheen 4.5s ease-in-out infinite" }} />
            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(241,16,79,0.4)]" style={{ animation: "podFloat 3.5s ease-in-out infinite" }}>
              Produit du jour
            </span>
            <HeartButton
              active={wishlisted}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              className="absolute right-5 top-5 h-11 w-11"
            />
          </Link>

          <div className="relative flex flex-col justify-center gap-5 p-8 sm:p-12 lg:p-14">
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {product.title}
            </h2>
            <p className="max-w-prose text-base leading-7 text-zinc-600 sm:text-lg">
              {truncateDescription(product.description, 240)}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {product.originalPrice && product.originalPrice > product.price ? (
                <>
                  <span className="text-5xl font-black tracking-tight sm:text-6xl" style={{ color: BRAND }}>
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xl font-semibold text-zinc-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </>
              ) : (
                <span className="text-5xl font-black tracking-tight sm:text-6xl" style={{ color: BRAND }}>
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 shadow-sm ring-1 ring-black/5">
                {product.condition}
              </span>
            </div>
            <Link
              to={`/boutique/${product._id}`}
              className="inline-flex w-fit items-center gap-2.5 rounded-full px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(241,16,79,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(241,16,79,0.42)]"
              style={{ backgroundColor: BRAND }}
            >
              Découvrir l'article
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecommendationRow({
  articles,
  wishlist,
}: {
  articles: ShopArticle[];
  wishlist: { idSet: Set<string>; toggle: (id: string) => void };
}) {
  return (
    <section className="mx-auto w-full max-w-[92rem] px-5 pt-8 sm:px-7 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h2 className="text-xl font-bold tracking-tight text-zinc-950">
          Produits susceptibles de vous intéresser
        </h2>
      </div>
      <HScroll contentClassName="px-1">
        {articles.map((a) => (
          <Link
            key={a._id}
            to={`/boutique/${a._id}`}
            className="group relative flex w-[210px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition-shadow hover:shadow-[0_24px_56px_rgba(24,24,27,0.16)]"
          >
            <div className="relative aspect-square overflow-hidden bg-[#f2eee7]">
              {a.imageUrls[0] ? (
                <img
                  src={a.imageUrls[0]}
                  alt={a.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-300">
                  <PackageOpen className="h-10 w-10" />
                </div>
              )}
              <HeartButton
                active={wishlist.idSet.has(String(a._id))}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  wishlist.toggle(a._id);
                }}
                className="absolute right-2.5 top-2.5"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-950">
                {a.title}
              </h3>
              <span className="mt-auto text-base font-bold" style={{ color: BRAND }}>
                {formatPrice(a.price)}
              </span>
            </div>
          </Link>
        ))}
      </HScroll>
    </section>
  );
}
