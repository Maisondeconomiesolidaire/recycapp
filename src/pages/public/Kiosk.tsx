import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { PackageOpen, Search, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ARTICLE_CATEGORIES } from "../../lib/constants";
import {
  ArticleCard,
  KIOSK_CALL_MESSAGE_GENERAL,
} from "../../components/public/ArticleCard";
import { ProductOfDayHero } from "../../components/public/ProductOfDayHero";

const BRAND = "#f1104f";

/**
 * Vitrine physique (mode kiosque).
 *
 * Rigoureusement la boutique en ligne — même carte article, même mise en page,
 * même catalogue — moins ce qui n'a pas de sens devant un écran posé à
 * l'entrée : pas de compte, pas de favoris, pas de panier, pas de paiement. Le
 * client ne conclut pas son achat seul : il appelle un membre de l'équipe.
 *
 * La carte est le composant partagé avec la boutique, pour que les deux
 * vitrines ne divergent jamais.
 */
export function Kiosk() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const articles = useQuery(api.articles.listPublic, {
    categories: category ? [category] : undefined,
  });
  const productOfDay = useQuery(api.articles.getProductOfDay, {});
  // La mise en avant s'efface dès qu'on filtre ou qu'on cherche : elle
  // désignerait un article absent de la liste affichée juste en dessous.
  const showFeatured = !category && !search.trim();

  const filteredArticles = useMemo(() => {
    if (!articles) return articles;
    const query = search.trim().toLowerCase();
    // En vitrine, on ne montre que ce qui est encore à vendre : un article
    // réservé par quelqu'un d'autre n'a rien à faire sur l'écran d'entrée.
    const available = articles.filter((article) => article.status === "disponible");
    if (!query) return available;
    return available.filter((article) =>
      [article.title, article.description, article.category, article.subcategory]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [articles, search]);

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Le même fond animé que la boutique en ligne : la vitrine et le site
          doivent se ressembler jusque dans le décor. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video autoPlay muted loop playsInline className="h-full w-full object-cover">
          <source src="/Beautiful%20Wallpaper%20Video.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="relative z-10">
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

      {/* Consigne d'achat : c'est la seule action possible ici. */}
      <section className="mx-auto w-full max-w-[92rem] px-5 sm:px-7 lg:px-8">
        <p
          className="rounded-[28px] px-6 py-5 text-center text-base font-bold text-white shadow-[0_18px_45px_rgba(241,16,79,0.24)] sm:text-lg"
          style={{ backgroundColor: BRAND }}
        >
          {KIOSK_CALL_MESSAGE_GENERAL}
        </p>
      </section>

      {showFeatured && productOfDay && (
        <ProductOfDayHero product={productOfDay} variant="kiosk" />
      )}

      {/* Catégories : les mêmes que dans l'en-tête de la boutique. */}
      <nav className="mx-auto flex w-full max-w-[92rem] flex-wrap gap-2 px-5 pt-8 sm:px-7 lg:px-8">
        <CategoryChip
          label="Tout"
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {ARTICLE_CATEGORIES.map((item) => (
          <CategoryChip
            key={item}
            label={item}
            active={category === item}
            onClick={() => setCategory(item)}
          />
        ))}
      </nav>

      <section className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Catalogue
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {category ?? "Tous les articles"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {filteredArticles?.length ?? 0} article
                {(filteredArticles?.length ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article…"
              className="h-14 w-full rounded-2xl border border-white/60 bg-white/80 pl-12 pr-12 text-base text-zinc-900 shadow-sm outline-none backdrop-blur transition focus:border-zinc-300"
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
                <ArticleCard key={article._id} article={article} variant="kiosk" />
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

/** Pastille de catégorie, reprise de l'en-tête de la boutique. */
function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white/84 text-zinc-950 shadow-sm"
          : "text-zinc-700 hover:bg-white/70 hover:text-zinc-950"
      }`}
    >
      {label}
    </button>
  );
}
