import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Box,
  Loader2,
  Package,
  Plus,
  QrCode as QrCodeIcon,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { EmptyState } from "../ui/EmptyState";
import { Field, Input } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { QrCode } from "../ui/QrCode";
import { FullSpinner } from "../ui/Spinner";
import { PrintLabels } from "./PrintLabels";
import { formatPrice } from "../../lib/format";
import { articleLabelReference, caisseLabelCaption } from "../../lib/labels";

const CameraScanner = lazy(() =>
  import("../ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

type CaisseSummary = {
  _id: Id<"caisses">;
  code: string;
  label?: string;
  zone?: string;
  notes?: string;
  counts: { total: number; remaining: number };
};

/**
 * Onglet « Caisses » du stock articles.
 *
 * Chaque caisse porte un QR code (son code `CA-xxxx`). On la crée ici, on
 * imprime son étiquette, et un clic — ou un scan — ouvre son contenu.
 */
export function CaissesPanel({
  canCreate,
  canDelete,
  canPrint,
  /** Code de caisse à ouvrir d'emblée (scan venu de la barre d'outils). */
  openCode,
  onOpenCodeHandled,
  onOpenArticle,
}: {
  canCreate: boolean;
  canDelete: boolean;
  canPrint: boolean;
  openCode?: string | null;
  onOpenCodeHandled?: () => void;
  onOpenArticle?: (articleId: string) => void;
}) {
  const caisses = useQuery(api.caisses.list, {});
  const createCaisse = useMutation(api.caisses.create);
  const removeCaisse = useMutation(api.caisses.remove);

  const [search, setSearch] = useState("");
  // Par défaut on ne montre que les caisses qui contiennent encore des
  // objets : ce sont les seules à aller chercher en réserve.
  const [onlyFilled, setOnlyFilled] = useState(true);
  const [openId, setOpenId] = useState<Id<"caisses"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newZone, setNewZone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [printItems, setPrintItems] = useState<CaisseSummary[] | null>(null);
  const [deleting, setDeleting] = useState<CaisseSummary | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState("");

  // Une caisse scannée depuis la barre d'outils s'ouvre dès que la liste la
  // contient (la requête peut arriver après le scan).
  useEffect(() => {
    if (!openCode || !caisses) return;
    const found = caisses.find((c) => c.code === openCode);
    if (found) {
      setOpenId(found._id);
      setScanError("");
    } else {
      setScanError(`Aucune caisse ne correspond au code « ${openCode} ».`);
    }
    onOpenCodeHandled?.();
  }, [openCode, caisses, onOpenCodeHandled]);

  // Un article vendu a quitté la caisse : c'est `remaining` qui dit si elle
  // contient encore quelque chose.
  const filledCount = useMemo(
    () => (caisses ?? []).filter((caisse) => caisse.counts.remaining > 0).length,
    [caisses],
  );

  const filtered = useMemo(() => {
    if (!caisses) return [];
    const needle = search.trim().toLowerCase();
    return caisses.filter((caisse) => {
      if (onlyFilled && caisse.counts.remaining === 0) return false;
      if (!needle) return true;
      return [caisse.code, caisse.label, caisse.zone]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [caisses, search, onlyFilled]);

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      const id = await createCaisse({
        label: newLabel.trim() || undefined,
        zone: newZone.trim() || undefined,
      });
      setCreating(false);
      setNewLabel("");
      setNewZone("");
      // Une caisse neuve est vide : sans ça elle disparaîtrait du filtre.
      setOnlyFilled(false);
      // On enchaîne directement sur le contenu de la caisse : son QR code y est
      // affiché, prêt à imprimer et à coller.
      setOpenId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  function handleScannedCode(code: string) {
    setScanOpen(false);
    const normalized = code.trim().toUpperCase();
    const found = (caisses ?? []).find((c) => c.code === normalized);
    if (found) {
      setScanError("");
      setOpenId(found._id);
    } else {
      setScanError(`Aucune caisse ne correspond au code « ${normalized} ».`);
    }
  }

  if (caisses === undefined) {
    return (
      <div className="pt-6">
        <FullSpinner label="Chargement des caisses…" />
      </div>
    );
  }

  return (
    <div className="pt-6">
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une caisse (code, nom, zone)…"
            className="pl-9 dark:bg-[var(--crm-surface)]"
          />
        </div>
        <div className="inline-flex shrink-0 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-1">
          {(
            [
              { value: true, label: "Avec objets", count: filledCount },
              { value: false, label: "Toutes", count: caisses?.length ?? 0 },
            ] as const
          ).map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => setOnlyFilled(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                onlyFilled === option.value
                  ? "bg-brand-500 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Scanner une caisse</span>
        </Button>
        {canPrint && caisses.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setPrintItems(filtered.length > 0 ? filtered : caisses)}
          >
            <QrCodeIcon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">QR codes ({filtered.length})</span>
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Nouvelle caisse</span>
          </Button>
        )}
      </div>

      {scanError && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {scanError}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Box className="h-10 w-10" />}
          title={
            caisses.length === 0
              ? "Aucune caisse"
              : onlyFilled && filledCount === 0
                ? "Aucune caisse remplie"
                : "Aucun résultat"
          }
          description={
            caisses.length === 0
              ? "Créez une première caisse : son QR code sera généré et prêt à imprimer."
              : onlyFilled && filledCount === 0
                ? "Aucune caisse ne contient d'objet pour le moment. Affichez « Toutes » pour voir les caisses vides."
                : "Aucune caisse ne correspond à cette recherche."
          }
          action={
            canCreate && caisses.length === 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle caisse
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((caisse) => (
            <button
              key={caisse._id}
              type="button"
              onClick={() => setOpenId(caisse._id)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 text-left transition hover:border-brand-500/50 hover:bg-[var(--crm-surface-3)]"
            >
              <span className="shrink-0 rounded-xl bg-white p-2">
                <QrCode value={caisse.code} size={56} className="text-black" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm font-bold text-zinc-100">
                  {caisse.code}
                </span>
                <span className="block truncate text-sm text-zinc-300">
                  {caisse.label ?? "Sans nom"}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {caisse.counts.remaining} article
                  {caisse.counts.remaining > 1 ? "s" : ""}
                  {caisse.zone ? ` · ${caisse.zone}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <CaisseContents
        caisseId={openId}
        canDelete={canDelete}
        canPrint={canPrint}
        onClose={() => setOpenId(null)}
        onPrint={(caisse) => setPrintItems([caisse])}
        onDelete={(caisse) => setDeleting(caisse)}
        onOpenArticle={onOpenArticle}
      />

      <Modal
        open={creating}
        onClose={() => (saving ? undefined : setCreating(false))}
        title="Nouvelle caisse"
        className="sm:max-w-md"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-400">
            Le code et le QR code sont générés automatiquement. Vous pourrez
            l'imprimer et le coller sur la caisse dès la création.
          </p>
          <Field label="Nom de la caisse" hint="Facultatif, ex. « Vaisselle réserve »">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Vaisselle réserve"
            />
          </Field>
          <Field label="Zone" hint="Facultatif, ex. « Réserve », « Boutique »">
            <Input
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="Réserve"
            />
          </Field>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer la caisse
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await removeCaisse({ id: deleting._id });
            setOpenId(null);
            setDeleting(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Suppression impossible.");
            setDeleting(null);
          }
        }}
        title="Supprimer cette caisse ?"
        description={
          deleting
            ? `La caisse ${deleting.code} sera supprimée. Son QR code ne renverra plus rien.`
            : undefined
        }
        confirmLabel="Supprimer"
      />

      {printItems && (
        <PrintLabels
          items={printItems.map((caisse) => ({
            id: caisse._id,
            reference: caisse.code,
            caption: caisseLabelCaption(caisse.code),
          }))}
          title="QR codes caisses"
          onClose={() => setPrintItems(null)}
        />
      )}

      {scanOpen && (
        <div className="fixed inset-0 z-[300] bg-black">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            }
          >
            <CameraScanner
              onDetected={handleScannedCode}
              onClose={() => setScanOpen(false)}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

/** Contenu d'une caisse : son QR code et la liste des articles rangés dedans. */
function CaisseContents({
  caisseId,
  canDelete,
  canPrint,
  onClose,
  onPrint,
  onDelete,
  onOpenArticle,
}: {
  caisseId: Id<"caisses"> | null;
  canDelete: boolean;
  canPrint: boolean;
  onClose: () => void;
  onPrint: (caisse: CaisseSummary) => void;
  onDelete: (caisse: CaisseSummary) => void;
  onOpenArticle?: (articleId: string) => void;
}) {
  const data = useQuery(api.caisses.get, caisseId ? { id: caisseId } : "skip");
  const assignArticle = useMutation(api.caisses.assignArticle);

  const caisse = data?.caisse;
  const articles = data?.articles ?? [];
  const remaining = articles.filter((a) => a.status !== "vendu");

  const summary: CaisseSummary | null = caisse
    ? {
        _id: caisse._id,
        code: caisse.code,
        label: caisse.label,
        zone: caisse.zone,
        notes: caisse.notes,
        counts: { total: articles.length, remaining: remaining.length },
      }
    : null;

  return (
    <Drawer
      open={caisseId !== null}
      onClose={onClose}
      variant="modal"
      title={caisse ? `Caisse ${caisse.code}` : "Caisse"}
    >
      {data === undefined ? (
        <FullSpinner label="Chargement…" />
      ) : !caisse || !summary ? (
        <p className="p-6 text-sm text-zinc-400">Caisse introuvable.</p>
      ) : (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
            <span className="rounded-xl bg-white p-3">
              <QrCode value={caisse.code} size={104} className="text-black" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-lg font-bold text-zinc-100">{caisse.code}</p>
              <p className="text-sm text-zinc-300">{caisse.label ?? "Sans nom"}</p>
              {caisse.zone && <p className="text-xs text-zinc-500">Zone : {caisse.zone}</p>}
              <p className="mt-1 text-xs text-zinc-500">
                {remaining.length} article{remaining.length > 1 ? "s" : ""} à l'intérieur
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canPrint && (
                <Button variant="outline" onClick={() => onPrint(summary)}>
                  <QrCodeIcon className="h-4 w-4" />
                  Imprimer le QR
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" onClick={() => onDelete(summary)}>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>

          {articles.length === 0 ? (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="Caisse vide"
              description="Scannez ce QR code à l'ajout d'un article pour le ranger ici."
            />
          ) : (
            <ul className="space-y-2">
              {articles.map((article) => (
                <li
                  key={article._id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-2.5"
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
                  <button
                    type="button"
                    onClick={() => onOpenArticle?.(article._id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="line-clamp-1 text-sm font-medium text-zinc-100">
                      {article.title}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {articleLabelReference(article)} · {formatPrice(article.price)} ·{" "}
                      {article.status}
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Sortir de la caisse"
                    onClick={() =>
                      assignArticle({ articleId: article._id, caisseId: null })
                    }
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}
