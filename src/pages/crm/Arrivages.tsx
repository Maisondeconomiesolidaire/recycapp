import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  PackagePlus,
  Layers,
  Box,
  Scissors,
  BarChart3,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  ArrowRight,
  TrendingUp,
  Weight,
  Euro,
  Package,
  Store,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { COLLECTE_CATEGORIES, COLLECTE_SUBCATEGORIES } from "../../lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

// Catégories = nos 12 catégories principales (pictogrammes icônes collecte),
// avec leurs sous-catégories curées. Clé d'affichage = libellé.
const GDR_CATEGORIES: Record<string, string[]> = Object.fromEntries(
  COLLECTE_CATEGORIES.map((c) => [c.label, COLLECTE_SUBCATEGORIES[c.key] ?? []]),
);

const CATEGORY_IMAGE: Record<string, string> = Object.fromEntries(
  COLLECTE_CATEGORIES.map((c) => [c.label, c.image]),
);

const GDR_FLUX = [
  "Réemploi", "DEA", "DEEE", "Textile", "Papier / Carton",
  "Feraille / Métaux", "Bois", "Plastique", "Verre", "Tout Venant", "Déchets Ultimes",
];

const GDR_ORIENTATIONS = [
  { key: "boutique", label: "Boutique", bg: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", active: "bg-emerald-500 text-white" },
  { key: "atelier", label: "Atelier", bg: "bg-blue-500/15 text-blue-300 ring-blue-500/30", active: "bg-blue-500 text-white" },
  { key: "dons", label: "Dons", bg: "bg-violet-500/15 text-violet-300 ring-violet-500/30", active: "bg-violet-500 text-white" },
  { key: "recyclage", label: "Recyclage", bg: "bg-amber-500/15 text-amber-300 ring-amber-500/30", active: "bg-amber-500 text-white" },
  { key: "dechet", label: "Déchet", bg: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30", active: "bg-zinc-600 text-white" },
];

const GDR_ORIGINS = [
  { key: "decheterie" as const, label: "Déchèterie" },
  { key: "domicile" as const, label: "Rendez-vous" },
  { key: "apport" as const, label: "Apport" },
  { key: "tournee" as const, label: "Tournée" },
];

const GDR_CONDITIONS = ["Neuf", "Très bon état", "Bon état", "État moyen", "Mauvais état"];

const ORIENTATION_LABELS: Record<string, string> = {
  boutique: "Boutique", atelier: "Atelier", dons: "Dons", recyclage: "Recyclage", dechet: "Déchet",
};

const ORIGIN_LABELS: Record<string, string> = {
  decheterie: "Déchèterie", domicile: "Rendez-vous", apport: "Apport", tournee: "Tournée",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "produit" | "arrivage" | "depot" | "eclat";
type Tab = "saisie" | "depots" | "historique";

interface ItemForm {
  origin: string;
  commune: string;
  category: string;
  subcategory: string;
  flux: string;
  orientation: string;
  weightKg: string;
  tare: string;
  quantity: string;
  price: string;
  condition: string;
  labelInfo: string;
}

interface DepotForm {
  origin: string;
  commune: string;
  weightKg: string;
  defaultCategory: string;
  defaultFlux: string;
  defaultOrientation: string;
  note: string;
}

const blankItem = (): ItemForm => ({
  origin: "", commune: "", category: "", subcategory: "",
  flux: "Réemploi", orientation: "boutique",
  weightKg: "", tare: "", quantity: "1", price: "",
  condition: "Bon état", labelInfo: "",
});

const blankDepot = (): DepotForm => ({
  origin: "", commune: "", weightKg: "", defaultCategory: "",
  defaultFlux: "Réemploi", defaultOrientation: "boutique", note: "",
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Arrivages() {
  const [tab, setTab] = useState<Tab>("saisie");
  const [mode, setMode] = useState<Mode>("produit");

  const tabs: { key: Tab; label: string; icon: typeof PackagePlus }[] = [
    { key: "saisie", label: "Saisie", icon: PackagePlus },
    { key: "depots", label: "Dépôts", icon: Box },
    { key: "historique", label: "Historique", icon: BarChart3 },
  ];

  const modes: { key: Mode; label: string; icon: typeof PackagePlus }[] = [
    { key: "produit", label: "Ajout Produit", icon: PackagePlus },
    { key: "arrivage", label: "Ajout Arrivage", icon: Layers },
    { key: "depot", label: "Dépôt", icon: Box },
    { key: "eclat", label: "Eclat Dépôt", icon: Scissors },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">GDR Collecte</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Arrivages</h1>
        <p className="mt-1 text-sm text-zinc-500">Enregistrement des articles entrants et suivi des flux.</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--crm-surface)] p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-[var(--crm-surface-2)] text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "saisie" && (
        <>
          {/* Mode selector */}
          <div className="mb-6 flex flex-wrap gap-2">
            {modes.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  mode === key
                    ? "bg-brand-500 text-white shadow-[0_4px_14px_rgba(241,16,79,0.35)]"
                    : "bg-[var(--crm-surface)] text-zinc-400 hover:text-zinc-200 hover:bg-[var(--crm-surface-2)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {mode === "produit" && <ProduitPanel />}
          {mode === "arrivage" && <ArrivagePanel />}
          {mode === "depot" && <DepotPanel onSaved={() => setTab("depots")} />}
          {mode === "eclat" && <EclatPanel />}
        </>
      )}
      {tab === "depots" && <DepotsTab onEclat={() => { setMode("eclat"); setTab("saisie"); }} />}
      {tab === "historique" && <HistoriqueTab />}
    </div>
  );
}

// ─── Produit Panel (one by one) ───────────────────────────────────────────────

function ProduitPanel() {
  const [form, setForm] = useState<ItemForm>(blankItem());
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ reference: string; label: string } | null>(null);
  const addItem = useMutation(api.arrivages.addItem);

  // Today's standalone items
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayEnd = useMemo(() => Date.now() + 86400000, []);
  const history = useQuery(api.arrivages.listHistory, { startDate: todayStart, endDate: todayEnd });
  const todayItems = history?.standaloneItems ?? [];

  async function handleSave() {
    if (!form.origin || !form.category || !form.orientation) return;
    setSaving(true);
    try {
      const result = await addItem({
        date: Date.now(),
        origin: form.origin as "decheterie" | "domicile" | "apport" | "tournee",
        commune: form.commune || undefined,
        category: form.category,
        subcategory: form.subcategory || undefined,
        flux: form.flux || undefined,
        orientation: form.orientation,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        tare: form.tare ? parseFloat(form.tare) : undefined,
        quantity: parseInt(form.quantity) || 1,
        price: form.price ? parseFloat(form.price) : undefined,
        condition: form.condition || undefined,
        labelInfo: form.labelInfo || undefined,
      });
      setLastSaved({ reference: result.reference, label: form.labelInfo || form.category });
      // Keep origin/commune, reset product fields
      setForm((f) => ({ ...blankItem(), origin: f.origin, commune: f.commune }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {lastSaved && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-300">
            <strong>{lastSaved.label}</strong> enregistré — réf. <code className="text-emerald-200">{lastSaved.reference}</code>
          </span>
          <button type="button" onClick={() => setLastSaved(null)} className="ml-auto text-emerald-500 hover:text-emerald-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ItemFormCard
          form={form}
          setForm={setForm}
          showOrigin
          onSubmit={handleSave}
          submitting={saving}
          submitLabel="Enregistrer le produit"
          submitIcon={<Check className="h-4 w-4" />}
        />

        {/* Running list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Saisies du jour ({todayItems.length})</h3>
          {todayItems.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun article enregistré aujourd'hui.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {todayItems.map((item) => (
                <ItemRow key={item._id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Arrivage Panel (batch session) ──────────────────────────────────────────

function ArrivagePanel() {
  const [currentArrivageId, setCurrentArrivageId] = useState<Id<"arrivages"> | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionOrigin, setSessionOrigin] = useState("");
  const [sessionCommune, setSessionCommune] = useState("");
  const [form, setForm] = useState<ItemForm>(blankItem());
  const [saving, setSaving] = useState(false);

  const openArrivages = useQuery(api.arrivages.listOpenArrivages);
  const currentSession = useQuery(
    api.arrivages.getArrivageWithItems,
    currentArrivageId ? { arrivageId: currentArrivageId } : "skip",
  );

  const createArrivage = useMutation(api.arrivages.createArrivage);
  const closeArrivage = useMutation(api.arrivages.closeArrivage);
  const addItem = useMutation(api.arrivages.addItem);
  const removeItem = useMutation(api.arrivages.removeItem);

  async function startSession() {
    if (!sessionOrigin) return;
    const id = await createArrivage({
      origin: sessionOrigin as "decheterie" | "domicile" | "apport" | "tournee",
      commune: sessionCommune || undefined,
      date: Date.now(),
    });
    setCurrentArrivageId(id);
    setShowSessionForm(false);
  }

  async function addToSession() {
    if (!currentArrivageId || !form.category || !form.orientation) return;
    setSaving(true);
    try {
      await addItem({
        arrivageId: currentArrivageId,
        date: Date.now(),
        origin: (currentSession?.arrivage.origin ?? "apport") as "decheterie" | "domicile" | "apport" | "tournee",
        commune: currentSession?.arrivage.commune,
        category: form.category,
        subcategory: form.subcategory || undefined,
        flux: form.flux || undefined,
        orientation: form.orientation,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        tare: form.tare ? parseFloat(form.tare) : undefined,
        quantity: parseInt(form.quantity) || 1,
        price: form.price ? parseFloat(form.price) : undefined,
        condition: form.condition || undefined,
        labelInfo: form.labelInfo || undefined,
      });
      setForm(blankItem());
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!currentArrivageId) return;
    await closeArrivage({ arrivageId: currentArrivageId });
    setCurrentArrivageId(null);
  }

  const items = currentSession?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Session status */}
      {!currentArrivageId && !showSessionForm && (
        <div className="space-y-3">
          {/* Pending open sessions */}
          {(openArrivages ?? []).length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Sessions interrompues</p>
              {(openArrivages ?? []).map((a) => (
                <div key={a._id} className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-4 py-2.5">
                  <div>
                    <span className="text-sm font-semibold text-zinc-200">{ORIGIN_LABELS[a.origin]}</span>
                    {a.commune && <span className="text-zinc-400"> · {a.commune}</span>}
                    <span className="ml-2 text-xs text-zinc-500">
                      {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentArrivageId(a._id)}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                  >
                    Reprendre <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSessionForm(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.35)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.45)] transition"
          >
            <Plus className="h-4 w-4" />
            Nouvelle session d'arrivage
          </button>
        </div>
      )}

      {/* New session form */}
      {showSessionForm && (
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Démarrer une session</h3>
            <button type="button" onClick={() => setShowSessionForm(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Origine</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GDR_ORIGINS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSessionOrigin(o.key)}
                  className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    sessionOrigin === o.key
                      ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                      : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Commune</label>
            <input
              type="text"
              value={sessionCommune}
              onChange={(e) => setSessionCommune(e.target.value)}
              placeholder="Ex: Beauvais"
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={startSession}
            disabled={!sessionOrigin}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition hover:shadow-[0_4px_14px_rgba(241,16,79,0.3)]"
          >
            Démarrer la session <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active session */}
      {currentArrivageId && currentSession && (
        <div className="space-y-6">
          {/* Session header */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Session en cours</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-200">
                {ORIGIN_LABELS[currentSession.arrivage.origin]}
                {currentSession.arrivage.commune && ` · ${currentSession.arrivage.commune}`}
                <span className="ml-2 font-normal text-zinc-400">
                  {items.length} article{items.length > 1 ? "s" : ""}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={items.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Valider l'arrivage
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <ItemFormCard
              form={form}
              setForm={setForm}
              showOrigin={false}
              onSubmit={addToSession}
              submitting={saving}
              submitLabel="Ajouter à la session"
              submitIcon={<Plus className="h-4 w-4" />}
            />

            {/* Session items */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">Articles de la session</h3>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-500">Ajoutez des articles via le formulaire.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <ItemRow
                      key={item._id}
                      item={item}
                      onRemove={async () => removeItem({ itemId: item._id })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dépôt Panel ─────────────────────────────────────────────────────────────

function DepotPanel({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<DepotForm>(blankDepot());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const createDepot = useMutation(api.arrivages.createDepot);

  async function handleSave() {
    if (!form.origin) return;
    setSaving(true);
    try {
      await createDepot({
        origin: form.origin as "decheterie" | "domicile" | "apport" | "tournee",
        commune: form.commune || undefined,
        date: Date.now(),
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        defaultCategory: form.defaultCategory || undefined,
        defaultFlux: form.defaultFlux || undefined,
        defaultOrientation: form.defaultOrientation || undefined,
        note: form.note || undefined,
      });
      setSaved(Date.now());
      setForm(blankDepot());
      setTimeout(onSaved, 1200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      {saved && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">Dépôt enregistré — redirection vers la liste…</span>
        </div>
      )}

      <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-200">Enregistrer un dépôt scellé</h3>

        <OriginSelector value={form.origin} onChange={(v) => setForm((f) => ({ ...f, origin: v }))} />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Commune</label>
          <input
            type="text"
            value={form.commune}
            onChange={(e) => setForm((f) => ({ ...f, commune: e.target.value }))}
            placeholder="Ex: Beauvais"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Poids global (kg)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.weightKg}
            onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            placeholder="0.0"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Catégorie par défaut</label>
            <select
              value={form.defaultCategory}
              onChange={(e) => setForm((f) => ({ ...f, defaultCategory: e.target.value }))}
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">— Aucune —</option>
              {Object.keys(GDR_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Flux par défaut</label>
            <select
              value={form.defaultFlux}
              onChange={(e) => setForm((f) => ({ ...f, defaultFlux: e.target.value }))}
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {GDR_FLUX.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Orientation par défaut</label>
          <OrientationSelector value={form.defaultOrientation} onChange={(v) => setForm((f) => ({ ...f, defaultOrientation: v }))} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Note</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            rows={2}
            placeholder="Description du dépôt, observations…"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!form.origin || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)] transition"
        >
          {saving ? "Enregistrement…" : "Enregistrer le dépôt"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Eclat Panel ──────────────────────────────────────────────────────────────

function EclatPanel() {
  const [selectedDepotId, setSelectedDepotId] = useState<Id<"depots"> | null>(null);
  const [form, setForm] = useState<ItemForm>(blankItem());
  const [saving, setSaving] = useState(false);

  const pendingDepots = useQuery(api.arrivages.listPendingDepots);
  const depotData = useQuery(
    api.arrivages.getDepotWithItems,
    selectedDepotId ? { depotId: selectedDepotId } : "skip",
  );

  const addItem = useMutation(api.arrivages.addItem);
  const closeDepot = useMutation(api.arrivages.closeDepot);
  const removeItem = useMutation(api.arrivages.removeItem);

  function selectDepot(id: Id<"depots">) {
    setSelectedDepotId(id);
    // Pre-fill form with depot defaults
    const depot = (pendingDepots ?? []).find((d) => d._id === id);
    if (depot) {
      setForm((f) => ({
        ...f,
        category: depot.defaultCategory ?? "",
        flux: depot.defaultFlux ?? "Réemploi",
        orientation: depot.defaultOrientation ?? "boutique",
      }));
    }
  }

  async function handleAdd() {
    if (!selectedDepotId || !form.category || !form.orientation || !depotData) return;
    setSaving(true);
    try {
      await addItem({
        depotId: selectedDepotId,
        date: Date.now(),
        origin: depotData.depot.origin,
        commune: depotData.depot.commune,
        category: form.category,
        subcategory: form.subcategory || undefined,
        flux: form.flux || undefined,
        orientation: form.orientation,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        tare: form.tare ? parseFloat(form.tare) : undefined,
        quantity: parseInt(form.quantity) || 1,
        price: form.price ? parseFloat(form.price) : undefined,
        condition: form.condition || undefined,
        labelInfo: form.labelInfo || undefined,
      });
      setForm((f) => ({
        ...blankItem(),
        category: f.category,
        flux: f.flux,
        orientation: f.orientation,
      }));
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseDepot() {
    if (!selectedDepotId) return;
    await closeDepot({ depotId: selectedDepotId });
    setSelectedDepotId(null);
    setForm(blankItem());
  }

  const items = depotData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Depot selector */}
      {!selectedDepotId ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Choisir un dépôt à éclater</h3>
          {pendingDepots === undefined ? (
            <p className="text-sm text-zinc-500">Chargement…</p>
          ) : pendingDepots.length === 0 ? (
            <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-8 text-center">
              <Box className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">Aucun dépôt en attente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingDepots.map((depot) => (
                <button
                  key={depot._id}
                  type="button"
                  onClick={() => selectDepot(depot._id)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4 text-left transition hover:border-brand-500/40 hover:bg-[var(--crm-surface-2)]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-400">DEP-{String(depot.depotNumber).padStart(3, "0")}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        depot.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {depot.status === "pending" ? "En attente" : "Partiel"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {ORIGIN_LABELS[depot.origin]}
                      {depot.commune && ` · ${depot.commune}`}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(depot.date).toLocaleDateString("fr-FR")}
                      {depot.weightKg && ` · ${depot.weightKg} kg`}
                      {depot.defaultCategory && ` · ${depot.defaultCategory}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {depot.itemCount > 0 && (
                      <span className="text-xs text-zinc-400">{depot.itemCount} éclatés</span>
                    )}
                    <Scissors className="h-4 w-4 text-brand-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : depotData ? (
        <div className="space-y-6">
          {/* Depot info */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                DEP-{String(depotData.depot.depotNumber).padStart(3, "0")} — Eclatement en cours
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-200">
                {ORIGIN_LABELS[depotData.depot.origin]}
                {depotData.depot.commune && ` · ${depotData.depot.commune}`}
                {depotData.depot.weightKg && (
                  <span className="font-normal text-zinc-400"> · {depotData.depot.weightKg} kg</span>
                )}
              </p>
              {depotData.depot.note && <p className="mt-1 text-xs text-zinc-400">{depotData.depot.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDepotId(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[var(--crm-surface-2)] transition"
              >
                Changer
              </button>
              <button
                type="button"
                onClick={handleCloseDepot}
                disabled={items.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                Clôturer
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <ItemFormCard
              form={form}
              setForm={setForm}
              showOrigin={false}
              onSubmit={handleAdd}
              submitting={saving}
              submitLabel="Ajouter depuis le dépôt"
              submitIcon={<Plus className="h-4 w-4" />}
            />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">Articles éclatés ({items.length})</h3>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-500">Ajoutez les articles contenus dans ce dépôt.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <ItemRow
                      key={item._id}
                      item={item}
                      onRemove={async () => removeItem({ itemId: item._id })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Dépôts Tab ───────────────────────────────────────────────────────────────

function DepotsTab({ onEclat }: { onEclat: () => void }) {
  const pendingDepots = useQuery(api.arrivages.listPendingDepots);

  if (pendingDepots === undefined) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (pendingDepots.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-12 text-center">
        <Box className="mx-auto h-10 w-10 text-zinc-600 mb-4" />
        <p className="font-semibold text-zinc-300">Aucun dépôt en attente</p>
        <p className="mt-1 text-sm text-zinc-500">Créez un dépôt via l'onglet Saisie → Dépôt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Dépôts en attente ({pendingDepots.length})</h3>
      </div>
      {pendingDepots.map((depot) => (
        <div
          key={depot._id}
          className="flex items-center justify-between gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-400">DEP-{String(depot.depotNumber).padStart(3, "0")}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                depot.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"
              }`}>
                {depot.status === "pending" ? "En attente" : "Partiel"}
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              {ORIGIN_LABELS[depot.origin]}{depot.commune && ` · ${depot.commune}`}
            </p>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{new Date(depot.date).toLocaleDateString("fr-FR")}</span>
              {depot.weightKg && <span>{depot.weightKg} kg</span>}
              {depot.defaultCategory && <span>{depot.defaultCategory}</span>}
              {depot.itemCount > 0 && <span>{depot.itemCount} article{depot.itemCount > 1 ? "s" : ""} éclatés</span>}
            </div>
            {depot.note && <p className="text-xs text-zinc-400 italic">{depot.note}</p>}
          </div>
          <button
            type="button"
            onClick={onEclat}
            className="flex items-center gap-2 rounded-xl bg-brand-500/15 px-4 py-2 text-sm font-bold text-brand-400 hover:bg-brand-500/25 transition shrink-0"
          >
            <Scissors className="h-4 w-4" />
            Eclater
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Historique Tab ───────────────────────────────────────────────────────────

function HistoriqueTab() {
  const [range, setRange] = useState<"7j" | "30j" | "90j">("7j");
  const [expandedArrivage, setExpandedArrivage] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    const days = range === "7j" ? 7 : range === "30j" ? 30 : 90;
    return { startDate: now - days * 86400000, endDate: now };
  }, [range]);

  const stats = useQuery(api.arrivages.historyStats, { startDate, endDate });
  const history = useQuery(api.arrivages.listHistory, { startDate, endDate });

  const rangeButtons: { key: typeof range; label: string }[] = [
    { key: "7j", label: "7 jours" },
    { key: "30j", label: "30 jours" },
    { key: "90j", label: "90 jours" },
  ];

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        {rangeButtons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              range === key
                ? "bg-[var(--crm-surface-2)] text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Layers className="h-5 w-5" />} label="Arrivages" value={String(stats.arrivageCount)} color="text-brand-400" />
          <StatCard icon={<Package className="h-5 w-5" />} label="Articles" value={String(stats.totalArticles)} color="text-blue-400" />
          <StatCard icon={<Weight className="h-5 w-5" />} label="Poids total" value={`${stats.totalWeight} kg`} color="text-amber-400" />
          <StatCard icon={<Euro className="h-5 w-5" />} label="Valeur estimée" value={formatPrice(stats.totalValue)} color="text-emerald-400" />
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartCard title="Par catégorie" data={stats.byCategory} total={stats.totalArticles} />
          <ChartCard title="Par orientation" data={stats.byOrientation} total={stats.totalArticles} labelMap={ORIENTATION_LABELS} />
        </div>
      )}

      {/* Arrivages list */}
      {history && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">
            Sessions ({history.arrivages.length})
            {history.standaloneItems.length > 0 && (
              <span className="ml-2 font-normal text-zinc-500">+ {history.standaloneItems.length} articles isolés</span>
            )}
          </h3>
          {history.arrivages.map((arrivage) => (
            <div key={arrivage._id} className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedArrivage(expandedArrivage === arrivage._id ? null : arrivage._id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--crm-surface-2)] transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      arrivage.status === "open" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {arrivage.status === "open" ? "Ouvert" : "Clôturé"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(arrivage.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {ORIGIN_LABELS[arrivage.origin]}
                    {arrivage.commune && ` · ${arrivage.commune}`}
                    <span className="ml-2 font-normal text-zinc-400">{arrivage.items.length} article{arrivage.items.length > 1 ? "s" : ""}</span>
                  </p>
                </div>
                {expandedArrivage === arrivage._id
                  ? <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                }
              </button>
              {expandedArrivage === arrivage._id && arrivage.items.length > 0 && (
                <div className="border-t border-[var(--crm-border)] px-5 py-3 space-y-2">
                  {arrivage.items.map((item) => (
                    <ItemRow key={item._id} item={item} compact />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function OriginSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Origine</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GDR_ORIGINS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              value === o.key
                ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrientationSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GDR_ORIENTATIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ring-1 ${
            value === o.key ? o.active + " ring-transparent" : o.bg
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ItemFormCard({
  form, setForm, showOrigin, onSubmit, submitting, submitLabel, submitIcon,
}: {
  form: ItemForm;
  setForm: (fn: (f: ItemForm) => ItemForm) => void;
  showOrigin: boolean;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  submitIcon: React.ReactNode;
}) {
  const subcategories = form.category ? (GDR_CATEGORIES[form.category] ?? []) : [];
  const canSubmit = (!showOrigin || form.origin) && form.category && form.orientation && !submitting;

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-5">

      {showOrigin && (
        <OriginSelector
          value={form.origin}
          onChange={(v) => setForm((f) => ({ ...f, origin: v, commune: f.commune }))}
        />
      )}

      {showOrigin && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Commune</label>
          <input
            type="text"
            value={form.commune}
            onChange={(e) => setForm((f) => ({ ...f, commune: e.target.value }))}
            placeholder="Ex: Beauvais"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Category grid */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Catégorie *</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Object.keys(GDR_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setForm((f) => ({ ...f, category: cat, subcategory: "" }))}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                form.category === cat
                  ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                  : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <img src={CATEGORY_IMAGE[cat]} alt="" className="h-10 w-10 object-contain" />
              <span className="text-center leading-tight">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subcategory */}
      {subcategories.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Sous-catégorie</label>
          <div className="flex flex-wrap gap-1.5">
            {subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setForm((f) => ({ ...f, subcategory: f.subcategory === sub ? "" : sub }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ring-1 ${
                  form.subcategory === sub
                    ? "bg-brand-500 text-white ring-transparent"
                    : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Flux + Orientation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Flux</label>
          <select
            value={form.flux}
            onChange={(e) => setForm((f) => ({ ...f, flux: e.target.value }))}
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {GDR_FLUX.map((fl) => <option key={fl} value={fl}>{fl}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Orientation *</label>
          <OrientationSelector value={form.orientation} onChange={(v) => setForm((f) => ({ ...f, orientation: v }))} />
        </div>
      </div>

      {/* Measurements row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Poids (kg)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.weightKg}
            onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            placeholder="0.0"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Tare (kg)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.tare}
            onChange={(e) => setForm((f) => ({ ...f, tare: e.target.value }))}
            placeholder="0.0"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Quantité</label>
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Prix (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Condition + Label */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">État</label>
          <select
            value={form.condition}
            onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {GDR_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Info étiquette</label>
          <input
            type="text"
            value={form.labelInfo}
            onChange={(e) => setForm((f) => ({ ...f, labelInfo: e.target.value }))}
            placeholder="Description courte…"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)] transition"
      >
        {submitting ? "Enregistrement…" : submitLabel}
        {!submitting && submitIcon}
      </button>
    </div>
  );
}

function ItemRow({
  item,
  onRemove,
  compact = false,
}: {
  item: {
    _id: string;
    category: string;
    subcategory?: string;
    orientation: string;
    flux?: string;
    weightKg?: number;
    quantity: number;
    price?: number;
    condition?: string;
    labelInfo?: string;
    reference: string;
    articleId?: string;
  };
  onRemove?: () => void;
  compact?: boolean;
}) {
  const promoteToArticle = useMutation(api.arrivages.promoteToArticle);
  const [promoting, setPromoting] = useState(false);
  const orientation = GDR_ORIENTATIONS.find((o) => o.key === item.orientation);

  async function handlePromote() {
    setPromoting(true);
    try {
      await promoteToArticle({ itemId: item._id as Id<"arrivageItems"> });
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg bg-[var(--crm-surface-2)] px-3 py-2.5`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-200">{item.labelInfo || item.category}</span>
          {item.subcategory && <span className="text-xs text-zinc-500">{item.subcategory}</span>}
          {orientation && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ${orientation.bg}`}>
              {orientation.label}
            </span>
          )}
          {item.articleId && (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
              ✓ En boutique
            </span>
          )}
        </div>
        {!compact && (
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
            <code className="text-zinc-600">{item.reference}</code>
            {item.weightKg && <span>{item.weightKg} kg</span>}
            {item.quantity > 1 && <span>×{item.quantity}</span>}
            {item.price !== undefined && <span>{formatPrice(item.price)}</span>}
            {item.condition && <span>{item.condition}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!item.articleId && !compact && (
          <button
            type="button"
            onClick={handlePromote}
            disabled={promoting}
            title="Envoyer en boutique"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-40"
          >
            {promoting ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
            ) : (
              <Store className="h-3.5 w-3.5" />
            )}
            <span>Boutique</span>
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function ChartCard({
  title, data, total, labelMap,
}: {
  title: string;
  data: { label: string; count: number }[];
  total: number;
  labelMap?: Record<string, string>;
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-zinc-500" />
        <h4 className="text-sm font-semibold text-zinc-300">{title}</h4>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-zinc-500">Aucune donnée</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(({ label, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const displayLabel = labelMap?.[label] ?? label;
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 truncate max-w-[160px]">{displayLabel}</span>
                  <span className="text-zinc-500 ml-2 shrink-0">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--crm-surface-2)]">
                  <div
                    className="h-1.5 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
