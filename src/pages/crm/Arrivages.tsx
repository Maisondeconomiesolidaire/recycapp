import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { createPortal } from "react-dom";
import { ArrowLeft, BarChart3, Check, PackageCheck, Plus, Printer, Trash2, Weight, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Barcode } from "../../components/ui/Barcode";
import { WeightField } from "../../components/crm/WeightField";
import { COLLECTE_CATEGORIES, COLLECTE_SUBCATEGORIES } from "../../lib/constants";

// ─── Référentiels ───────────────────────────────────────────────────────────

const ORIGINS = [
  { key: "decheterie", label: "Déchèterie" },
  { key: "domicile", label: "Rendez-vous" },
  { key: "apport", label: "Apport volontaire" },
  { key: "tournee", label: "Tournée" },
] as const;

const ORIENTATIONS = [
  { key: "boutique", label: "Boutique", active: "bg-emerald-500 text-white", bg: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  { key: "atelier", label: "Atelier", active: "bg-blue-500 text-white", bg: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
  { key: "dons", label: "Dons", active: "bg-violet-500 text-white", bg: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  { key: "recyclage", label: "Recyclage", active: "bg-amber-500 text-white", bg: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  { key: "dechet", label: "Déchet", active: "bg-zinc-600 text-white", bg: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30" },
] as const;

const CATEGORIES = COLLECTE_CATEGORIES.map((c) => ({
  key: c.label,
  image: c.image,
  subs: COLLECTE_SUBCATEGORIES[c.key] ?? [],
}));

const ORIGIN_LABELS: Record<string, string> = {
  decheterie: "Déchèterie", domicile: "Rendez-vous", apport: "Apport volontaire", tournee: "Tournée",
};
const ORIENTATION_LABELS: Record<string, string> = {
  boutique: "Boutique", atelier: "Atelier", dons: "Dons", recyclage: "Recyclage", dechet: "Déchet",
};

type Ticket = {
  itemId?: Id<"arrivageItems">;
  reference: string;
  designation: string;
  origin: string;
  orientation: string;
  weightKg: string;
  quantity: number;
};

type StatEntry = {
  label: string;
  count: number;
};

type ArrivalStep = 1 | 2 | 3 | 4 | 5;
type SlideDirection = "forward" | "back";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Arrivages() {
  const addItem = useMutation(api.arrivages.addItem);
  const removeItem = useMutation(api.arrivages.removeItem);
  const history = useQuery(api.arrivages.listRecentArrivals);
  const { start, end } = useMemo(() => {
    const now = Date.now();
    return { start: now - 365 * 86400000, end: now };
  }, []);
  const stats = useQuery(api.arrivages.historyStats, { startDate: start, endDate: end });

  const [tab, setTab] = useState<"new" | "history">("new");
  const [arrivalMode, setArrivalMode] = useState<"unique" | "roll">("unique");
  const [origin, setOrigin] = useState("");
  const [orientation, setOrientation] = useState("boutique");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [designation, setDesignation] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [rollOrigin, setRollOrigin] = useState("");
  const [rollCategory, setRollCategory] = useState("");
  const [rollOrientation, setRollOrientation] = useState("recyclage");
  const [rollWeightKg, setRollWeightKg] = useState("");
  const [rollNote, setRollNote] = useState("");

  const [pending, setPending] = useState<Ticket[]>([]);
  const [printTickets, setPrintTickets] = useState<Ticket[] | null>(null);

  const canSubmit = Boolean(origin && orientation && category) && !saving;
  const canSubmitRoll = Boolean(rollOrigin && rollCategory && rollOrientation && parseFloat(rollWeightKg) > 0) && !saving;

  async function addObject() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { itemId, reference } = await addItem({
        date: Date.now(),
        origin: origin as "decheterie" | "domicile" | "apport" | "tournee",
        orientation,
        category,
        subcategory: subcategory || undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        quantity: parseInt(quantity) || 1,
        labelInfo: designation || undefined,
      });
      const t: Ticket = {
        itemId,
        reference,
        designation: designation || (subcategory ? `${category} – ${subcategory}` : category),
        origin,
        orientation,
        weightKg,
        quantity: parseInt(quantity) || 1,
      };
      setPending((p) => [t, ...p]);
      // On garde provenance + destination pour enchaîner les saisies.
      setCategory("");
      setSubcategory("");
      setDesignation("");
      setWeightKg("");
      setQuantity("1");
    } finally {
      setSaving(false);
    }
  }

  async function addRoll() {
    if (!canSubmitRoll) return;
    setSaving(true);
    try {
      const categoryLabel = CATEGORIES.find((c) => c.key === rollCategory)?.key ?? rollCategory;
      const { itemId, reference } = await addItem({
        date: Date.now(),
        origin: rollOrigin as "decheterie" | "domicile" | "apport" | "tournee",
        orientation: rollOrientation,
        category: rollCategory,
        flux: "roll",
        weightKg: parseFloat(rollWeightKg),
        quantity: 1,
        labelInfo: rollNote.trim() ? `Roll ${categoryLabel} - ${rollNote.trim()}` : `Roll ${categoryLabel}`,
      });
      setPending((p) => [
        {
          itemId,
          reference,
          designation: rollNote.trim() ? `Roll ${categoryLabel} - ${rollNote.trim()}` : `Roll ${categoryLabel}`,
          origin: rollOrigin,
          orientation: rollOrientation,
          weightKg: rollWeightKg,
          quantity: 1,
        },
        ...p,
      ]);
      setRollCategory("");
      setRollWeightKg("");
      setRollNote("");
    } finally {
      setSaving(false);
    }
  }

  async function removePending(t: Ticket) {
    if (t.itemId) await removeItem({ itemId: t.itemId });
    setPending((p) => p.filter((x) => x.reference !== t.reference));
  }

  function validate() {
    if (pending.length === 0) return;
    setPrintTickets([...pending]);
    setPending([]);
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Collecte</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Arrivages</h1>
        <p className="mt-1 text-sm text-zinc-500">Ajoutez les objets entrants, puis validez l'arrivage pour imprimer les tickets code-barres.</p>
      </div>

      <div className="mb-6 flex w-fit rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-1">
        <TabButton active={tab === "new"} onClick={() => setTab("new")}>
          Nouvelle arrivée
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          Dernières arrivées
        </TabButton>
      </div>

      <StatsOverview
        totalArticles={stats?.totalArticles}
        totalWeight={stats?.totalWeight}
        totalValue={stats?.totalValue}
        byOrigin={stats?.byOrigin}
        byOrientation={stats?.byOrientation}
      />

      {tab === "new" ? (
        <div className="mb-4 flex w-fit rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-1">
          <TabButton active={arrivalMode === "unique"} onClick={() => setArrivalMode("unique")}>
            Arrivage unique
          </TabButton>
          <TabButton active={arrivalMode === "roll"} onClick={() => setArrivalMode("roll")}>
            Nouveau roll
          </TabButton>
        </div>
      ) : null}

      {tab === "new" ? (
        <div className={`grid gap-6 ${pending.length > 0 ? "lg:grid-cols-[1fr_340px]" : "lg:grid-cols-1"}`}>
          {/* Formulaire */}
          {arrivalMode === "unique" ? (
            <ArrivalWizard
              origin={origin}
              setOrigin={setOrigin}
              category={category}
              setCategory={setCategory}
              subcategory={subcategory}
              setSubcategory={setSubcategory}
              orientation={orientation}
              setOrientation={setOrientation}
              designation={designation}
              setDesignation={setDesignation}
              weightKg={weightKg}
              setWeightKg={setWeightKg}
              quantity={quantity}
              setQuantity={setQuantity}
              saving={saving}
              canSubmit={canSubmit}
              onAddObject={addObject}
            />
          ) : (
            <RollArrivalForm
              origin={rollOrigin}
              setOrigin={setRollOrigin}
              category={rollCategory}
              setCategory={setRollCategory}
              orientation={rollOrientation}
              setOrientation={setRollOrientation}
              weightKg={rollWeightKg}
              setWeightKg={setRollWeightKg}
              note={rollNote}
              setNote={setRollNote}
              saving={saving}
              canSubmit={canSubmitRoll}
              onSubmit={addRoll}
            />
          )}

          {pending.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Objets de cette arrivée ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map((t) => (
                  <div
                    key={t.reference}
                    className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{t.designation}</p>
                      <p className="font-mono text-xs text-zinc-500">{t.reference}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(t)}
                      title="Retirer"
                      className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={validate}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25"
              >
                <Check className="h-4 w-4" />
                Valider l'arrivage ({pending.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-2">
            <DistributionPanel
              title="Provenances"
              entries={stats?.byOrigin}
              labels={ORIGIN_LABELS}
              accent="bg-brand-500"
            />
            <DistributionPanel
              title="Destinations"
              entries={stats?.byOrientation}
              labels={ORIENTATION_LABELS}
              accent="bg-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Dernières arrivées</h3>
          {!history || history.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucune arrivée enregistrée pour le moment.</p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {history.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">
                      {r.name}
                      {r.exited && <span className="ml-2 text-[10px] font-semibold uppercase text-rose-400">Sorti</span>}
                    </p>
                    <p className="font-mono text-xs text-zinc-500">{r.reference}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrintTickets([
                        {
                          itemId: r._id,
                          reference: r.reference,
                          designation: r.name,
                          origin: r.origin,
                          orientation: r.orientation,
                          weightKg: r.weightKg != null ? String(r.weightKg) : "",
                          quantity: r.quantity,
                        },
                      ])
                    }
                    title="Réimprimer le ticket"
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-[var(--crm-surface)] hover:text-zinc-100"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {printTickets && <ArrivalTickets tickets={printTickets} onClose={() => setPrintTickets(null)} />}
    </div>
  );
}

// ─── Petits composants ──────────────────────────────────────────────────────

function ArrivalWizard({
  origin,
  setOrigin,
  category,
  setCategory,
  subcategory,
  setSubcategory,
  orientation,
  setOrientation,
  designation,
  setDesignation,
  weightKg,
  setWeightKg,
  quantity,
  setQuantity,
  saving,
  canSubmit,
  onAddObject,
}: {
  origin: string;
  setOrigin: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  subcategory: string;
  setSubcategory: (value: string) => void;
  orientation: string;
  setOrientation: (value: string) => void;
  designation: string;
  setDesignation: (value: string) => void;
  weightKg: string;
  setWeightKg: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  saving: boolean;
  canSubmit: boolean;
  onAddObject: () => Promise<void> | void;
}) {
  const [step, setStep] = useState<ArrivalStep>(origin ? 2 : 1);
  const [direction, setDirection] = useState<SlideDirection>("forward");
  const selectedCategory = CATEGORIES.find((c) => c.key === category);
  const subs = selectedCategory?.subs ?? [];
  const visibleSteps: ArrivalStep[] = subs.length > 0 ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
  const stepIndex = visibleSteps.includes(step) ? visibleSteps.indexOf(step) : 0;
  const stepCount = visibleSteps.length;
  const progress = ((stepIndex + 1) / stepCount) * 100;

  function goToStep(nextStep: ArrivalStep, nextDirection: SlideDirection) {
    setDirection(nextDirection);
    setStep(nextStep);
  }

  function chooseOrigin(value: string) {
    setOrigin(value);
    goToStep(2, "forward");
  }

  function chooseCategory(value: string) {
    const nextCategory = CATEGORIES.find((c) => c.key === value);
    setCategory(value);
    setSubcategory("");
    goToStep(nextCategory && nextCategory.subs.length > 0 ? 3 : 4, "forward");
  }

  function chooseSubcategory(value: string) {
    setSubcategory(value);
    goToStep(4, "forward");
  }

  function chooseOrientation(value: string) {
    setOrientation(value);
    goToStep(5, "forward");
  }

  function goBack() {
    if (step === 5) return goToStep(4, "back");
    if (step === 4) return goToStep(subs.length > 0 ? 3 : 2, "back");
    if (step === 3) return goToStep(2, "back");
    if (step === 2) return goToStep(1, "back");
  }

  async function submitObject() {
    if (!canSubmit) return;
    await onAddObject();
    goToStep(origin ? 2 : 1, "forward");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <style>{`
        @keyframes arrivalSlideForward {
          from { opacity: 0; transform: translateX(-34px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes arrivalSlideBack {
          from { opacity: 0; transform: translateX(34px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="border-b border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface-2)_70%,transparent)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              Nouvelle arrivée
            </p>
            <h2 className="mt-1 text-xl font-bold text-zinc-100">
              {stepTitle(step)}
            </h2>
          </div>
          <span className="rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-1 text-xs font-semibold text-zinc-400">
            {stepIndex + 1}/{stepCount}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--crm-surface)]">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        key={step}
        className="min-h-[430px] p-5"
        style={{
          animation: `${direction === "forward" ? "arrivalSlideForward" : "arrivalSlideBack"} 240ms cubic-bezier(.2,.8,.2,1) both`,
        }}
      >
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-brand-500/40 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        )}

        {step === 1 && (
          <WizardStepIntro
            eyebrow="Étape 1"
            title="D'où vient l'objet ?"
            helper="Choisissez la provenance. Le formulaire avance automatiquement."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {ORIGINS.map((o) => (
                <WizardOption
                  key={o.key}
                  selected={origin === o.key}
                  title={o.label}
                  helper={originHint(o.key)}
                  onClick={() => chooseOrigin(o.key)}
                />
              ))}
            </div>
          </WizardStepIntro>
        )}

        {step === 2 && (
          <WizardStepIntro
            eyebrow="Étape 2"
            title="Quelle catégorie ?"
            helper="Cliquez sur la famille d'objet à enregistrer."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => chooseCategory(c.key)}
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

        {step === 3 && (
          <WizardStepIntro
            eyebrow="Étape 3"
            title="Précisez le type"
            helper="Sélectionnez une sous-catégorie ou passez si ce n'est pas utile."
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {subs.map((s) => (
                <WizardOption
                  key={s}
                  selected={subcategory === s}
                  title={s}
                  onClick={() => chooseSubcategory(s)}
                />
              ))}
              <WizardOption
                selected={subcategory === ""}
                title="Pas de précision"
                helper="Continuer sans sous-catégorie"
                onClick={() => chooseSubcategory("")}
              />
            </div>
          </WizardStepIntro>
        )}

        {step === 4 && (
          <WizardStepIntro
            eyebrow={subs.length > 0 ? "Étape 4" : "Étape 3"}
            title="Quelle destination ?"
            helper="Choisissez où l'objet doit aller après son arrivée."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ORIENTATIONS.map((o) => (
                <WizardOption
                  key={o.key}
                  selected={orientation === o.key}
                  title={o.label}
                  helper={orientationHint(o.key)}
                  onClick={() => chooseOrientation(o.key)}
                />
              ))}
            </div>
          </WizardStepIntro>
        )}

        {step === 5 && (
          <WizardStepIntro
            eyebrow={subs.length > 0 ? "Étape 5" : "Étape 4"}
            title="Derniers détails"
            helper="Ajoutez les infos utiles, puis enregistrez l'objet."
          >
            <div className="mb-5 flex flex-wrap gap-2">
              <SummaryPill label="Provenance" value={ORIGIN_LABELS[origin] ?? origin} />
              <SummaryPill label="Catégorie" value={subcategory || category} />
              <SummaryPill label="Destination" value={ORIENTATION_LABELS[orientation] ?? orientation} />
            </div>

            <WeightField value={weightKg} onChange={setWeightKg} autoFocus />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Désignation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Description courte (optionnel)"
                  className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Quantité</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitObject}
              disabled={!canSubmit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white shadow-[0_12px_32px_rgba(241,16,79,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(241,16,79,0.32)] disabled:translate-y-0 disabled:opacity-40"
            >
              {saving ? "Ajout…" : <><Plus className="h-4 w-4" /> Ajouter à l'arrivée</>}
            </button>
          </WizardStepIntro>
        )}
      </div>
    </div>
  );
}

function RollArrivalForm({
  origin,
  setOrigin,
  category,
  setCategory,
  orientation,
  setOrientation,
  weightKg,
  setWeightKg,
  note,
  setNote,
  saving,
  canSubmit,
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
  note: string;
  setNote: (value: string) => void;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => Promise<void> | void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.14)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Arrivage roll</p>
      <h2 className="mt-2 text-2xl font-bold text-zinc-100">Flux reçu en volume</h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Pour les rolls, renseignez surtout le type de flux et le poids reçu. Aucun détail article ni sous-catégorie n'est demandé.
      </p>

      <div className="mt-6 space-y-6">
        <WeightField label="Poids reçu" value={weightKg} onChange={setWeightKg} placeholder="50" autoFocus />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Provenance</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ORIGINS.map((o) => (
              <WizardOption key={o.key} selected={origin === o.key} title={o.label} onClick={() => setOrigin(o.key)} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Flux reçu</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${
                  category === c.key
                    ? "border-brand-500/60 bg-brand-500/15 text-brand-300 shadow-[0_14px_32px_rgba(241,16,79,0.16)]"
                    : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/35 hover:text-zinc-100"
                }`}
              >
                <img src={c.image} alt="" className="h-12 w-12 object-contain" />
                <span className="text-xs font-bold leading-tight">{c.key}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Destination</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {ORIENTATIONS.map((o) => (
              <WizardOption key={o.key} selected={orientation === o.key} title={o.label} onClick={() => setOrientation(o.key)} />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex : roll livres scolaires, papier blanc, textile mélangé..."
            className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-sm font-bold text-white shadow-[0_12px_32px_rgba(241,16,79,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
        >
          {saving ? "Ajout..." : <><Plus className="h-4 w-4" /> Ajouter le roll</>}
        </button>
      </div>
    </div>
  );
}

function WizardStepIntro({
  eyebrow,
  title,
  helper,
  children,
}: {
  eyebrow: string;
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-bold text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-zinc-500">{helper}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function WizardOption({
  selected,
  title,
  helper,
  onClick,
}: {
  selected: boolean;
  title: string;
  helper?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-brand-500/60 bg-brand-500/15 text-brand-300 shadow-[0_14px_32px_rgba(241,16,79,0.16)]"
          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/35 hover:text-zinc-100"
      }`}
    >
      <span className="block text-base font-bold">{title}</span>
      {helper && <span className="mt-1 block text-xs leading-5 text-zinc-500">{helper}</span>}
    </button>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-1.5 text-xs text-zinc-400">
      {label} : <span className="font-semibold text-zinc-200">{value || "—"}</span>
    </span>
  );
}

function stepTitle(step: ArrivalStep) {
  if (step === 1) return "Provenance";
  if (step === 2) return "Catégorie";
  if (step === 3) return "Sous-catégorie";
  if (step === 4) return "Destination";
  return "Détails";
}

function originHint(key: string) {
  if (key === "decheterie") return "Objet récupéré en déchèterie.";
  if (key === "domicile") return "Objet collecté chez un client.";
  if (key === "apport") return "Objet déposé directement.";
  return "Objet issu d'une tournée.";
}

function orientationHint(key: string) {
  if (key === "boutique") return "Mise en vente après contrôle.";
  if (key === "atelier") return "Réparation, nettoyage ou valorisation.";
  if (key === "dons") return "À orienter vers le don.";
  if (key === "recyclage") return "Filière de recyclage.";
  return "Déchet ou évacuation.";
}

function StatsOverview({
  totalArticles,
  totalWeight,
  totalValue,
  byOrigin,
  byOrientation,
}: {
  totalArticles?: number;
  totalWeight?: number;
  totalValue?: number;
  byOrigin?: StatEntry[];
  byOrientation?: StatEntry[];
}) {
  const topOrigin = topEntryLabel(byOrigin, ORIGIN_LABELS);
  const topOrientation = topEntryLabel(byOrientation, ORIENTATION_LABELS);

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<PackageCheck className="h-5 w-5" />}
        label="Objets arrivés"
        value={totalArticles != null ? String(totalArticles) : "…"}
        detail="Sur les 12 derniers mois"
      />
      <MetricCard
        icon={<Weight className="h-5 w-5" />}
        label="Poids entrant"
        value={totalWeight != null ? `${totalWeight} kg` : "…"}
        detail="Poids cumulé"
      />
      <MetricCard
        icon={<BarChart3 className="h-5 w-5" />}
        label="Provenance principale"
        value={topOrigin}
        detail="Volume le plus fréquent"
      />
      <MetricCard
        icon={<Check className="h-5 w-5" />}
        label="Destination principale"
        value={topOrientation}
        detail={totalValue != null ? `Valeur estimée ${totalValue.toLocaleString("fr-FR")} €` : "Orientation dominante"}
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-surface-2)] text-black dark:text-white">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="truncate text-lg font-bold text-zinc-100">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{detail}</p>
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
                  <span className="font-medium text-zinc-300">{labels[entry.label] ?? entry.label}</span>
                  <span className="text-zinc-500">{entry.count} · {percent}%</span>
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand-500 text-white shadow-[0_8px_24px_rgba(241,16,79,0.24)]"
          : "text-zinc-500 hover:bg-[var(--crm-surface-2)] hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tickets code-barres (impression Brother 62 × 29 mm) ──────────────────────

function ArrivalTickets({ tickets, onClose }: { tickets: Ticket[]; onClose: () => void }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "arrival-ticket-css";
    style.textContent = `
      @media print {
        body > *:not(#arrival-ticket-root) { display: none !important; }
        #arrival-ticket-root .print-hidden { display: none !important; }
        #arrival-ticket-root .ticket-print { display: block !important; }
        #arrival-ticket-root .ticket-page { break-after: page; }
        @page { size: 62mm 29mm; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("arrival-ticket-css")?.remove();
  }, []);

  const content = (
    <div id="arrival-ticket-root" className="fixed inset-0 z-[200] flex flex-col bg-[color:var(--crm-bg)]">
      {/* Barre d'outils */}
      <div className="print-hidden flex items-center justify-between border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-3">
        <h2 className="text-sm font-bold text-zinc-100">
          {tickets.length > 1 ? `${tickets.length} tickets d'arrivage` : "Ticket d'arrivage"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Aperçu écran */}
      <div className="print-hidden flex flex-1 flex-wrap content-start items-start justify-center gap-4 overflow-auto p-6">
        {tickets.map((t) => (
          <TicketBody key={t.reference} ticket={t} />
        ))}
      </div>

      {/* Version imprimée */}
      <div className="ticket-print hidden">
        {tickets.map((t) => (
          <div key={t.reference} className="ticket-page">
            <TicketBody ticket={t} />
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function TicketBody({ ticket }: { ticket: Ticket }) {
  const meta = [
    `${ORIGIN_LABELS[ticket.origin] ?? ticket.origin} → ${ORIENTATION_LABELS[ticket.orientation] ?? ticket.orientation}`,
    ticket.weightKg ? `${ticket.weightKg} kg` : null,
    ticket.quantity > 1 ? `×${ticket.quantity}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="bg-white text-black"
      style={{ width: "62mm", padding: "2mm 3mm", boxSizing: "border-box" }}
    >
      <div className="flex justify-center">
        <Barcode value={ticket.reference} height={32} width={1.4} className="max-w-full text-black" />
      </div>
      <p className="text-center font-mono text-[9pt] font-semibold leading-tight text-black">{ticket.reference}</p>
      <p className="mt-1 truncate text-center text-[8pt] font-bold leading-tight text-black">{ticket.designation}</p>
      <p className="truncate text-center text-[6.5pt] leading-tight text-zinc-600">{meta}</p>
    </div>
  );
}
