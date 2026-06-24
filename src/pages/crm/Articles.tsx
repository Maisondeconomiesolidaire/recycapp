import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CircleDollarSign,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Warehouse,
  Boxes,
  Sparkles,
  Loader2,
  Check,
  Printer,
  ScanLine,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { ErrorBoundary } from "../../components/ErrorBoundary";

const CameraScanner = lazy(() =>
  import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ArticleForm } from "../../components/crm/ArticleForm";
import { formatPrice } from "../../lib/format";
import { ARTICLE_CATEGORIES, ARTICLE_STATUS_LABELS } from "../../lib/constants";
import { useEffect, useRef } from "react";
import { Input } from "../../components/ui/Field";
import { MultiSelectChips } from "../../components/ui/MultiSelectChips";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { PrintLabels } from "../../components/crm/PrintLabels";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";

type ArticleDoc = Doc<"articles"> & { imageUrls: string[] };
type Tab = "stock" | "lots" | "dashboard";

type AiLotGroup = {
  title: string;
  reason: string;
  suggestedPrice: number;
  articleIds: string[];
  merchandisingNote?: string;
};

const STATUS_STYLE: Record<string, string> = {
  disponible: "bg-brand-500 text-white",
  reserve: "bg-amber-500 text-white",
  vendu: "bg-zinc-700 text-zinc-100",
  attente: "bg-sky-500 text-white",
  lot: "bg-sky-500 text-white",
};

type ArticleStatus = "disponible" | "reserve" | "vendu" | "attente";

const STATUS_OPTIONS: { value: ArticleStatus; label: string; style: string }[] = [
  { value: "disponible", label: "Disponible", style: STATUS_STYLE.disponible },
  { value: "reserve",    label: "Réservé",    style: STATUS_STYLE.reserve },
  { value: "vendu",      label: "Vendu",      style: STATUS_STYLE.vendu },
  { value: "attente",    label: "En attente", style: STATUS_STYLE.attente },
];

