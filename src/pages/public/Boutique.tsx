import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowRight, Check, PackageOpen, ShoppingCart, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  ARTICLE_SLUG_TO_CATEGORY,
} from "../../lib/constants";
import { useCart } from "../../lib/useCart";

const BRAND = "#f1104f";
const BRAND_DARK = "#c90d40";

function truncateDescription(value: string, max = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function Boutique() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const activeCategory = slug ? ARTICLE_SLUG_TO_CATEGORY[slug] : undefined;

  const articles = useQuery(api.articles.listPublic, {
    categories: activeCategory ? [activeCategory] : undefined,
  });

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
                  <ArticleCard key={article._id} article={article} />
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
  };
}) {
  const bundleCount = article.bundledArticleIds?.length ?? 0;
  const cart = useCart();
  const navigate = useNavigate();
  const inCart = cart.has(article._id);
  const reserved = article.status === "reserve";
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
    <Link
      to={`/boutique/${article._id}`}
      className={`group relative overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(24,24,27,0.16)] ${
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
          <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm">
            {article.isLot ? "Lot" : article.category}
          </span>
          {article.isLot && bundleCount > 0 ? (
            <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
              {bundleCount} articles
            </span>
          ) : null}
        </div>
      </div>

      <div className={`bg-white p-4 ${reserved ? "opacity-55" : ""}`}>
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

        <div className="mt-4 flex items-end justify-between gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {article.originalPrice && article.originalPrice > article.price ? (
              <>
                <span className="rounded-2xl bg-brand-500 px-2.5 py-2 text-xl font-extrabold leading-none text-white shadow-[0_12px_28px_rgba(255,119,0,0.22)]">
                  {formatPrice(article.price)}
                </span>
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {formatPrice(article.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-zinc-950">
                {formatPrice(article.price)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!reserved && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!inCart) {
                    cart.add(article._id);
                    setShowPopup(true);
                  } else {
                    setShowPopup(true);
                  }
                }}
                className="inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold text-white transition hover:-translate-y-0.5"
                style={{ backgroundColor: inCart ? BRAND_DARK : BRAND }}
              >
                {inCart ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                )}
                {inCart ? "Ajouté" : "Panier"}
              </button>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900">
              Voir
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
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
                <img src={article.imageUrls[0]} alt={article.title} className="h-full w-full object-cover" />
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
