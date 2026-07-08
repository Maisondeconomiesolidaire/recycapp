import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { ArrowRight, Heart, PackageOpen } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { redirectToCentralAuth } from "../../lib/centralAuth";

const BRAND = "#f1104f";

type FavoriteArticle = {
  _id: string;
  title: string;
  category: string;
  subcategory?: string;
  condition: string;
  price: number;
  originalPrice?: number;
  status: string;
  imageUrls: string[];
};

export function Favoris() {
  const { isSignedIn, isLoaded } = useUser();
  const favorites = useQuery(api.articles.myWishlist, isSignedIn ? {} : "skip");
  const toggleWishlist = useMutation(api.articles.toggleWishlist);

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-10 sm:px-7 lg:px-8">
      <div className="mb-7 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Heart className="h-5 w-5 fill-current" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Mes favoris
          </h1>
          <p className="text-sm text-zinc-600">
            Retrouvez les articles que vous avez sauvegardés.
          </p>
        </div>
      </div>

      {!isLoaded || (isSignedIn && favorites === undefined) ? (
        <FullSpinner label="Chargement de vos favoris…" />
      ) : !isSignedIn ? (
        <div className="rounded-[32px] border border-white/35 bg-white/60 p-8 text-center shadow-[0_18px_45px_rgba(24,24,27,0.08)] backdrop-blur-md">
          <EmptyState
            icon={<Heart className="h-10 w-10" />}
            title="Connectez-vous pour voir vos favoris"
            description="Sauvegardez vos coups de cœur et retrouvez-les sur tous vos appareils."
          />
          <button
            type="button"
            onClick={() => redirectToCentralAuth("sign-in")}
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,16,79,0.3)] transition hover:-translate-y-0.5"
            style={{ backgroundColor: BRAND }}
          >
            Se connecter
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : !favorites || favorites.length === 0 ? (
        <div className="rounded-[32px] border border-white/35 bg-white/60 p-6 shadow-[0_18px_45px_rgba(24,24,27,0.08)] backdrop-blur-md">
          <EmptyState
            icon={<Heart className="h-10 w-10" />}
            title="Aucun favori pour le moment"
            description="Touchez le cœur sur un article de la boutique pour le sauvegarder ici."
          />
          <Link
            to="/boutique"
            className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,16,79,0.3)] transition hover:-translate-y-0.5"
            style={{ backgroundColor: BRAND }}
          >
            Parcourir la boutique
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {favorites.map((article) => (
            <FavoriteCard
              key={article._id}
              article={article}
              onRemove={() =>
                void toggleWishlist({ articleId: article._id as Id<"articles"> })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  article,
  onRemove,
}: {
  article: FavoriteArticle;
  onRemove: () => void;
}) {
  const sold = article.status === "vendu";
  const reserved = article.status === "reserve";

  return (
    <Link
      to={`/boutique/${article._id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(24,24,27,0.16)]"
    >
      {sold && (
        <div className="absolute inset-x-0 top-0 z-20 bg-[#dc2626] px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.22em] text-white shadow-lg">
          Vendu
        </div>
      )}
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
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.08] ${
              sold || reserved ? "opacity-45 grayscale-[0.15]" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300">
            <PackageOpen className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm">
            {article.category}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Retirer des favoris"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm transition hover:scale-105"
          >
            <Heart className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>

      <div className={`flex flex-1 flex-col bg-white p-4 ${sold || reserved ? "opacity-70" : ""}`}>
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="line-clamp-2 text-base font-semibold leading-5 text-zinc-950">
            {article.title}
          </h3>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">
            {article.condition}
          </span>
        </div>
        {article.subcategory ? (
          <p className="mt-1.5 text-[11px] font-medium text-zinc-500">{article.subcategory}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {article.originalPrice && article.originalPrice > article.price ? (
              <>
                <span className="text-xl font-bold" style={{ color: sold ? "#9ca3af" : BRAND }}>
                  {formatPrice(article.price)}
                </span>
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {formatPrice(article.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold" style={{ color: sold ? "#9ca3af" : BRAND }}>
                {formatPrice(article.price)}
              </span>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-900">
            Voir
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
