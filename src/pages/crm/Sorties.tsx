import { useState, useMemo, useEffect, lazy, Suspense, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight, BarChart3, Weight, Check, Loader2, X, PackageMinus, ScanLine, Search, Package, RotateCcw,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { WeightField } from "../../components/crm/WeightField";
import {
  WizardShell,
  WizardStepIntro,
  WizardOption,
  SummaryPill,
  type SlideDirection,
} from "../../components/crm/Wizard";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { COLLECTE_CATEGORIES } from "../../lib/constants";

const CameraScanner = lazy(() =>
  import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

const EXIT_MOTIFS = ["Vente", "Don", "Déchèterie", "Recyclage / Filière", "Casse / Perte", "Autre"];

const ORIGINS = [
  { key: "decheterie", label: "Déchèterie" },
  { key: "domicile", label: "Rendez-vous" },
  { key: "apport", label: "Apport volontaire" },
  { key: "tournee", label: "Tournée" },
] as const;

const ORIENTATIONS = [
  { key: "boutique", label: "Boutique" },
  { key: "atelier", label: "Atelier" },
  { key: "dons", label: "Dons" },
  { key: "recyclage", label: "Recyclage" },
  { key: "dechet", label: "Déchet" },
] as const;

const FLOW_CATEGORIES = COLLECTE_CATEGORIES.map((c) => ({
  key: c.label,
  image: c.image,
}));

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
  const [tab, setTab] = useState<"new" | "history" | "stats">("new");
  const [exitMode, setExitMode] = useState<"individual" | "flow">("individual");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ExitItem | null>(null);
  const [motif, setMotif] = useState(EXIT_MOTIFS[0]);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedRef, setScannedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [flowOrigin, setFlowOrigin] = useState("apport");
  const [flowCategory, setFlowCategory] = useState("");
  const [flowOrientation, setFlowOrientation] = useState("recyclage");
  const [flowWeightKg, setFlowWeightKg] = useState("");
  const [flowMotif, setFlowMotif] = useState("Recyclage / Filière");
  const [flowNote, setFlowNote] = useState("");

  const recordExit = useMutation(api.arrivages.recordExit);
  const recordFlowExit = useMutation(api.arrivages.recordFlowExit);
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

  async function confirmFlowExit() {
    if (!flowCategory || !flowOrientation || !flowOrigin || !(parseFloat(flowWeightKg) > 0)) return;
    setSaving(true);
    try {
      await recordFlowExit({
        date: Date.now(),
        origin: flowOrigin as "decheterie" | "domicile" | "apport" | "tournee",
        category: flowCategory,
        weightKg: parseFloat(flowWeightKg),
        motif: flowMotif,
        orientation: flowOrientation,
        note: flowNote || undefined,
      });
      setFlowCategory("");
      setFlowWeightKg("");
      setFlowNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Collecte</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Sorties</h1>
        <p className="mt-1 text-sm text-zinc-500">Enregistrez les sorties d'articles et de flux, consultez l'historique et les statistiques.</p>
      </div>

      <UnderlineTabs
        className="mb-6"
        items={[
          { key: "new", label: "Nouvelle sortie" },
          { key: "history", label: "Dernières sorties" },
          { key: "stats", label: "Statistiques" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "new" && (
        <div className="space-y-5">
          <div className="flex w-fit rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-1">
            <ModeTab active={exitMode === "individual"} onClick={() => setExitMode("individual")}>
              Sortie individuelle
            </ModeTab>
            <ModeTab active={exitMode === "flow"} onClick={() => setExitMode("flow")}>
              Sortie de flux
            </ModeTab>
          </div>

          {exitMode === "flow" && (
            <FlowExitForm
              origin={flowOrigin}
              setOrigin={setFlowOrigin}
              category={flowCategory}
              setCategory={setFlowCategory}
              orientation={flowOrientation}
              setOrientation={setFlowOrientation}
              weightKg={flowWeightKg}
              setWeightKg={setFlowWeightKg}
              motif={flowMotif}
              setMotif={setFlowMotif}
              note={flowNote}
              setNote={setFlowNote}
              saving={saving}
              onSubmit={confirmFlowExit}
            />
          )}

          {/* Recherche / scan */}
          {exitMode === "individual" && !selected && (
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
          {exitMode === "individual" && selected && (
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
        </div>
      )}

      {/* Dernières sorties */}
      {tab === "history" && (
        <div className="overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
          {!exits || exits.recent.length === 0 ? (
            <p className="px-4 py-5 text-xs text-zinc-500">Aucune sortie enregistrée pour le moment.</p>
          ) : (
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
          )}
        </div>
      )}

      {/* Statistiques */}
      {tab === "stats" && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<PackageMinus className="h-5 w-5" />} label="Articles sortis (12 mois)" value={String(exits?.totalArticles ?? "…")} />
            <StatCard icon={<Weight className="h-5 w-5" />} label="Poids total sorti" value={exits ? `${exits.totalWeight} kg` : "…"} />
            <StatCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Motif principal"
              value={topEntryLabel(exits?.byMotif, {})}
            />
            <StatCard
              icon={<ArrowUpRight className="h-5 w-5" />}
              label="Destination principale"
              value={topEntryLabel(exits?.byOrientation, ORIENTATION_LABELS)}
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
        </div>
      )}

      {/* Scanner caméra */}
      {scanOpen && (
        <ErrorBoundary
          fallback={() => (
            <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
              <ScanLine className="h-9 w-9 text-zinc-500" />
              <p className="max-w-xs text-sm text-zinc-200">Le scanner n'a pas pu démarrer. Rechargez la page puis réessayez.</p>
              <button type="button" onClick={() => setScanOpen(false)} className="rounded-xl border border-[var(--crm-border-strong)] px-4 py-2.5 text-sm font-semibold text-zinc-300">
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

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--crm-surface-2)] text-black dark:text-white">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="truncate text-lg font-bold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function FlowExitForm({
  origin,
  setOrigin,
  category,
  setCategory,
  orientation,
  setOrientation,
  weightKg,
  setWeightKg,
  motif,
  setMotif,
  note,
  setNote,
  saving,
  onSubmit,
}: {
  origin: string;
  setOrigin: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  orientation: string;
  setOrientation: (value: string) => void;
  weightKg: string;
  setWeightKg: (value: string) => void;
  motif: string;
  setMotif: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  saving: boolean;
  onSubmit: () => Promise<void> | void;
}) {
  const steps = ["poids", "provenance", "flux", "destination", "motif", "note"];
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("forward");
  const current = steps[stepIndex];
  const canSubmit = Boolean(origin && category && orientation && motif && parseFloat(weightKg) > 0) && !saving;

  function go(index: number, dir: SlideDirection) {
    setDirection(dir);
    setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
  }
  const next = () => go(stepIndex + 1, "forward");
  const back = () => go(stepIndex - 1, "back");

  const titles: Record<string, string> = {
    poids: "Pesée", provenance: "Provenance", flux: "Flux", destination: "Destination", motif: "Motif", note: "Note",
  };

  return (
    <WizardShell eyebrow="Sortie de flux" title={titles[current]} stepIndex={stepIndex} stepCount={steps.length} direction={direction} onBack={back}>
      {current === "poids" && (
        <WizardStepIntro eyebrow="Étape 1" title="Pesez le flux" helper="Indiquez le poids sorti, puis continuez.">
          <WeightField value={weightKg} onChange={setWeightKg} placeholder="50" autoFocus />
          <button
            type="button"
            onClick={next}
            disabled={!(parseFloat(weightKg) > 0)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(241,16,79,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            Continuer
          </button>
        </WizardStepIntro>
      )}
      {current === "provenance" && (
        <WizardStepIntro eyebrow="Étape 2" title="Provenance d'origine" helper="D'où provenait ce flux ?">
          <div className="grid gap-3 sm:grid-cols-2">
            {ORIGINS.map((o) => (
              <WizardOption key={o.key} selected={origin === o.key} title={o.label} onClick={() => { setOrigin(o.key); next(); }} />
            ))}
          </div>
        </WizardStepIntro>
      )}
      {current === "flux" && (
        <WizardStepIntro eyebrow="Étape 3" title="Quel flux ?" helper="Sélectionnez la famille évacuée.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FLOW_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { setCategory(c.key); next(); }}
                className={`group flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${
                  category === c.key
                    ? "border-brand-500/60 bg-brand-500/15 text-brand-300 shadow-[0_14px_32px_rgba(241,16,79,0.16)]"
                    : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/35 hover:text-zinc-100"
                }`}
              >
                <img src={c.image} alt="" className="h-14 w-14 object-contain transition group-hover:scale-105" />
                <span className="text-sm font-bold leading-tight">{c.key}</span>
              </button>
            ))}
          </div>
        </WizardStepIntro>
      )}
      {current === "destination" && (
        <WizardStepIntro eyebrow="Étape 4" title="Quelle destination ?" helper="Où part ce flux ?">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ORIENTATIONS.map((o) => (
              <WizardOption key={o.key} selected={orientation === o.key} title={o.label} onClick={() => { setOrientation(o.key); next(); }} />
            ))}
          </div>
        </WizardStepIntro>
      )}
      {current === "motif" && (
        <WizardStepIntro eyebrow="Étape 5" title="Motif de sortie" helper="Pourquoi ce flux sort-il ?">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EXIT_MOTIFS.map((m) => (
              <WizardOption key={m} selected={motif === m} title={m} onClick={() => { setMotif(m); next(); }} />
            ))}
          </div>
        </WizardStepIntro>
      )}
      {current === "note" && (
        <WizardStepIntro eyebrow="Dernière étape" title="Note & validation" helper="Ajoutez une note si besoin, puis enregistrez la sortie.">
          <div className="mb-5 flex flex-wrap gap-2">
            <SummaryPill label="Poids" value={weightKg ? `${weightKg} kg` : "—"} />
            <SummaryPill label="Provenance" value={ORIGIN_LABELS[origin] ?? origin} />
            <SummaryPill label="Flux" value={category} />
            <SummaryPill label="Destination" value={ORIENTATION_LABELS[orientation] ?? orientation} />
            <SummaryPill label="Motif" value={motif} />
          </div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex : enlèvement filière papier, textile trié, roll déchèterie..."
            className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer la sortie de flux
          </button>
        </WizardStepIntro>
      )}
    </WizardShell>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-brand-500 text-white" : "text-zinc-500 hover:bg-[var(--crm-surface-2)] hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
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
