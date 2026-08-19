import { useMemo, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Package,
  Play,
  Sparkles,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useUpload } from "../../lib/useUpload";
import { buildDetouredPhotoFile } from "../../lib/backgroundRemoval";
import { formatPrice } from "../../lib/format";

type ArticleDoc = Doc<"articles"> & { imageUrls: string[] };

type RunState = {
  status: "queued" | "running" | "done" | "error";
  step?: string;
  error?: string;
  /** Ce que le run a produit — affiché à la fin pour vérification. */
  result?: {
    title: string;
    price: number;
    category: string;
    subcategory?: string;
    condition: string;
    detoured: boolean;
    priceRationale?: string;
  };
};

/**
 * « Nouveau run » : génération d'annonce IA et détourage des photos appliqués en
 * série à une liste d'articles cochés. Le traitement est séquentiel — l'analyse
 * IA et le modèle de détourage sont lourds, et cela garde une progression
 * lisible article par article.
 */
export function AiRunModal({
  open,
  articles,
  onClose,
  onOpenArticle,
}: {
  open: boolean;
  articles: ArticleDoc[];
  onClose: () => void;
  /** Ouvre la fiche d'un article traité, depuis le récapitulatif de fin de run. */
  onOpenArticle?: (articleId: string) => void;
}) {
  const analyzeImage = useAction(api.ai.analyzeArticleImage);
  const applyAiListing = useMutation(api.articles.applyAiListing);
  const upload = useUpload();

  // Les brouillons (créés par simple photo) sont la cible naturelle d'un run.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const drafts = articles.filter((a) => a.draft).map((a) => a._id as string);
    return new Set(drafts.length > 0 ? drafts : []);
  });
  const [generateListing, setGenerateListing] = useState(true);
  const [removeBackgrounds, setRemoveBackgrounds] = useState(true);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [states, setStates] = useState<Record<string, RunState>>({});
  const [error, setError] = useState("");

  const eligible = useMemo(
    () => articles.filter((a) => a.imageUrls.length > 0 || !generateListing),
    [articles, generateListing],
  );

  const selectedCount = selectedIds.size;

  function toggle(id: string) {
    if (running) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (running) return;
    setSelectedIds(new Set(eligible.map((a) => a._id as string)));
  }

  function selectNone() {
    if (running) return;
    setSelectedIds(new Set());
  }

  function selectDrafts() {
    if (running) return;
    setSelectedIds(new Set(articles.filter((a) => a.draft).map((a) => a._id as string)));
  }

  function setState(id: string, state: RunState) {
    setStates((prev) => ({ ...prev, [id]: state }));
  }

  async function runOne(article: ArticleDoc): Promise<RunState["result"]> {
    const id = article._id as string;

    let images: Id<"_storage">[] | undefined;
    if (removeBackgrounds && article.imageUrls.length > 0) {
      setState(id, { status: "running", step: "Détourage des photos…" });
      const processed: Id<"_storage">[] = [];
      for (let i = 0; i < article.imageUrls.length; i += 1) {
        const file = await buildDetouredPhotoFile(article.imageUrls[i], i);
        processed.push(await upload(file));
      }
      images = processed;
    }

    if (generateListing) {
      const coverStorageId = article.images[0];
      if (!coverStorageId) {
        throw new Error("Aucune photo à analyser.");
      }
      setState(id, { status: "running", step: "Génération de l'annonce…" });
      const result = await analyzeImage({ storageId: images?.[0] ?? coverStorageId });
      setState(id, { status: "running", step: "Enregistrement…" });
      await applyAiListing({
        id: article._id,
        title: result.title,
        description: result.description,
        price: result.price,
        // Prix barré = notre prix × 1,7 (nos prix sont à -70 % du prix barré).
        originalPrice: Math.round(result.price * 1.7),
        weightKg: article.weightKg ?? 0,
        category: result.category,
        subcategory: result.subcategory ?? undefined,
        condition: result.condition,
        keywords: result.keywords ?? undefined,
        themeKey: result.themeKey ?? undefined,
        images,
        status: result.recommendedSaleMode === "bundle" ? "attente" : "disponible",
      });
      return {
        title: result.title,
        price: result.price,
        category: result.category,
        subcategory: result.subcategory ?? undefined,
        condition: result.condition,
        detoured: images !== undefined,
        priceRationale: result.priceRationale,
      };
    } else if (images) {
      setState(id, { status: "running", step: "Enregistrement…" });
      await applyAiListing({
        id: article._id,
        title: article.title,
        description: article.description,
        price: article.price,
        originalPrice: article.originalPrice,
        weightKg: article.weightKg ?? 0,
        category: article.category,
        subcategory: article.subcategory,
        condition: article.condition,
        keywords: article.keywords,
        themeKey: article.themeKey,
        images,
      });
      return {
        title: article.title,
        price: article.price,
        category: article.category,
        subcategory: article.subcategory,
        condition: article.condition,
        detoured: true,
      };
    }
  }

  async function run() {
    if (selectedCount === 0) {
      setError("Cochez au moins un article.");
      return;
    }
    if (!generateListing && !removeBackgrounds) {
      setError("Choisissez au moins une opération à exécuter.");
      return;
    }
    setError("");
    setRunning(true);
    setFinished(false);
    const queue = articles.filter((a) => selectedIds.has(a._id as string));
    setStates(
      Object.fromEntries(queue.map((a) => [a._id as string, { status: "queued" } as RunState])),
    );

    for (const article of queue) {
      const id = article._id as string;
      try {
        const result = await runOne(article);
        setState(id, { status: "done", result });
      } catch (err) {
        setState(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Erreur inconnue.",
        });
      }
    }

    setRunning(false);
    setFinished(true);
  }

  const processed = useMemo(
    () => articles.filter((a) => states[a._id as string] !== undefined),
    [articles, states],
  );

  const doneCount = Object.values(states).filter((s) => s.status === "done").length;
  const errorCount = Object.values(states).filter((s) => s.status === "error").length;

  return (
    <Modal
      open={open}
      onClose={running ? () => {} : onClose}
      hideClose={running}
      title="Nouveau run — annonces IA et détourage"
      className="sm:max-w-3xl"
    >
      <div className="space-y-5 p-5">
        <p className="text-sm text-zinc-400">
          Cochez les articles à traiter. Chaque article sélectionné passe dans la
          génération d'annonce (titre, description, prix, catégorie) et/ou le
          détourage de ses photos.
        </p>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--crm-border)] px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={generateListing}
              disabled={running}
              onChange={(e) => setGenerateListing(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Générer l'annonce IA
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--crm-border)] px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={removeBackgrounds}
              disabled={running}
              onChange={(e) => setRemoveBackgrounds(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Détourer les photos
          </label>
        </div>

        <div className={`flex flex-wrap items-center gap-2 text-xs ${finished ? "hidden" : ""}`}>
          <span className="text-zinc-400">
            {selectedCount} article{selectedCount > 1 ? "s" : ""} sélectionné
            {selectedCount > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={selectDrafts}
            disabled={running}
            className="rounded-lg border border-[var(--crm-border)] px-2.5 py-1 text-zinc-300 hover:bg-[var(--crm-surface-2)] disabled:opacity-50"
          >
            Brouillons
          </button>
          <button
            type="button"
            onClick={selectAll}
            disabled={running}
            className="rounded-lg border border-[var(--crm-border)] px-2.5 py-1 text-zinc-300 hover:bg-[var(--crm-surface-2)] disabled:opacity-50"
          >
            Tout cocher
          </button>
          <button
            type="button"
            onClick={selectNone}
            disabled={running}
            className="rounded-lg border border-[var(--crm-border)] px-2.5 py-1 text-zinc-300 hover:bg-[var(--crm-surface-2)] disabled:opacity-50"
          >
            Tout décocher
          </button>
        </div>

        {finished ? (
          <div className="max-h-[45vh] space-y-1.5 overflow-y-auto rounded-xl border border-[var(--crm-border)] p-2">
            {processed.map((article) => (
              <RunResultRow
                key={article._id}
                article={article}
                state={states[article._id as string]}
                onOpen={
                  onOpenArticle
                    ? () => {
                        // La fiche article est elle-même une modale : on ferme
                        // le run avant de l'ouvrir.
                        onClose();
                        onOpenArticle(article._id as string);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
        <div className="max-h-[45vh] space-y-1.5 overflow-y-auto rounded-xl border border-[var(--crm-border)] p-2">
          {eligible.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Aucun article disponible pour un run.
            </p>
          ) : (
            eligible.map((article) => {
              const id = article._id as string;
              const state = states[id];
              const checked = selectedIds.has(id);
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition ${
                    checked ? "bg-[var(--crm-surface-2)]" : "hover:bg-[var(--crm-surface-2)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={running}
                    onChange={() => toggle(id)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--crm-surface-3)]">
                    {article.imageUrls[0] ? (
                      <img
                        src={article.imageUrls[0]}
                        alt={article.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-zinc-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="line-clamp-1 text-sm text-zinc-100">
                        {article.title}
                      </span>
                      {article.draft ? (
                        <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                          Brouillon
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {article.internalReference ?? "—"} · {formatPrice(article.price)}
                    </span>
                  </span>
                  <RunStateBadge state={state} />
                </label>
              );
            })
          )}
        </div>
        )}

        {running ? (
          <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Run en cours — laissez cette fenêtre ouverte jusqu'à la fin.
          </p>
        ) : null}

        {finished ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Check className="h-4 w-4" />
              {doneCount} réussi{doneCount > 1 ? "s" : ""}
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {errorCount} en erreur
              </span>
            )}
            <span className="text-zinc-400">
              Vérifiez ci-dessus ce que l'IA a produit avant publication.
            </span>
            {onOpenArticle && doneCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  const first = processed.find(
                    (a) => states[a._id as string]?.status === "done",
                  );
                  if (first) {
                    onClose();
                    onOpenArticle(first._id as string);
                  }
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                Ouvrir le premier
              </Button>
            )}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={running}>
            {finished ? "Fermer" : "Annuler"}
          </Button>
          <Button onClick={run} disabled={running || selectedCount === 0}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : finished ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running
              ? `Run en cours (${doneCount + errorCount}/${selectedCount})`
              : finished
                ? "Relancer"
                : `Lancer le run (${selectedCount})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Une ligne du récapitulatif de fin de run : ce que l'IA a produit pour cet
 * article (titre, prix, catégorie, état) ou l'erreur rencontrée, avec un accès
 * direct à la fiche pour corriger.
 */
function RunResultRow({
  article,
  state,
  onOpen,
}: {
  article: ArticleDoc;
  state?: RunState;
  onOpen?: () => void;
}) {
  const failed = state?.status === "error";
  const result = state?.result;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-2.5 py-2.5 ${
        failed
          ? "border-red-500/30 bg-red-500/5"
          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--crm-surface-3)]">
        {article.imageUrls[0] ? (
          <img
            src={article.imageUrls[0]}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-4 w-4 text-zinc-500" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1.5 text-sm">
          {failed ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          ) : (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          )}
          <span className="line-clamp-1 text-zinc-100">
            {result?.title ?? article.title}
          </span>
        </p>

        {failed ? (
          <p className="text-xs text-red-400">{state?.error ?? "Erreur inconnue."}</p>
        ) : result ? (
          <>
            <p className="text-xs text-zinc-400">
              {formatPrice(result.price)} · {result.category}
              {result.subcategory ? ` · ${result.subcategory}` : ""} ·{" "}
              {result.condition}
              {result.detoured ? " · photos détourées" : ""}
            </p>
            {result.priceRationale && (
              <p className="text-xs text-zinc-500">{result.priceRationale}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-500">
            {article.internalReference ?? "—"} · aucune modification.
          </p>
        )}
      </div>

      {onOpen && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onOpen}>
          <Eye className="h-3.5 w-3.5" />
          Détails
        </Button>
      )}
    </div>
  );
}

function RunStateBadge({ state }: { state?: RunState }) {
  if (!state) return null;
  if (state.status === "queued") {
    return <span className="shrink-0 text-xs text-zinc-500">En file</span>;
  }
  if (state.status === "running") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-brand-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {state.step ?? "En cours…"}
      </span>
    );
  }
  if (state.status === "done") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-400">
        <Check className="h-3.5 w-3.5" />
        Terminé
      </span>
    );
  }
  return (
    <span
      className="flex max-w-[40%] shrink-0 items-center gap-1 text-xs text-red-400"
      title={state.error}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="line-clamp-1">{state.error ?? "Erreur"}</span>
    </span>
  );
}
