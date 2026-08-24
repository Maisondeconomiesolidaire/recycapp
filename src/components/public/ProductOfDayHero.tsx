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
 * Il met un article en avant sans manger tout l'écran : le catalogue doit
 * rester visible sous lui, sinon la mise en avant se paie d'une page qu'il faut
 * faire défiler avant de voir quoi que ce soit d'autre.
 *
 * En vitrine (`variant="kiosk"`), les favoris disparaissent et les liens
 * pointent vers les fiches du kiosque.
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
    <section className="mx-auto w-full max-w-4xl px-5 pt-6 sm:px-7 lg:px-8">
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
      <div className="relative overflow-hidden rounded-[28px] border border-brand-500/15 bg-gradient-to-br from-white via-[#fff7ef] to-[#ffe9d6] shadow-[0_24px_70px_rgba(241,16,79,0.14)]">
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative grid items-stretch md:grid-cols-[260px_1fr]">
          <Link
            to={href}
            className="group relative block h-60 overflow-hidden bg-[#f2eee7] md:h-[260px]"
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
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(241,16,79,0.36)]" style={{ animation: "podFloat 3.5s ease-in-out infinite" }}>
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
                className="absolute right-3 top-3 h-9 w-9"
              />
            )}
          </Link>

          <div className="relative flex min-w-0 flex-col justify-center gap-2.5 p-6 sm:p-7">
            <h2 className="line-clamp-2 text-xl font-black leading-[1.15] tracking-tight text-zinc-950 sm:text-2xl">
              {product.title}
            </h2>
            <p className="line-clamp-2 max-w-prose text-sm leading-6 text-zinc-600">
              {truncateDescription(product.description, 140)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {product.originalPrice && product.originalPrice > product.price ? (
                <>
                  <span className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: BRAND }}>
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-base font-semibold text-zinc-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: BRAND }}>
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-600 shadow-sm ring-1 ring-black/5">
                {product.condition}
              </span>
            </div>
            <Link
              to={href}
              className="inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(241,16,79,0.3)] transition hover:-translate-y-0.5"
              style={{ backgroundColor: BRAND }}
            >
              Découvrir l'article
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
