import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Checkbox, Field, Input } from "../ui/Field";
import { formatPrice } from "../../lib/format";
import {
  AERO_FURNITURE,
  AERO_RATES,
  AeroQuoteInputs,
  calculateAeroQuote,
  findAeroTransportCommune,
  getAeroCommuneSuggestions,
  normalizeAeroCommune,
} from "../../lib/aeroQuoteCalculator";

type AeroQuoteRequest = {
  _id: Id<"requests">;
  customer: {
    city?: string;
  };
  aerogommage?: Array<{
    objectType?: string;
    label?: string;
    quantity?: number;
    delivery?: boolean;
    retrieval?: boolean;
  }>;
  aerogommageOptions?: {
    pickupAtHome?: boolean;
    deliveryAtHome?: boolean;
    pickupAddress?: { city?: string };
    deliveryAddress?: { city?: string };
  };
};

function numberValue(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function furnitureKeyFromLabel(label?: string): string | null {
  if (!label) return null;
  const normalized = normalizeAeroCommune(label);
  const exact = AERO_FURNITURE.find((line) => normalizeAeroCommune(line.label) === normalized);
  if (exact) return exact.key;
  if (normalized === "table") return AERO_FURNITURE.find((line) => line.label === "Table à manger")?.key ?? null;
  if (normalized === "table de chevet") return AERO_FURNITURE.find((line) => line.label === "Table chevet")?.key ?? null;
  if (normalized === "bahut" || normalized === "buffet 2 corps") {
    return AERO_FURNITURE.find((line) => line.label === "Buffet")?.key ?? null;
  }
  return null;
}

function initialInputs(request: AeroQuoteRequest): AeroQuoteInputs {
  const furniture = AERO_FURNITURE.map((line) => ({
    key: line.key,
    quantity: 0,
    appliedPrice: line.basePrice,
  }));

  for (const item of request.aerogommage ?? []) {
    const key = furnitureKeyFromLabel(item.objectType) ?? furnitureKeyFromLabel(item.label);
    if (!key) continue;
    const existing = furniture.find((line) => line.key === key);
    if (existing) existing.quantity += item.quantity ?? 1;
  }

  const legacyPickup = (request.aerogommage ?? []).some((item) => item.retrieval);
  const legacyDelivery = (request.aerogommage ?? []).some((item) => item.delivery);
  const pickupEnabled = request.aerogommageOptions?.pickupAtHome ?? legacyPickup;
  const deliveryEnabled = request.aerogommageOptions?.deliveryAtHome ?? legacyDelivery;
  const customerCity = request.customer.city ?? "";

  return {
    furniture,
    doorSurface: 0,
    shutterSurface: 0,
    disassemblyHours: 0,
    pickupEnabled,
    pickupCommune: request.aerogommageOptions?.pickupAddress?.city ?? customerCity,
    deliveryEnabled,
    deliveryCommune: request.aerogommageOptions?.deliveryAddress?.city ?? customerCity,
  };
}

function buildQuoteDetails(inputs: AeroQuoteInputs, result: ReturnType<typeof calculateAeroQuote>): string {
  const furnitureLines = inputs.furniture
    .filter((line) => line.quantity > 0)
    .map((line) => {
      const ref = AERO_FURNITURE.find((item) => item.key === line.key);
      return `- ${ref?.label ?? line.key} : ${line.quantity} x ${formatPrice(line.appliedPrice)} = ${formatPrice(line.quantity * line.appliedPrice)}`;
    });

  return [
    "Calcul devis aérogommage",
    "Tous les montants sont TTC, comme dans le fichier Excel source.",
    "",
    "Meubles :",
    ...(furnitureLines.length ? furnitureLines : ["- Aucun meuble renseigné"]),
    `Portes bois : ${inputs.doorSurface} m² x ${AERO_RATES.doorPerSquareMeter} €/m² = ${formatPrice(result.doorTotal)}`,
    `Volets bois : ${inputs.shutterSurface} m² x ${AERO_RATES.shutterPerSquareMeter} €/m² = ${formatPrice(result.shutterTotal)}`,
    `Sous-total aérogommage : ${formatPrice(result.aerogommageTotal)}`,
    `Démontage/remontage : ${inputs.disassemblyHours} h x ${AERO_RATES.disassemblyHourly} €/h = ${formatPrice(result.disassemblyTotal)}`,
    `Retrait : ${inputs.pickupEnabled ? `${result.pickupEntry?.commune ?? inputs.pickupCommune} = ${formatPrice(result.pickupTotal)}` : "Non"}`,
    `Livraison : ${inputs.deliveryEnabled ? `${result.deliveryEntry?.commune ?? inputs.deliveryCommune} = ${formatPrice(result.deliveryTotal)}` : "Non"}`,
    `Total TTC : ${formatPrice(result.totalTtc)}`,
  ].join("\n");
}

export function AeroQuoteCalculator({ request }: { request: AeroQuoteRequest }) {
  const patch = useMutation(api.requests.patchManagement);
  const [inputs, setInputs] = useState<AeroQuoteInputs>(() => initialInputs(request));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const result = useMemo(() => calculateAeroQuote(inputs), [inputs]);
  const pickupSuggestions = useMemo(
    () => getAeroCommuneSuggestions(inputs.pickupCommune),
    [inputs.pickupCommune],
  );
  const deliverySuggestions = useMemo(
    () => getAeroCommuneSuggestions(inputs.deliveryCommune),
    [inputs.deliveryCommune],
  );

  const setFurniture = (
    key: string,
    field: "quantity" | "appliedPrice",
    value: string,
  ) => {
    setSaved(false);
    setInputs((current) => ({
      ...current,
      furniture: current.furniture.map((line) =>
        line.key === key ? { ...line, [field]: numberValue(value) } : line,
      ),
    }));
  };

  const setValue = <K extends keyof AeroQuoteInputs>(key: K, value: AeroQuoteInputs[K]) => {
    setSaved(false);
    setInputs((current) => ({ ...current, [key]: value }));
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

  const pickupMissing = Boolean(
    inputs.pickupEnabled &&
      inputs.pickupCommune &&
      !findAeroTransportCommune(inputs.pickupCommune),
  );
  const deliveryMissing = Boolean(
    inputs.deliveryEnabled &&
      inputs.deliveryCommune &&
      !findAeroTransportCommune(inputs.deliveryCommune),
  );
  const cannotApply = saving || pickupMissing || deliveryMissing;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Calcul devis aérogommage
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Prix TTC selon le tableur : meubles, portes/volets, démontage, retrait et livraison.
              Les prix indicatifs sont préremplis et restent ajustables.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-5 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-300">Total TTC</p>
            <p className="mt-1 text-3xl font-semibold text-white">{formatPrice(result.totalTtc)}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Meubles
        </h3>
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-[1fr_110px_130px_130px] gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <span>Type</span>
            <span>Qté</span>
            <span>Prix appliqué</span>
            <span>Total</span>
          </div>
          {inputs.furniture.map((line) => {
            const ref = AERO_FURNITURE.find((item) => item.key === line.key);
            const lineTotal = line.quantity * line.appliedPrice;
            return (
              <div
                key={line.key}
                className="grid grid-cols-[1fr_110px_130px_130px] items-center gap-3 border-b border-zinc-800/70 px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">{ref?.label ?? line.key}</p>
                  <p className="text-xs text-zinc-500">À partir de {formatPrice(ref?.basePrice ?? 0)}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={line.quantity}
                  onChange={(event) => setFurniture(line.key, "quantity", event.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.appliedPrice}
                  onChange={(event) => setFurniture(line.key, "appliedPrice", event.target.value)}
                />
                <span className="text-sm font-semibold text-zinc-100">{formatPrice(lineTotal)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <NumberField label="Surface portes bois (m²)" value={inputs.doorSurface} step="0.1" onChange={(value) => setValue("doorSurface", numberValue(value))} />
        <NumberField label="Surface volets bois (m²)" value={inputs.shutterSurface} step="0.1" onChange={(value) => setValue("shutterSurface", numberValue(value))} />
        <NumberField label="Démontage/remontage (h)" value={inputs.disassemblyHours} step="0.5" onChange={(value) => setValue("disassemblyHours", numberValue(value))} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TransportField
          label="Retrait à domicile"
          enabled={inputs.pickupEnabled}
          commune={inputs.pickupCommune}
          datalistId="aero-pickup-communes"
          suggestions={pickupSuggestions.map((entry) => entry.commune)}
          onEnabledChange={(checked) => setValue("pickupEnabled", checked)}
          onCommuneChange={(value) => setValue("pickupCommune", value)}
          missing={!!pickupMissing}
          entry={result.pickupEntry}
        />
        <TransportField
          label="Livraison à domicile"
          enabled={inputs.deliveryEnabled}
          commune={inputs.deliveryCommune}
          datalistId="aero-delivery-communes"
          suggestions={deliverySuggestions.map((entry) => entry.commune)}
          onEnabledChange={(checked) => setValue("deliveryEnabled", checked)}
          onCommuneChange={(value) => setValue("deliveryCommune", value)}
          missing={!!deliveryMissing}
          entry={result.deliveryEntry}
        />
      </section>

      <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Meubles" value={result.furnitureTotal} detail={`${result.furnitureQuantity} objet(s)`} />
        <SummaryCard label="Portes" value={result.doorTotal} detail={`${inputs.doorSurface} m²`} />
        <SummaryCard label="Volets" value={result.shutterTotal} detail={`${inputs.shutterSurface} m²`} />
        <SummaryCard label="Démontage" value={result.disassemblyTotal} detail={`${inputs.disassemblyHours} h`} />
        <SummaryCard label="Retrait" value={result.pickupTotal} detail={result.pickupEntry?.commune ?? "Non"} />
        <SummaryCard label="Livraison" value={result.deliveryTotal} detail={result.deliveryEntry?.commune ?? "Non"} />
        <SummaryCard label="Total TTC" value={result.totalTtc} strong />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-300">Devis appliqué à la demande.</span>}
        <Button onClick={applyToRequest} disabled={cannotApply}>
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
  step,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  step: string;
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

function TransportField({
  label,
  enabled,
  commune,
  datalistId,
  suggestions,
  onEnabledChange,
  onCommuneChange,
  missing,
  entry,
}: {
  label: string;
  enabled: boolean;
  commune: string;
  datalistId: string;
  suggestions: string[];
  onEnabledChange: (checked: boolean) => void;
  onCommuneChange: (value: string) => void;
  missing: boolean;
  entry: { km: number; minutes: number; amount: number } | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
      <Checkbox
        label={label}
        checked={enabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
        className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
      />
      {enabled && (
        <div className="mt-4 space-y-2">
          <Field label="Commune">
            <Input
              value={commune}
              onChange={(event) => onCommuneChange(event.target.value)}
              list={datalistId}
            />
          </Field>
          <datalist id={datalistId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          {missing && (
            <p className="text-xs text-amber-300">
              Commune introuvable dans le référentiel transport aérogommage.
            </p>
          )}
          {entry && (
            <p className="text-xs text-zinc-500">
              {entry.km.toFixed(1)} km / {entry.minutes.toFixed(0)} min · forfait {formatPrice(entry.amount)}
            </p>
          )}
        </div>
      )}
    </div>
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
