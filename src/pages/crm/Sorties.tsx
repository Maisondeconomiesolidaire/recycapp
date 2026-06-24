import { useState, useMemo, useEffect, lazy, Suspense, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight, BarChart3, Weight, Check, Loader2, X, PackageMinus, ScanLine, Search, Package, RotateCcw,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ErrorBoundary } from "../../components/ErrorBoundary";

const CameraScanner = lazy(() =>
  import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

const EXIT_MOTIFS = ["Vente", "Don", "Déchèterie", "Recyclage / Filière", "Casse / Perte", "Autre"];

const ORIGIN_LABELS: Record<string, string> = {
  decheterie: "Déchèterie",
  domicile: "Rendez-vous",
  apport: "Apport volontaire",
  tournee: "Tournée",
};

const ORIENTATION_LABELS: Record<string, string> = {
  boutique: "Boutique",
  atelier: "Atelier",
  dons: "Dons",
  recyclage: "Recyclage",
  dechet: "Déchet",
};

type StatEntry = {
  label: string;
  count: number;
};

type ExitItem = {
  _id: Id<"arrivageItems">;
  reference: string;
  name: string;
  category: string;
  subcategory: string | null;
  weightKg: number | null;
  quantity: number;
  date: number;
};

export function Sorties() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ExitItem | null>(null);
  const [motif, setMotif] = useState(EXIT_MOTIFS[0]);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedRef, setScannedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);

  const recordExit = useMutation(api.arrivages.recordExit);
  const undoExit = useMutation(api.arrivages.undoExit);

  const results = useQuery(
    api.arrivages.searchItemsForExit,
    search.trim().length >= 2 && !selected ? { searchText: search.trim() } : "skip",
  );

  // Recherche par référence exacte (scan / saisie).
  const scanResult = useQuery(
    api.arrivages.getItemByReference,
    scannedRef ? { reference: scannedRef } : "skip",
  );

  useEffect(() => {
    if (scannedRef === null || scanResult === undefined) return;
    if (scanResult) {
      setSelected(scanResult as ExitItem);
      setSearch("");
      setNotFound(null);
    } else {
      setNotFound(`Aucun article arrivé (non sorti) ne correspond à « ${scannedRef} ».`);
    }
    setScannedRef(null);
  }, [scanResult, scannedRef]);

  const { start, end } = useMemo(() => {
    const now = Date.now();
    return { start: now - 365 * 86400000, end: now };
  }, []);
  const exits = useQuery(api.arrivages.listExits, { startDate: start, endDate: end });

  async function confirmExit() {
    if (!selected) return;
    setSaving(true);
    try {
      await recordExit({ itemId: selected._id, motif });
      setSelected(null);
      setMotif(EXIT_MOTIFS[0]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Sorties</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Nouvelle sortie</h1>
        <p className="mt-1 text-sm text-zinc-500">Scannez ou recherchez un article arrivé, puis indiquez la raison de sa sortie.</p>
      </div>

      <div className="space-y-5">
        {/* Compteurs */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<PackageMinus className="h-5 w-5" />} label="Articles sortis (12 mois)" value={String(exits?.totalArticles ?? "…")} color="text-rose-400" />
          <StatCard icon={<Weight className="h-5 w-5" />} label="Poids total sorti" value={exits ? `${exits.totalWeight} kg` : "…"} color="text-amber-400" />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Motif principal"
            value={topEntryLabel(exits?.byMotif, {})}
            color="text-sky-400"
          />
          <StatCard
            icon={<ArrowUpRight className="h-5 w-5" />}
            label="Destination principale"
            value={topEntryLabel(exits?.byOrientation, ORIENTATION_LABELS)}
            color="text-emerald-400"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <DistributionPanel
            title="Motifs de sortie"
            entries={exits?.byMotif}
            labels={{}}
            accent="bg-rose-500"
          />
          <DistributionPanel
            title="Destinations d'origine"
            entries={exits?.byOrientation}
            labels={ORIENTATION_LABELS}
            accent="bg-emerald-500"
          />
          <DistributionPanel
            title="Provenances"
            entries={exits?.byOrigin}
            labels={ORIGIN_LABELS}
            accent="bg-sky-500"
          />
          <DistributionPanel
            title="Catégories sorties"
            entries={exits?.byCategory}
            labels={{}}
            accent="bg-amber-500"
          />
        </div>

        {/* Recherche / scan */}
        {!selected && (
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setNotFound(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) setScannedRef(search.trim()); }}
                  placeholder="Code-barres, référence ou nom de l'article arrivé…"
                  className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--crm-border)] px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-[var(--crm-surface-2)]"
              >
                <ScanLine className="h-4 w-4" />
                Scanner
              </button>
            </div>

            {notFound && <p className="text-sm text-amber-400">{notFound}</p>}

            {results && results.length > 0 && (
              <div className="divide-y divide-[var(--crm-border)] overflow-hidden rounded-lg border border-[var(--crm-border)]">
                {results.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => { setSelected(r as ExitItem); setSearch(""); setNotFound(null); }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--crm-surface-2)]"
                  >
                    <Package className="h-4 w-4 shrink-0 text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        Réf. {r.reference}
                        {r.weightKg != null && ` · ${r.weightKg} kg`}
                        {r.quantity > 1 && ` · ×${r.quantity}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results && results.length === 0 && search.trim().length >= 2 && (
              <p className="text-sm text-zinc-500">Aucun article arrivé (non sorti) trouvé.</p>
            )}
          </div>
        )}

        {/* Article sélectionné → raison → confirmer */}
        {selected && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-100">{selected.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Réf. {selected.reference}
                  {selected.weightKg != null && ` · ${selected.weightKg} kg`}
                  {selected.quantity > 1 && ` · ×${selected.quantity}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
                aria-label="Changer d'article"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Raison de la sortie</label>
              <div className="flex flex-wrap gap-1.5">
                {EXIT_MOTIFS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotif(m)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ring-1 ${
                      motif === m ? "bg-brand-500 text-white ring-transparent" : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={confirmExit}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer la sortie
            </button>
          </div>
        )}

        {/* Sorties récentes */}
        {exits && exits.recent.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
            <p className="border-b border-[var(--crm-border)] px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Sorties récentes
            </p>
            <div className="divide-y divide-[var(--crm-border)]">
              {exits.recent.map((e) => (
                <div key={e._id} className="flex items-center gap-3 px-4 py-2.5">
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{e.name}</p>
                    <p className="text-xs text-zinc-500">
                      {e.motif} · Réf. {e.reference}
                      {e.weightKg != null && ` · ${e.weightKg} kg`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {new Date(e.exitedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => undoExit({ itemId: e._id })}
                    title="Annuler la sortie"
                    className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scanner caméra */}
      {scanOpen && (
        <ErrorBoundary
          fallback={() => (
            <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
              <ScanLine className="h-9 w-9 text-zinc-500" />
              <p className="max-w-xs text-sm text-zinc-200">Le scanner n'a pas pu démarrer. Rechargez la page puis réessayez.</p>
              <button type="button" onClick={() => setScanOpen(false)} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300">
                Fermer
              </button>
            </div>
          )}
        >
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
              </div>
            }
          >
            <CameraScanner
              onDetected={(code) => { setScannedRef(code.trim()); setScanOpen(false); }}
              onClose={() => setScanOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--crm-surface-2)] ${color}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="truncate text-lg font-bold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function DistributionPanel({
  title,
  entries,
  labels,
  accent,
}: {
  title: string;
  entries?: StatEntry[];
  labels: Record<string, string>;
  accent: string;
}) {
  const total = entries?.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const visibleEntries = entries?.slice(0, 5) ?? [];

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <span className="text-xs text-zinc-500">{total} objet{total > 1 ? "s" : ""}</span>
      </div>
      {visibleEntries.length === 0 ? (
        <p className="text-xs text-zinc-500">Aucune donnée disponible pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const percent = total > 0 ? Math.round((entry.count / total) * 100) : 0;
            return (
              <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-zinc-300">{labels[entry.label] ?? entry.label}</span>
                  <span className="shrink-0 text-zinc-500">{entry.count} · {percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--crm-surface-2)]">
                  <div className={`h-full rounded-full ${accent}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function topEntryLabel(entries: StatEntry[] | undefined, labels: Record<string, string>) {
  if (!entries || entries.length === 0) return "…";
  const top = [...entries].sort((a, b) => b.count - a.count)[0];
  return labels[top.label] ?? top.label;
}
