import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { PackageOpen, Search, ShoppingBag, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { ARTICLE_CATEGORIES, ARTICLE_SITES } from "../../lib/constants";
import type { Site } from "../../lib/constants";
import { BRAND } from "./checkoutTheme";

/**
 * Vitrine physique (mode kiosque).
 *
 * Le même catalogue que la boutique en ligne, mais pensé pour un écran tactile
 * posé devant la recyclerie : pas de compte, pas de favoris, pas de panier —
 * un seul geste, « Acheter », qui mène directement au paiement. Réserver n'a
 * aucun sens ici : le client est déjà sur place.
 */
export function Kiosk() {
  const [site, setSite] = useState<Site | "all">("all");
  const [category, setCategory] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const articles = useQuery(api.articles.listPublic, {
    categories: category === "all" ? undefined : [category],
    site: site === "all" ? undefined : site,
  });

  const visible = useMemo(() => {
    if (!articles) return articles;
    const query = search.trim().toLowerCase();
    // Un kiosque ne vend que ce qui est encore disponible : un article réservé
    // par quelqu'un d'autre ne doit pas s'afficher comme achetable.
    const available = articles.filter((a) => a.status === "disponible");
    if (!query) return available;
    return available.filter((article) =>
      [article.title, article.description, article.category, article.subcategory]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [articles, search]);

  return (
    <div className="min-h-screen bg-[#faf7f3]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/92 backdrop-blur">
        <div className="mx-auto w-full max-w-[100rem] px-6 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="mr-auto">
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: BRAND }}
              >
                Recyclerie du Pays de Bray
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
                Vitrine
              </h1>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article…"
                className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-12 text-lg text-zinc-900 outline-none transition focus:border-zinc-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-400 hover:bg-zinc-100"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <KioskChip
              active={site === "all"}
              onClick={() => setSite("all")}
              label="Toutes les recycleries"
            />
            {ARTICLE_SITES.map((option) => (
              <KioskChip
                key={option.value}
                active={site === option.value}
                onClick={() => setSite(option.value)}
                label={option.label}
              />
            ))}
            <span className="mx-1 h-6 w-px bg-zinc-200" />
            <KioskChip
              active={category === "all"}
              onClick={() => setCategory("all")}
              label="Tout"
            />
            {ARTICLE_CATEGORIES.map((value) => (
              <KioskChip
                key={value}
                active={category === value}
                onClick={() => setCategory(value)}
                label={value}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[100rem] px-6 py-8">
        {articles === undefined ? (
          <FullSpinner label="Chargement du catalogue…" />
        ) : !visible || visible.length === 0 ? (
          <div className="rounded-[32px] border border-zinc-200 bg-white p-16 text-center">
            <PackageOpen className="mx-auto h-14 w-14 text-zinc-300" />
            <p className="mt-4 text-2xl font-bold text-zinc-800">
              Aucun article ne correspond
            </p>
            <p className="mt-1 text-zinc-500">
              Essayez une autre recherche ou une autre catégorie.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {visible.length} article{visible.length > 1 ? "s" : ""} disponible
              {visible.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((article) => (
                <KioskCard key={article._id} article={article} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KioskChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "text-white shadow-sm"
          : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-zinc-900"
      }`}
      style={active ? { backgroundColor: BRAND } : undefined}
    >
      {label}
    </button>
  );
}

function KioskCard({
  article,
}: {
  article: {
    _id: string;
    title: string;
    category: string;
    condition: string;
    price: number;
    originalPrice?: number;
    imageUrls: string[];
    caisseCode?: string;
  };
}) {
  const hasDiscount =
    article.originalPrice !== undefined && article.originalPrice > article.price;

  return (
    <Link
      to={`/kiosk/achat/${article._id}`}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_14px_34px_rgba(24,24,27,0.06)] transition active:scale-[0.99]"
    >
      <div className="relative aspect-[1/0.85] overflow-hidden bg-[#f2eee7]">
        {article.imageUrls[0] ? (
          <img
            src={article.imageUrls[0]}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300">
            <PackageOpen className="h-14 w-14" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 p-3">
          <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm">
            {article.category}
          </span>
          {article.caisseCode && (
            <span className="rounded-full bg-zinc-950/88 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
              {article.caisseCode}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 text-lg font-bold leading-6 text-zinc-950">
          {article.title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{article.condition}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="flex min-w-0 flex-col">
            <span className="text-2xl font-extrabold text-zinc-950">
              {formatPrice(article.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm font-medium text-zinc-400 line-through">
                {formatPrice(article.originalPrice!)}
              </span>
            )}
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(241,16,79,0.3)]"
            style={{ backgroundColor: BRAND }}
          >
            <ShoppingBag className="h-4 w-4" />
            Acheter
          </span>
        </div>
      </div>
    </Link>
  );
}
