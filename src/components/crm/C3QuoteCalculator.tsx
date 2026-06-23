import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { formatPrice } from "../../lib/format";
import { Site } from "../../lib/constants";
import {
  C3_DEPARTURE_LABELS,
  C3_RATES,
  calculateC3Quote,
  C3Departure,
  C3QuoteInputs,
  getC3CommuneSuggestions,
} from "../../lib/c3QuoteCalculator";

type C3QuoteRequest = {
  _id: Id<"requests">;
  site?: Site;
  customer: {
    firstName: string;
    lastName: string;
    city?: string;
  };
  collecte?: {
    collectAddress?: {
      city?: string;
    };
  };
};

const VALUE_FIELDS = [
  ["storageFurnitureValue", "Meuble de rangement"],
  ["tableChairsValue", "Table + 4 chaises"],
  ["cookerValue", "Cuisinière"],
  ["dishwasherWasherValue", "Lave-vaisselle / lave-linge"],
  ["fridgeValue", "Réfrigérateur"],
  ["otherValue", "Autres objets"],
] as const;

const DEFAULT_NUMBERS = {
  rotations: 1,
  vehicles: 1,
  travelAgents: 1,
  loadingAgents: 1,
  loadingHours: 0,
  storageFurnitureValue: 0,
  tableChairsValue: 0,
  cookerValue: 0,
  dishwasherWasherValue: 0,
  fridgeValue: 0,
  otherValue: 0,
  wasteVolume: 0,
} satisfies Omit<C3QuoteInputs, "departure" | "commune">;

