import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight, Weight, Plus, Check, Loader2,
  Globe, Recycle, X, PackageMinus, ScanLine, Search, Package, RotateCcw,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { ErrorBoundary } from "../../components/ErrorBoundary";

const CameraScanner = lazy(() =>
  import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

const EXIT_MOTIFS = ["Vente", "Don", "Déchèterie", "Recyclage / Filière", "Casse / Perte", "Autre"];

type Tab = "articles" | "hors_magasin" | "matieres";

const CHANNELS = [
  { key: "leboncoin" as const, label: "Le Bon Coin", color: "text-orange-400" },
  { key: "ebay" as const, label: "eBay", color: "text-blue-400" },
  { key: "vinted" as const, label: "Vinted", color: "text-teal-400" },
  { key: "instagram" as const, label: "Instagram", color: "text-pink-400" },
  { key: "facebook" as const, label: "Facebook", color: "text-blue-500" },
  { key: "depot_vente" as const, label: "Dépôt-vente", color: "text-violet-400" },
  { key: "commande" as const, label: "Commande", color: "text-amber-400" },
  { key: "autre" as const, label: "Autre", color: "text-zinc-400" },
];

const MATERIAL_TYPES = [
  "Feraille / Métaux", "Textile", "Bois", "Papier / Carton",
  "Plastique", "Verre", "DEEE", "DEA", "Tout Venant", "Autre",
];

export function Sorties() {
  const [tab, setTab] = useState<Tab>("articles");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">GDR Sorties</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Sorties de stock</h1>
        <p className="mt-1 text-sm text-zinc-500">Enregistrez les ventes hors boutique et les évacuations de matières vers les filières de recyclage.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--crm-surface)] p-1 w-fit">
        {[
          { key: "articles" as Tab, label: "Sortie d'article", icon: PackageMinus },
          { key: "hors_magasin" as Tab, label: "Ventes hors boutique", icon: Globe },
          { key: "matieres" as Tab, label: "Évacuation matières", icon: Recycle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-[var(--crm-surface-2)] text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "articles" && <SortieArticleTab />}
      {tab === "hors_magasin" && <HorsMagasinTab />}
      {tab === "matieres" && <MatieresTab />}
    </div>
  );
}

// ─── Sortie d'article (article arrivé non sorti) ───────────────────────────────

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

