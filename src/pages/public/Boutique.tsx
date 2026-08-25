import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { PackageOpen, Sparkles } from "lucide-react";
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
import {
  ProductOfDayHero,
  type ShopArticle,
} from "../../components/public/ProductOfDayHero";
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
              src="/hero-new.jpeg"
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