function numberValue(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildQuoteDetails(inputs: C3QuoteInputs, result: ReturnType<typeof calculateC3Quote>): string {
  const commune = result.entry
    ? `${result.entry.commune} (${result.entry.insee})`
    : inputs.commune || "Commune non renseignée";

  return [
    "Calcul devis collecte C3",
    `Départ : ${C3_DEPARTURE_LABELS[inputs.departure]}`,
    `Commune : ${commune}`,
    `Trajet aller : ${result.entry ? `${result.entry.km.toFixed(2)} km / ${result.entry.minutes.toFixed(1)} min` : "non trouvé"}`,
    `Rotations : ${inputs.rotations}`,
    `Véhicules : ${inputs.vehicles}`,
    `Agents déplacement : ${inputs.travelAgents} (mémo, non facturé dans la formule C3)`,
    `Déplacement : ${result.totalKm.toFixed(2)} km + ${result.totalTravelHours.toFixed(2)} h = ${formatPrice(result.travelCost)} HT`,
    `Chargement/tri/déchargement : ${inputs.loadingAgents} agent(s) x ${inputs.loadingHours} h = ${formatPrice(result.loadingCost)} HT`,
    `Objets valorisables déduits : ${formatPrice(result.reusableValue)}`,
    `Déchets : ${inputs.wasteVolume} m³ x ${C3_RATES.wastePerCubicMeter} €/m³ = ${formatPrice(result.wasteCost)} HT`,
    `Total HT : ${formatPrice(result.subtotalHt)}`,
    `TVA 20 % : ${formatPrice(result.vat)}`,
    `Total TTC : ${formatPrice(result.totalTtc)}`,
  ].join("\n");
}

export function C3QuoteCalculator({ request }: { request: C3QuoteRequest }) {
  const patch = useMutation(api.requests.patchManagement);
  const initialDeparture: C3Departure = request.site === "76" ? "GEB" : "LCP";
  const initialCommune = request.collecte?.collectAddress?.city ?? request.customer.city ?? "";
  const [inputs, setInputs] = useState<C3QuoteInputs>({
    departure: initialDeparture,
    commune: initialCommune,
    ...DEFAULT_NUMBERS,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const result = useMemo(() => calculateC3Quote(inputs), [inputs]);
  const suggestions = useMemo(
    () => getC3CommuneSuggestions(inputs.departure, inputs.commune),
    [inputs.commune, inputs.departure],
  );

  const setNumber = (key: keyof typeof DEFAULT_NUMBERS, value: string) => {
    setSaved(false);
    setInputs((current) => ({ ...current, [key]: numberValue(value) }));
  };

  const setText = (key: "commune", value: string) => {
    setSaved(false);
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const setDeparture = (departure: C3Departure) => {
    setSaved(false);
    setInputs((current) => ({ ...current, departure }));
  };

  async function applyToRequest() {
    setSaving(true);
    try {
      await patch({
        id: request._id,
        quoteAmount: roundCurrency(result.totalTtc),
        quoteDetails: buildQuoteDetails(inputs, result),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Calcul devis C3
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Calcul basé sur le classeur C3 : déplacement + chargement + déchets - objets valorisables.
              Les erreurs Excel connues sont corrigées ici, notamment l'inversion GEB et la catégorie meuble LCP.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-5 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-300">Total TTC</p>
            <p className="mt-1 text-3xl font-semibold text-white">{formatPrice(result.totalTtc)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Field label="Départ">
          <Select
            value={inputs.departure}
            onChange={(event) => setDeparture(event.target.value as C3Departure)}
          >
            <option value="LCP">{C3_DEPARTURE_LABELS.LCP}</option>
            <option value="GEB">{C3_DEPARTURE_LABELS.GEB}</option>
          </Select>
        </Field>
        <Field label="Commune d'intervention">
          <div className="space-y-2">
            <Input
              value={inputs.commune}
              onChange={(event) => setText("commune", event.target.value)}
              placeholder="Ex. Lachapelle-aux-Pots"
              list="c3-communes"
            />
            <datalist id="c3-communes">
              {suggestions.map((entry) => (
                <option key={`${entry.insee}-${entry.commune}`} value={entry.commune} />
              ))}
            </datalist>
            {inputs.commune && !result.entry && (
              <p className="text-xs text-amber-300">
                Commune introuvable dans le référentiel {inputs.departure}. Vérifiez l'orthographe ou le départ.
              </p>
            )}
            {result.entry && (
              <p className="text-xs text-zinc-500">
                Trajet aller : {result.entry.km.toFixed(2)} km / {result.entry.minutes.toFixed(1)} min.
              </p>
            )}
          </div>
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Rotations" value={inputs.rotations} onChange={(value) => setNumber("rotations", value)} />
        <NumberField label="Véhicules" value={inputs.vehicles} onChange={(value) => setNumber("vehicles", value)} />
        <NumberField label="Agents déplacement" value={inputs.travelAgents} onChange={(value) => setNumber("travelAgents", value)} />
        <NumberField label="Volume déchets (m³)" value={inputs.wasteVolume} step="0.1" onChange={(value) => setNumber("wasteVolume", value)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <NumberField label="Agents chargement / tri" value={inputs.loadingAgents} onChange={(value) => setNumber("loadingAgents", value)} />
        <NumberField label="Temps main-d'oeuvre (h)" value={inputs.loadingHours} step="0.5" onChange={(value) => setNumber("loadingHours", value)} />
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Objets valorisables à déduire
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {VALUE_FIELDS.map(([key, label]) => (
            <NumberField
              key={key}
              label={`${label} (€)`}
              value={inputs[key]}
              step="0.01"
              onChange={(value) => setNumber(key, value)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Déplacement HT" value={result.travelCost} detail={`${result.totalKm.toFixed(2)} km / ${result.totalTravelHours.toFixed(2)} h`} />
        <SummaryCard label="Chargement HT" value={result.loadingCost} detail={`${result.loadingTotalHours.toFixed(2)} h agent`} />
        <SummaryCard label="Déchets HT" value={result.wasteCost} detail={`${inputs.wasteVolume} m³`} />
        <SummaryCard label="Déduction objets" value={-result.reusableValue} detail="valorisation récupérable" />
        <SummaryCard label="Total HT" value={result.subtotalHt} />
        <SummaryCard label="TVA" value={result.vat} detail="20 %" />
        <SummaryCard label="Total TTC" value={result.totalTtc} strong />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-300">Devis appliqué à la demande.</span>}
        <Button onClick={applyToRequest} disabled={!result.entry || saving}>
          {saving ? "Application..." : "Appliquer au devis"}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  strong,
}: {
  label: string;
  value: number;
  detail?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={strong ? "mt-1 text-xl font-semibold text-white" : "mt-1 text-lg font-semibold text-zinc-100"}>
        {formatPrice(value)}
      </p>
      {detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}