function StatusDropdown({
  id,
  status,
  disabled,
}: {
  id: string;
  status: string;
  disabled?: boolean;
}) {
  const patchStatus = useMutation(api.articles.patchStatus);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function change(next: ArticleStatus) {
    if (next === status) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await patchStatus({ id: id as Doc<"articles">["_id"], status: next });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={loading || disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity ${STATUS_STYLE[status] ?? "bg-zinc-700 text-zinc-100"} ${loading ? "opacity-60" : "hover:opacity-90"}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          ARTICLE_STATUS_LABELS[status]
        )}
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => change(opt.value)}
              className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-[var(--crm-surface-2)]"
            >
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${opt.style}`}>
                {opt.label}
              </span>
              {status === opt.value && <Check className="h-3.5 w-3.5 text-zinc-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "stock", label: "Stock" },
  { key: "lots", label: "Lots potentiels" },
  { key: "dashboard", label: "Tableau de bord" },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function Articles() {
  const access = useCrmAccess();
  const canCreate = canAccess(access, "articles", "create");
  const canUpdate = canAccess(access, "articles", "update");
  const canDelete = canAccess(access, "articles", "delete");
  const canPrint = canAccess(access, "articles", "print");
  const canAnalyze = canAccess(access, "articles", "analyze");
  const [tab, setTab] = useState<Tab>("stock");
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const articles = useQuery(api.articles.listAll, {});
  const remove = useMutation(api.articles.remove);
  const publishLot = useMutation(api.articles.publishLot);
  const analyzePotentialLots = useAction(api.ai.analyzePotentialLots);
  const [editing, setEditing] = useState<ArticleDoc | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ArticleDoc | null>(null);
  const [aiGroups, setAiGroups] = useState<AiLotGroup[] | null>(null);
  const [analyzingLots, setAnalyzingLots] = useState(false);
  const [lotAnalysisError, setLotAnalysisError] = useState("");
  const [printArticles, setPrintArticles] = useState<ArticleDoc[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  // Note: barcode scanner (external device) is handled globally by GlobalScanner in CrmLayout

  const filteredArticles = useMemo(() => {
    if (!articles) return articles;
    const selected = selectedCategories.filter(Boolean);
    const rawSearch = searchText.trim();
    const normalizedSearch = normalizeText(rawSearch);
    const digitSearch = normalizeDigits(rawSearch);

    return articles.filter((article) => {
      if (selected.length > 0 && !selected.includes(article.category)) {
        return false;
      }

      if (!rawSearch) return true;

      const haystack = [
        article.title,
        article.category,
        article.subcategory,
        article.internalReference,
        article.gdrReference,
      ]
        .filter((value): value is string => Boolean(value))
        .map(normalizeText);

      const textMatch = haystack.some((value) => value.includes(normalizedSearch));
      const digitMatch =
        digitSearch.length > 0 &&
        [article.internalReference, article.gdrReference]
          .filter((value): value is string => Boolean(value))
          .map(normalizeDigits)
          .some((value) => value.includes(digitSearch));

      return textMatch || digitMatch;
    });
  }, [articles, searchText, selectedCategories]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(a: ArticleDoc) {
    setEditing(a);
    setFormOpen(true);
  }

  function handleScannedCode(code: string) {
    setScanOpen(false);
    const ref = code.trim();
    const found = (articles ?? []).find(
      (a) => a.internalReference === ref || a.gdrReference === ref,
    );
    if (found) {
      openEdit(found);
    } else {
      // Pas trouvé : on bascule la recherche sur le code scanné.
      setSearchText(ref);
    }
  }

  async function handleAnalyzeLots() {
    if (!canAnalyze) return;
    setAnalyzingLots(true);
    setLotAnalysisError("");
    try {
      const result = await analyzePotentialLots({});
      setAiGroups(result.groups ?? []);
      setTab("lots");
    } catch (err) {
      setLotAnalysisError(
        err instanceof Error ? err.message : "Analyse des lots impossible.",
      );
      setTab("lots");
    } finally {
      setAnalyzingLots(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Articles de la boutique"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => filteredArticles && filteredArticles.length > 0 && setPrintArticles(filteredArticles)}
              disabled={!canPrint || !filteredArticles?.length}
              title="Imprimer les étiquettes des articles visibles"
            >
              <Printer className="h-4 w-4" />
              Étiquettes
            </Button>
            <Button
              variant="outline"
              onClick={handleAnalyzeLots}
              disabled={!canAnalyze || analyzingLots || !articles?.length}
            >
              {analyzingLots ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Analyser les lots potentiels
            </Button>
            <Button variant="outline" onClick={() => setScanOpen(true)}>
              <ScanLine className="h-4 w-4" />
              Scanner
            </Button>
            {canCreate && (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nouvel article
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <UnderlineTabs
          items={TABS}
          value={tab}
          onChange={setTab}
          counts={
            articles
              ? {
                  stock: articles.filter((article) => article.status !== "vendu").length,
                  lots: buildPotentialLots(articles).length,
                  dashboard: articles.filter((article) => article.status === "vendu").length,
                }
              : undefined
          }
        />

        {articles === undefined || filteredArticles === undefined ? (
          <div className="pt-6">
            <FullSpinner label="Chargement…" />
          </div>
        ) : tab === "dashboard" ? (
          <ArticleDashboard articles={articles} />
        ) : tab === "lots" ? (
          <PotentialLots
            articles={articles}
            aiGroups={aiGroups}
            loading={analyzingLots}
            error={lotAnalysisError}
            canPublish={canCreate}
            onPublish={async (group) => {
              if (!canCreate) return;
              await publishLot({
                articleIds: group.items.map((article) => article._id),
                title:
                  group.title ??
                  `Lot ${group.subcategory === "Général" ? group.category : group.subcategory}`,
                description: `${group.reason}\n\n${group.items
                  .map((article) => `- ${article.title}`)
                  .join("\n")}`,
                price: group.suggestedPrice,
              });
              setAiGroups((current) =>
                current?.filter((item) => item.title !== group.title) ?? null,
              );
            }}
          />
        ) : (
          <div className="pt-6">
            <div className="mb-6 space-y-4 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 overflow-hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Rechercher par titre, réf. interne ou réf. externe…"
                  className="pl-9 dark:bg-[var(--crm-surface)]"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">
                  Filtrer par catégorie
                </p>
                <MultiSelectChips
                  options={ARTICLE_CATEGORIES}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  dark
                  orientation="horizontal"
                />
              </div>
            </div>

            {filteredArticles.length === 0 ? (
              <EmptyState
                icon={<Package className="h-10 w-10" />}
                title={
                  searchText.trim() || selectedCategories.length > 0
                    ? "Aucun résultat"
                    : "Aucun article"
                }
                description={
                  searchText.trim() || selectedCategories.length > 0
                    ? "Aucun article ne correspond à votre recherche ou à vos filtres."
                    : "Ajoutez votre premier article pour qu'il apparaisse en boutique."
                }
                action={
                  canCreate ? (
                    <Button onClick={openNew}>
                      <Plus className="h-4 w-4" /> Nouvel article
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)]">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Article</th>
                      <th className="px-4 py-3 text-left font-medium">Références</th>
                      <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                      <th className="px-4 py-3 text-left font-medium">Emplacement</th>
                      <th className="px-4 py-3 text-left font-medium">Prix</th>
                      <th className="px-4 py-3 text-left font-medium">Statut</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredArticles.map((a) => (
                      <tr key={a._id} className="bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-2)]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--crm-surface-2)]">
                              {a.imageUrls[0] ? (
                                <img
                                  src={a.imageUrls[0]}
                                  alt={a.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-500" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-100 line-clamp-1">
                                {a.title}
                              </p>
                              <p className="text-xs text-zinc-500">{a.condition}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          <div className="space-y-0.5">
                            <p>Interne : {a.internalReference ?? "—"}</p>
                            <p>Réf. ext. : {a.gdrReference ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          <div>
                            <p>{a.category}</p>
                            <p className="text-xs text-zinc-500">{a.subcategory ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {a.location?.trim() ? a.location : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-zinc-100">
                              {formatPrice(a.price)}
                            </p>
                            {a.originalPrice && a.originalPrice > a.price && (
                              <p className="text-xs text-zinc-500 line-through">
                                {formatPrice(a.originalPrice)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusDropdown id={a._id} status={a.status} disabled={!canUpdate} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canPrint && (
                              <button
                                onClick={() => setPrintArticles([a])}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                                title="Imprimer l'étiquette"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                onClick={() => openEdit(a)}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleting(a)}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-[var(--crm-surface-3)] hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <ChevronRight className="h-4 w-4 text-zinc-600" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <ArticleForm
          key={editing?._id ?? "new"}
          article={editing}
          open={formOpen}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await remove({ id: deleting._id });
          setDeleting(null);
        }}
        title="Supprimer cet article ?"
        description={
          deleting
            ? `L'article « ${deleting.title} » sera retiré définitivement de la boutique et du CRM.`
            : undefined
        }
        confirmLabel="Supprimer"
      />

      {/* Print labels modal */}
      {printArticles && (
        <PrintLabels
          articles={printArticles}
          onClose={() => setPrintArticles(null)}
        />
      )}

      {/* Scan caméra : ouvre directement l'article correspondant. */}
      {scanOpen && (
        <ErrorBoundary
          fallback={() => (
            <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
              <ScanLine className="h-9 w-9 text-zinc-500" />
              <p className="max-w-xs text-sm text-zinc-200">
                Le scanner n'a pas pu démarrer. Rechargez la page puis réessayez.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Recharger
                </button>
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="rounded-xl border border-[var(--crm-border-strong)] px-4 py-2.5 text-sm font-semibold text-zinc-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        >
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                <p className="text-sm text-zinc-300">Ouverture du scanner…</p>
              </div>
            }
          >
            <CameraScanner
              onDetected={handleScannedCode}
              onClose={() => setScanOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Barcode scanner modal is handled globally by GlobalScanner in CrmLayout */}
    </div>
  );
}

function lotKey(article: ArticleDoc) {
  return article.themeKey || deriveThemeKey(article);
}

const GENERIC_LOT_KEYWORDS = new Set([
  "article",
  "articles",
  "avec",
  "bon",
  "etat",
  "figurine",
  "figurines",
  "jeux",
  "jouet",
  "jouets",
  "loisirs",
  "plastique",
]);

function normalizeLotKeyword(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function keywordsForArticle(article: ArticleDoc) {
  if (article.keywords?.length) {
    return article.keywords.map(normalizeLotKeyword).filter(Boolean);
  }
  return Array.from(
    new Set(
      normalizeLotKeyword(`${article.title} ${article.description}`)
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !GENERIC_LOT_KEYWORDS.has(word)),
    ),
  );
}

const THEME_PATTERNS_FRONTEND: Array<{ words: string[]; key: string }> = [
  { words: ["mario", "kart", "luigi", "toad", "bowser", "yoshi", "peach", "nintendo"], key: "mario" },
  { words: ["batman", "gotham", "joker", "bruce", "wayne"], key: "batman" },
  { words: ["superman", "wonderwoman", "wonder", "aquaman", "flash", "dc"], key: "dc-super-heros" },
  { words: ["ironman", "iron", "avengers", "thor", "hulk", "captain", "america", "marvel", "wakanda", "black", "panther", "hawkeye", "falcon", "antman"], key: "marvel" },
  { words: ["spiderman", "spider"], key: "spider-man" },
  { words: ["buzz", "lightyear", "woody", "jessie", "slinky", "lotso", "hamm", "rex"], key: "toy-story" },
  { words: ["playmobil"], key: "playmobil" },
  { words: ["pirate", "pirates", "bateau", "corsaire"], key: "pirates" },
  { words: ["lego"], key: "lego" },
  { words: ["pokemon", "pikachu", "charizard", "bulbasaur", "squirtle", "eevee", "mewtwo"], key: "pokemon" },
  { words: ["barbie", "ken"], key: "barbie" },
  { words: ["wars", "jedi", "sith", "yoda", "darth", "vader", "stormtrooper", "mandalorian"], key: "star-wars" },
  { words: ["harry", "potter", "hogwarts", "hermione", "dumbledore", "voldemort"], key: "harry-potter" },
  { words: ["minions", "gru", "despicable"], key: "minions" },
  { words: ["frozen", "elsa", "anna", "olaf"], key: "frozen" },
  { words: ["cars", "mcqueen", "lightning"], key: "cars-pixar" },
  { words: ["dinosaure", "dinosaures", "dino", "jurassic"], key: "dinosaures" },
];

function deriveThemeKey(article: ArticleDoc) {
  const text = normalizeLotKeyword(
    `${article.title} ${article.description} ${(article.keywords ?? []).join(" ")}`,
  );
  const words = new Set(text.split(/\s+/).filter(Boolean));
  for (const pattern of THEME_PATTERNS_FRONTEND) {
    if (pattern.words.some((w) => words.has(w))) return pattern.key;
  }
  return "";
}

const THEME_SUPERGROUPS: Record<string, string> = {
  "marvel": "super-heros",
  "spider-man": "super-heros",
  "batman": "super-heros",
  "dc-super-heros": "super-heros",
};

function themeSupergroup(key: string) {
  return THEME_SUPERGROUPS[key] ?? key;
}

function compatibleForFallback(a: ArticleDoc, b: ArticleDoc) {
  const aTheme = lotKey(a);
  const bTheme = lotKey(b);
  if (aTheme && bTheme) {
    if (aTheme === bTheme) return true;
    if (themeSupergroup(aTheme) === themeSupergroup(bTheme)) return true;
    return false;
  }
  if (a.subcategory !== b.subcategory) return false;
  const bKeywords = new Set(keywordsForArticle(b));
  return keywordsForArticle(a).filter((keyword) => bKeywords.has(keyword)).length >= 2;
}

function discountedBundlePrice(total: number) {
  return Math.max(10, Math.round(total * (total >= 40 ? 0.82 : 0.85)));
}

const THEME_KEY_LABELS: Record<string, string> = {
  "mario": "Lot Mario Nintendo",
  "batman": "Lot Batman DC",
  "dc-super-heros": "Lot super-héros DC",
  "marvel": "Lot super-héros Marvel",
  "spider-man": "Lot Spider-Man Marvel",
  "super-heros": "Lot super-héros",
  "toy-story": "Lot Toy Story Pixar",
  "playmobil": "Lot Playmobil",
  "pirates": "Lot pirates",
  "lego": "Lot Lego",
  "pokemon": "Lot Pokémon",
  "barbie": "Lot Barbie",
  "star-wars": "Lot Star Wars",
  "harry-potter": "Lot Harry Potter",
  "minions": "Lot Minions",
  "frozen": "Lot La Reine des Neiges",
  "cars-pixar": "Lot Cars Pixar",
  "dinosaures": "Lot dinosaures",
};

function titleForLotKey(key: string, items: ArticleDoc[]) {
  if (key && THEME_KEY_LABELS[key]) return THEME_KEY_LABELS[key];
  if (key) {
    return `Lot ${key
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")}`;
  }
  return `Lot ${items[0]?.subcategory || "sélection"}`;
}

function buildPotentialLots(articles: ArticleDoc[]) {
  const candidates = articles.filter(
    (article) =>
      article.status !== "vendu" &&
      article.status !== "reserve" &&
      !article.bundleKey &&
      !article.isLot,
  );
  const groups = new Map<string, ArticleDoc[]>();
  for (const article of candidates) {
    const key = lotKey(article);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    if (existing.length === 0 || existing.every((item) => compatibleForFallback(item, article))) {
      groups.set(key, [...existing, article]);
    }
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const total = items.reduce((sum, article) => sum + article.price, 0);
      const lowValueCount = items.filter((article) => article.price < 10).length;
      return {
        key,
        category: items[0]?.category ?? "Lot",
        subcategory: items[0]?.subcategory ?? "Sélection",
        title: titleForLotKey(key, items),
        reason:
          "Thème précis et mots-clés compatibles. Le lot est proposé avec une remise pour créer une offre plus attractive.",
        items: items.sort((a, b) => a.price - b.price),
        total,
        suggestedPrice: discountedBundlePrice(total),
        lowValueCount,
      };
    })
    .filter((group) => group.items.length >= 2)
    .sort((a, b) => b.lowValueCount - a.lowValueCount || b.items.length - a.items.length);
}