function SortieArticleTab() {
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

  // Recherche par référence exacte (scan / saisie) — requête à la demande.
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
    <div className="space-y-5">
      {/* Compteurs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={<PackageMinus className="h-5 w-5" />}
          label="Articles sortis (12 mois)"
          value={String(exits?.totalArticles ?? "…")}
          color="text-rose-400"
        />
        <StatCard
          icon={<Weight className="h-5 w-5" />}
          label="Poids total sorti"
          value={exits ? `${exits.totalWeight} kg` : "…"}
          color="text-amber-400"
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setNotFound(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) setScannedRef(search.trim());
                }}
                placeholder="Référence, nom ou catégorie de l'article arrivé…"
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
                  onClick={() => {
                    setSelected(r as ExitItem);
                    setSearch("");
                    setNotFound(null);
                  }}
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

      {/* Article sélectionné → motif → confirmer */}
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
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Motif de sortie
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXIT_MOTIFS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ring-1 ${
                    motif === m
                      ? "bg-brand-500 text-white ring-transparent"
                      : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
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
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] overflow-hidden">
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

      {/* Scanner caméra */}
      {scanOpen && (
        <ErrorBoundary
          fallback={() => (
            <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
              <ScanLine className="h-9 w-9 text-zinc-500" />
              <p className="max-w-xs text-sm text-zinc-200">
                Le scanner n'a pas pu démarrer. Rechargez la page puis réessayez.
              </p>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300"
              >
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
              onDetected={(code) => {
                setScannedRef(code.trim());
                setScanOpen(false);
              }}
              onClose={() => setScanOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

// ─── Hors Magasin ─────────────────────────────────────────────────────────────

function HorsMagasinTab() {
  const [showForm, setShowForm] = useState(false);
  const [range, setRange] = useState<"7j" | "30j">("30j");
  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    return { startDate: now - (range === "7j" ? 7 : 30) * 86400000, endDate: now };
  }, [range]);

  const sorties = useQuery(api.sorties.listSortiesHorsMagasin, { startDate, endDate });
  const stats = useQuery(api.sorties.sortiesStats, { startDate, endDate });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90">
          <Plus className="h-4 w-4" />
          Enregistrer une vente
        </button>
        {(["7j", "30j"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r ? "bg-[var(--crm-surface-2)] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
            {r === "7j" ? "7j" : "30j"}
          </button>
        ))}
      </div>

      {showForm && <HorsMagasinForm onClose={() => setShowForm(false)} />}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Sorties</p>
            <p className="mt-0.5 text-xl font-bold text-zinc-100">{stats.hmCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Recettes</p>
            <p className="mt-0.5 text-xl font-bold text-emerald-400">{formatPrice(stats.hmRevenue)}</p>
          </div>
        </div>
      )}

      {sorties === undefined ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : sorties.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune sortie hors magasin sur cette période.</p>
      ) : (
        <div className="space-y-2">
          {sorties.map((s) => {
            const ch = CHANNELS.find((c) => c.key === s.channel);
            return (
              <div key={s._id} className="flex items-center gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4">
                <ArrowUpRight className={`h-5 w-5 shrink-0 ${ch?.color ?? "text-zinc-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{s.articleTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {ch?.label} · {new Date(s.date).toLocaleDateString("fr-FR")}
                    {s.buyerName && ` · ${s.buyerName}`}
                  </p>
                </div>
                <p className="text-base font-bold text-zinc-100 shrink-0">{formatPrice(s.price)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HorsMagasinForm({ onClose }: { onClose: () => void }) {
  const [articleTitle, setArticleTitle] = useState("");
  const [price, setPrice] = useState("");
  const [channel, setChannel] = useState<typeof CHANNELS[number]["key"]>("leboncoin");
  const [buyerName, setBuyerName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.sorties.createSortieHorsMagasin);

  async function handleSave() {
    if (!articleTitle || !price) return;
    setSaving(true);
    try {
      await create({ articleTitle, price: parseFloat(price), channel, buyerName: buyerName || undefined, notes: notes || undefined, date: Date.now() });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Vente hors boutique</h3>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Article</label>
          <input type="text" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Titre de l'article"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Prix (€)</label>
          <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Acheteur</label>
          <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nom de l'acheteur"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-2">Canal</label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button key={c.key} type="button" onClick={() => setChannel(c.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ring-1 ${channel === c.key ? "bg-brand-500 text-white ring-transparent" : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes…"
        className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
      <button type="button" onClick={handleSave} disabled={!articleTitle || !price || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

// ─── Matières ─────────────────────────────────────────────────────────────────

function MatieresTab() {
  const [showForm, setShowForm] = useState(false);
  const [range, setRange] = useState<"7j" | "30j">("30j");
  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    return { startDate: now - (range === "7j" ? 7 : 30) * 86400000, endDate: now };
  }, [range]);

  const sorties = useQuery(api.sorties.listSortiesMatieres, { startDate, endDate });
  const stats = useQuery(api.sorties.sortiesStats, { startDate, endDate });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90">
          <Plus className="h-4 w-4" />
          Enregistrer une évacuation
        </button>
        {(["7j", "30j"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r ? "bg-[var(--crm-surface-2)] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
            {r === "7j" ? "7j" : "30j"}
          </button>
        ))}
      </div>

      {showForm && <MatiereForm onClose={() => setShowForm(false)} />}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Sorties matières</p>
            <p className="mt-0.5 text-xl font-bold text-zinc-100">{stats.matCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Poids total</p>
            <p className="mt-0.5 text-xl font-bold text-amber-400">{stats.matWeight} kg</p>
          </div>
        </div>
      )}

      {sorties === undefined ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : sorties.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune sortie matière sur cette période.</p>
      ) : (
        <div className="space-y-2">
          {sorties.map((s) => (
            <div key={s._id} className="flex items-center gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4">
              <Recycle className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100">{s.materialType}</p>
                <p className="text-xs text-zinc-500">
                  {s.destination} · {new Date(s.date).toLocaleDateString("fr-FR")}
                  {s.documentNumber && ` · réf. ${s.documentNumber}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Weight className="h-4 w-4 text-zinc-500" />
                <span className="text-base font-bold text-zinc-100">{s.weightKg} kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatiereForm({ onClose }: { onClose: () => void }) {
  const [materialType, setMaterialType] = useState(MATERIAL_TYPES[0]);
  const [weightKg, setWeightKg] = useState("");
  const [destination, setDestination] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.sorties.createSortieMatiere);

  async function handleSave() {
    if (!weightKg || !destination) return;
    setSaving(true);
    try {
      await create({ materialType, weightKg: parseFloat(weightKg), destination, documentNumber: documentNumber || undefined, notes: notes || undefined, date: Date.now() });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-4 max-w-xl">
      <h3 className="text-sm font-semibold text-zinc-200">Nouvelle sortie matière</h3>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-2">Type de matière</label>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_TYPES.map((m) => (
            <button key={m} type="button" onClick={() => setMaterialType(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ring-1 ${materialType === m ? "bg-brand-500 text-white ring-transparent" : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Poids (kg)</label>
          <input type="number" min="0" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.0"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">N° bon d'enlèvement</label>
          <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Optionnel"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Destination (prestataire)</label>
        <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Veolia, Ecologic…"
          className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes…"
        className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
      <button type="button" onClick={handleSave} disabled={!weightKg || !destination || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--crm-surface-2)] ${color}`}>
        {icon}
      </span>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-lg font-bold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}
