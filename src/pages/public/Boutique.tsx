import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { ArrowRight, PackageOpen, Sparkles } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { HScroll } from "../../components/ui/HScroll";
import {
  ARTICLE_SITES,
  ARTICLE_SLUG_TO_CATEGORY,
} from "../../lib/constants";
import { ArticleCard, HeartButton } from "../../components/public/ArticleCard";
import type { Site } from "../../lib/constants";

const BRAND = "#f1104f";

/** Filtre « recyclerie » de la boutique : 60, 76, ou les deux. */
function SiteFilter({
  value,
  onChange,
}: {
  value: Site | "all";
  onChange: (next: Site | "all") => void;
}) {
  const options: { value: Site | "all"; label: string }[] = [
    { value: "all", label: "Toutes" },
    ...ARTICLE_SITES,
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Recyclerie
      </span>
      <div className="inline-flex rounded-full border border-white/40 bg-white/60 p-1 shadow-[0_10px_24px_rgba(24,24,27,0.08)] backdrop-blur">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                active ? "text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
              style={active ? { backgroundColor: BRAND } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function truncateDescription(value: string, max = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/** État partagé des favoris : ids sauvegardés + bascule (avec connexion si besoin). */
function useWishlist() {
  const { isSignedIn } = useUser();
  const clerk = useClerk();
  const ids = useQuery(api.articles.myWishlistIds, isSignedIn ? {} : "skip");
  const toggleMutation = useMutation(api.articles.toggleWishlist);
  const idSet = useMemo(() => new Set((ids ?? []).map(String)), [ids]);

  const toggle = (articleId: string) => {
    if (!isSignedIn) {
      clerk.openSignIn({});
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

  // Le client vient chercher son achat sur place : il doit pouvoir ne voir que
  // les articles de la recyclerie qui lui convient.
  const [site, setSite] = useState<Site | "all">("all");
  const articles = useQuery(api.articles.listPublic, {
    categories: activeCategory ? [activeCategory] : undefined,
    site: site === "all" ? undefined : site,
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
              <SiteFilter value={site} onChange={setSite} />
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
            className="group relative block aspect-[4/3] overflow-hidden bg-[#f2eee7] md:aspect-auto md:min-h-[380px]"
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

          <div className="relative flex flex-col justify-center gap-4 p-7 sm:p-9 lg:p-10">
            <h2 className="text-3xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
              {product.title}
            </h2>
            <p className="max-w-prose text-base leading-7 text-zinc-600 sm:text-lg">
              {truncateDescription(product.description, 240)}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {product.originalPrice && product.originalPrice > product.price ? (
                <>
                  <span className="text-4xl font-black tracking-tight sm:text-5xl" style={{ color: BRAND }}>
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xl font-semibold text-zinc-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-black tracking-tight sm:text-5xl" style={{ color: BRAND }}>
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 shadow-sm ring-1 ring-black/5">
                {product.condition}
              </span>
            </div>
            <Link
              to={`/boutique/${product._id}`}
              className="inline-flex w-fit items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(241,16,79,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(241,16,79,0.42)]"
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
