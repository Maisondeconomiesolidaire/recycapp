import { Link } from "react-router-dom";
import { ArrowRight, PackageOpen } from "lucide-react";
import { formatPrice } from "../../lib/format";
import { HeartButton, type ShopArticleCard } from "./ArticleCard";

const BRAND = "#f1104f";

export type ShopArticle = Pick<
  ShopArticleCard,
  | "_id"
  | "title"
  | "description"
  | "category"
  | "condition"
  | "price"
  | "originalPrice"
  | "status"
  | "imageUrls"
> & { subcategory?: string };

function truncateDescription(value: string, max = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * « Produit du jour », partagé par la boutique en ligne et la vitrine.
 *
 * En vitrine (`variant="kiosk"`), les favoris disparaissent et les liens
 * pointent vers les fiches du kiosque. Tout le reste — dimensions comprises —
 * est identique des deux côtés.
 */
export function ProductOfDayHero({
  product,
  wishlisted = false,
  onToggleWishlist,
  variant = "boutique",
}: {
  product: ShopArticle;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
  variant?: "boutique" | "kiosk";
}) {
  const kiosk = variant === "kiosk";
  const href = kiosk ? `/kiosk/${product._id}` : `/boutique/${product._id}`;

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
            to={href}
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
            {onToggleWishlist && !kiosk && (
              <HeartButton
                active={wishlisted}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleWishlist();
                }}
                className="absolute right-5 top-5 h-11 w-11"
              />
            )}
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
              to={href}
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