type PotentialLotGroup = ReturnType<typeof buildPotentialLots>[number] & {
  title?: string;
  reason?: string;
  merchandisingNote?: string;
};

function PotentialLots({
  articles,
  aiGroups,
  loading,
  error,
  canPublish,
  onPublish,
}: {
  articles: ArticleDoc[];
  aiGroups: AiLotGroup[] | null;
  loading: boolean;
  error: string;
  canPublish: boolean;
  onPublish: (group: PotentialLotGroup) => Promise<void>;
}) {
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [hiddenLotKeys, setHiddenLotKeys] = useState<string[]>([]);
  const [removedArticleIdsByLot, setRemovedArticleIdsByLot] = useState<
    Record<string, string[]>
  >({});
  const articleById = new Map(
    articles.map((article) => [article._id as string, article]),
  );
  const baseGroups: PotentialLotGroup[] =
    aiGroups && aiGroups.length > 0
      ? aiGroups
          .map((group) => {
            const items = group.articleIds
              .map((id) => articleById.get(id))
              .filter((article): article is ArticleDoc => Boolean(article));
            const first = items[0];
            return {
              key: group.title,
              category: first?.category ?? "Lot",
              subcategory: first?.subcategory ?? "Sélection IA",
              items,
              total: items.reduce((sum, article) => sum + article.price, 0),
              suggestedPrice: group.suggestedPrice,
              lowValueCount: items.filter((article) => article.price < 10).length,
              title: group.title,
              reason: group.reason,
              merchandisingNote: group.merchandisingNote,
            };
          })
          .filter((group) => group.items.length >= 2)
      : buildPotentialLots(articles);

  const groups = baseGroups
    .filter((group) => !hiddenLotKeys.includes(group.key))
    .map((group) => {
      const removedIds = new Set(removedArticleIdsByLot[group.key] ?? []);
      const items = group.items.filter(
        (article) => !removedIds.has(article._id as string),
      );
      const total = items.reduce((sum, article) => sum + article.price, 0);
      return {
        ...group,
        items,
        total,
        lowValueCount: items.filter((article) => article.price < 10).length,
        suggestedPrice: discountedBundlePrice(total),
      };
    })
    .filter((group) => group.items.length >= 2);

  async function handlePublish(group: PotentialLotGroup) {
    setPublishingKey(group.key);
    try {
      await onPublish(group);
    } finally {
      setPublishingKey(null);
    }
  }

  function hideLot(groupKey: string) {
    setHiddenLotKeys((current) =>
      current.includes(groupKey) ? current : [...current, groupKey],
    );
  }

  function removeArticleFromLot(groupKey: string, articleId: string) {
    setRemovedArticleIdsByLot((current) => ({
      ...current,
      [groupKey]: Array.from(new Set([...(current[groupKey] ?? []), articleId])),
    }));
  }

  if (loading) {
    return (
      <div className="pt-6">
        <FullSpinner label="Analyse des lots potentiels…" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="pt-6">
        {error && (
          <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <EmptyState
          icon={<Boxes className="h-10 w-10" />}
          title="Aucun lot potentiel"
          description="Lancez l'analyse IA ou ajoutez davantage d'articles en attente pour faire apparaître des suggestions."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pt-6 xl:grid-cols-2">
      {error && (
        <p className="xl:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {groups.map((group) => (
        <div
          key={group.key}
          className="rounded-3xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  {aiGroups && aiGroups.length > 0 ? "Suggestion IA" : "Lot potentiel"}
                </p>
                <button
                  type="button"
                  onClick={() => hideLot(group.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/15"
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </button>
              </div>
              <h3 className="mt-1 text-xl font-semibold text-zinc-100">
                {group.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {group.reason ??
                  "Même univers commercial. Idéal pour regrouper les articles à faible valeur et créer une offre plus attractive."}
              </p>
              {group.merchandisingNote && (
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {group.merchandisingNote}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-[var(--crm-surface)] px-4 py-3 text-right">
              <p className="text-xs text-zinc-500">Prix suggéré</p>
              <p className="text-2xl font-bold text-zinc-100">
                {formatPrice(group.suggestedPrice)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {group.items.slice(0, 6).map((article) => (
              <div
                key={article._id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-2.5"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--crm-surface-2)]">
                  {article.imageUrls[0] ? (
                    <img
                      src={article.imageUrls[0]}
                      alt={article.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Package className="h-4 w-4 text-zinc-600" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-zinc-100">
                    {article.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ARTICLE_STATUS_LABELS[article.status]} · {article.condition}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-zinc-100">
                  {formatPrice(article.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeArticleFromLot(group.key, article._id as string)}
                  className="shrink-0 rounded-xl p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  aria-label={`Retirer ${article.title} du lot potentiel`}
                  title="Retirer du lot potentiel"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {group.items.length > 6 && (
            <p className="mt-3 text-xs text-zinc-500">
              + {group.items.length - 6} article
              {group.items.length - 6 > 1 ? "s" : ""} supplémentaire
              {group.items.length - 6 > 1 ? "s" : ""}
            </p>
          )}

          {canPublish && (
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => handlePublish(group)}
                disabled={publishingKey === group.key}
              >
                {publishingKey === group.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                Mettre le lot en ligne
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArticleDashboard({ articles }: { articles: ArticleDoc[] }) {
  const sold = articles.filter((article) => article.status === "vendu");
  const inProgress = articles.filter((article) => article.status === "reserve");
  const available = articles.filter((article) => article.status === "disponible");
  const revenue = sold.reduce((sum, article) => sum + article.price, 0);
  const stockValue = available.reduce((sum, article) => sum + article.price, 0);
  const averageBasket = sold.length > 0 ? revenue / sold.length : 0;

  const categoryBreakdown = ARTICLE_CATEGORIES.map((category) => {
    const items = articles.filter((article) => article.category === category);
    return {
      category,
      total: items.length,
      sold: items.filter((article) => article.status === "vendu").length,
      reserve: items.filter((article) => article.status === "reserve").length,
      available: items.filter((article) => article.status === "disponible").length,
    };
  }).filter((row) => row.total > 0);

  return (
    <div className="space-y-6 pt-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Articles disponibles"
          value={available.length}
          helper={`${formatPrice(stockValue)} de valeur en stock`}
          icon={<Warehouse className="h-4 w-4" />}
        />
        <MetricCard
          title="Achats en cours"
          value={inProgress.length}
          helper="Articles actuellement réservés"
          icon={<Clock3 className="h-4 w-4" />}
        />
        <MetricCard
          title="Articles vendus"
          value={sold.length}
          helper={`${articles.length > 0 ? Math.round((sold.length / articles.length) * 100) : 0}% du catalogue`}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <MetricCard
          title="Chiffre d'affaires"
          value={formatPrice(revenue)}
          helper={`Panier moyen ${formatPrice(averageBasket)}`}
          icon={<CircleDollarSign className="h-4 w-4" />}
          valueClassName="text-[2rem]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-5">
          <p className="text-sm font-medium text-zinc-100">Vue rapide</p>
          <div className="mt-5 space-y-4">
            <ProgressRow
              label="Disponibles"
              value={available.length}
              total={articles.length}
              color="bg-brand-500"
            />
            <ProgressRow
              label="Achats en cours"
              value={inProgress.length}
              total={articles.length}
              color="bg-amber-500"
            />
            <ProgressRow
              label="Vendus"
              value={sold.length}
              total={articles.length}
              color="bg-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)]">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Disponibles</th>
                <th className="px-4 py-3 text-left font-medium">En cours</th>
                <th className="px-4 py-3 text-left font-medium">Vendus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {categoryBreakdown.map((row) => (
                <tr key={row.category} className="bg-[var(--crm-surface)]">
                  <td className="px-4 py-3 font-medium text-zinc-100">{row.category}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.total}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.available}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.reserve}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon,
  valueClassName,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-5">
      <div className="flex items-center gap-2 text-zinc-400">
        {icon}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className={`mt-4 text-4xl font-semibold tracking-tight text-zinc-100 ${valueClassName ?? ""}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-500">{helper}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const share = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-sm text-zinc-500">
          {value} • {share}%
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--crm-surface-3)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
