import { Link } from "react-router-dom";
import { ArrowRight, Heart, PackageOpen, UserRound } from "lucide-react";
import { formatPrice } from "../../lib/format";

import { PRICE_BG, PRICE_SHADOW } from "../../lib/publicColors";

const BRAND = "#f1104f";

/**
 * Consigne de la vitrine : on n'achète pas sur l'écran, un encadrant conclut
 * la vente puis passe l'article en « vendu » depuis le CRM.
 */
export const KIOSK_CALL_MESSAGE_GENERAL = "Intéressé(e) ? Faites appel à un encadrant.";

export const KIOSK_SCAN_LABEL = "Intéressé(e) ? Faites appel à un encadrant";

export type ShopArticleCard = {
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
  location?: string;
  caisseCode?: string;
};

function truncateDescription(value: string, max = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * Carte article de la boutique.
 *
 * Partagée par la boutique en ligne et la vitrine (mode kiosque) : le design
 * doit être rigoureusement le même des deux côtés, et le rester. En vitrine,
 * seules disparaissent les actions qui n'ont pas de sens sur place — favoris et
 * panier — remplacées par l'invitation à appeler un membre de l'équipe.
 */
export function ArticleCard({
  article,
  wishlisted = false,
  onToggleWishlist,
  variant = "boutique",
}: {
  article: ShopArticleCard;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
  /** « kiosk » = vitrine physique : ni favoris, ni panier. */
  variant?: "boutique" | "kiosk";
}) {
  const kiosk = variant === "kiosk";
  const bundleCount = article.bundledArticleIds?.length ?? 0;
  const reserved = article.status === "reserve";

  return (
    <>
    <Link
      to={kiosk ? `/kiosk/${article._id}` : `/boutique/${article._id}`}
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
            {/* Le bac où l'objet attend en boutique : le client le retrouve
                seul le jour du retrait, sans faire chercher l'équipe. */}
            {article.caisseCode ? (
              <span className="rounded-full bg-zinc-950/88 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                {article.caisseCode}
              </span>
            ) : null}
          </div>
          {onToggleWishlist && !kiosk && (
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
        {article.location ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Emplacement : {article.location}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {article.originalPrice && article.originalPrice > article.price ? (
              <>
                <span
                  className="rounded-2xl px-2.5 py-2 text-xl font-extrabold leading-none text-white"
                  style={{ backgroundColor: PRICE_BG, boxShadow: PRICE_SHADOW }}
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

        {kiosk ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm font-bold leading-5 text-zinc-700">
              {KIOSK_SCAN_LABEL}
            </span>
          </div>
        ) : !reserved && (
          <p className="mt-3 rounded-full bg-zinc-100 px-3 py-2 text-center text-xs font-semibold text-zinc-700">
            Passez en boutique
          </p>
        )}
      </div>
    </Link>
  </>
  );
}

export function HeartButton({
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
